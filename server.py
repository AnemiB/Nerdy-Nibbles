# server.py
import os
import sys
import logging
from typing import Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import torch

# Transformers imports (may raise if not installed)
from transformers import AutoTokenizer, AutoModelForCausalLM

# --- Config / env ---
MODEL_ID = os.environ.get("MODEL_ID", "ibm-granite/granite-4.0-h-small")
HF_TOKEN = os.environ.get("HF_API_KEY")  # optional; required if model is gated
SERVER_API_KEY = os.environ.get("SERVER_API_KEY")  # optional simple auth for the endpoint

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("granite-server")

app = FastAPI(title="Granite Generation API")

# Request / response models
class GenerateRequest(BaseModel):
    prompt: str
    max_new_tokens: Optional[int] = 256
    temperature: Optional[float] = 0.0
    do_sample: Optional[bool] = False

class GenerateResponse(BaseModel):
    text: str

# Utility: move tokenizer outputs to device properly
def to_device(tensors: Dict[str, torch.Tensor], device: torch.device) -> Dict[str, torch.Tensor]:
    return {k: v.to(device) for k, v in tensors.items()}

# Determine device
device_str = "cuda" if torch.cuda.is_available() else "cpu"
device = torch.device(device_str)
log.info(f"Using device: {device_str}")
log.info(f"Model id: {MODEL_ID}")

# Prepare token kwargs (auth) and trust_remote_code for custom models like Granite
token_kwargs: Dict[str, Any] = {}
if HF_TOKEN:
    token_kwargs["use_auth_token"] = HF_TOKEN
# trust_remote_code allows custom tokenizer/model code on HF (Granite often needs this)
trust_remote_code = True

# Try to detect bitsandbytes for 8-bit loading
use_8bit = False
try:
    import bitsandbytes  # type: ignore
    use_8bit = True
    log.info("bitsandbytes available, will try 8-bit model loading when using CUDA.")
except Exception:
    log.info("bitsandbytes not available, will not use 8-bit loading.")

# Load tokenizer & model
tokenizer = None
model = None

try:
    log.info("Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, **token_kwargs, trust_remote_code=trust_remote_code)

    # Model loading strategy
    if device.type == "cuda":
        # Prefer 8-bit if available (lowest VRAM footprint)
        if use_8bit:
            log.info("Attempting to load model in 8-bit (load_in_8bit=True).")
            model = AutoModelForCausalLM.from_pretrained(
                MODEL_ID,
                load_in_8bit=True,
                device_map="auto",
                torch_dtype=torch.float16,
                trust_remote_code=trust_remote_code,
                **token_kwargs,
            )
        else:
            # Try fp16 + automatic device map
            log.info("bitsandbytes not present, loading model with device_map='auto' and fp16 (if supported).")
            model = AutoModelForCausalLM.from_pretrained(
                MODEL_ID,
                device_map="auto",
                torch_dtype=torch.float16,
                trust_remote_code=trust_remote_code,
                **token_kwargs,
            )
    else:
        # CPU fallback (may be extremely slow or OOM for big models)
        log.warning("CUDA not available,loading model on CPU. This will be slow and may OOM for large models.")
        model = AutoModelForCausalLM.from_pretrained(MODEL_ID, trust_remote_code=trust_remote_code, **token_kwargs)

    model.eval()
    log.info("Model loaded successfully.")
except Exception as e:
    log.exception("Failed to load model. See error details below.")
    # Provide an informative error for the user/admin
    raise RuntimeError(
        f"Failed to load the model '{MODEL_ID}'. "
        "If the model is gated, set HF_API_KEY in environment and ensure token has 'read' scope. "
        "If you are on Windows and bitsandbytes failed to install, consider using WSL2. "
        f"Original error: {e}"
    ) from e

# Simple API key protection (optional)
async def verify_api_key(request: Request):
    if SERVER_API_KEY:
        header_val = request.headers.get("x-api-key")
        if not header_val or header_val != SERVER_API_KEY:
            raise HTTPException(status_code=401, detail="Invalid or missing x-api-key header")

@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest, request: Request):
    # Optional API key check
    await verify_api_key(request)

    prompt = req.prompt
    if not prompt or not prompt.strip():
        raise HTTPException(status_code=400, detail="prompt is required")

    try:
        # If tokenizer provides a chat template helper (Granite-like tokenizers), use it
        if hasattr(tokenizer, "apply_chat_template"):
            chat = [{"role": "user", "content": prompt}]
            chat_text = tokenizer.apply_chat_template(chat, tokenize=False, add_generation_prompt=True)
            inputs = tokenizer(chat_text, return_tensors="pt")
        else:
            inputs = tokenizer(prompt, return_tensors="pt")
    except Exception as e:
        log.warning("Tokenization chat-template path failed, falling back to direct tokenization: %s", e)
        inputs = tokenizer(prompt, return_tensors="pt")

    # Move tensors to device correctly
    try:
        inputs = to_device(inputs, device)
    except Exception as e:
        # If moving tensors fails, log and attempt to continue (rare)
        log.exception("Failed to move inputs to device: %s", e)
        raise HTTPException(status_code=500, detail="Failed to prepare inputs on device")

    gen_kwargs = dict(
        max_new_tokens=int(req.max_new_tokens or 256),
        do_sample=bool(req.do_sample),
        temperature=float(req.temperature or 0.0),
        eos_token_id=tokenizer.eos_token_id if hasattr(tokenizer, "eos_token_id") else None,
    )
    # Remove None entries
    gen_kwargs = {k: v for k, v in gen_kwargs.items() if v is not None}

    log.info("Generating,prompt length tokens: %d, params: %s", inputs.get("input_ids").shape[1], {k: gen_kwargs[k] for k in ["max_new_tokens","do_sample","temperature"] if k in gen_kwargs})

    try:
        with torch.no_grad():
            output_ids = model.generate(**inputs, **gen_kwargs)
    except Exception as e:
        log.exception("Generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Model generation failed: {e}")

    try:
        decoded = tokenizer.batch_decode(output_ids, skip_special_tokens=True)
        text = decoded[0] if isinstance(decoded, (list, tuple)) else str(decoded)
    except Exception as e:
        log.exception("Decoding failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to decode model output")

    # Trim result and return
    text = text.strip()
    return GenerateResponse(text=text)

# Run the app with uvicorn if executed directly
if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8000))
    log.info(f"Starting uvicorn on {host}:{port},press CTRL+C to quit")
    uvicorn.run("server:app", host=host, port=port, log_level="info")
