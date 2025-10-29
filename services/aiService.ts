// aiService.ts
import { HF_API_KEY, HF_MODEL } from "../env";
const MODEL = HF_MODEL || "gpt2";

// Use the new HF Router (Inference Providers) base URL
const HF_ROUTER_BASE = "https://router.huggingface.co/hf-inference";

async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal as any });
  } finally {
    clearTimeout(id);
  }
}

export async function callChatAPI(message: string): Promise<string> {
  if (!HF_API_KEY) throw new Error("HF_API_KEY missing (env.ts)");

  // New router-based URL
  const url = `${HF_ROUTER_BASE}/models/${MODEL}`;
  const body = { inputs: message, parameters: { max_new_tokens: 512 }, options: { wait_for_model: true } };

  const resp = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${HF_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    60000
  );

  if (resp.status === 404) {
    const txt = await resp.text().catch(() => "");
    // give a helpful hint that the old endpoint was removed
    throw new Error(`Model not found (404). Model="${MODEL}". Body=${txt} — ensure you're using the HF Router endpoint (router.huggingface.co/hf-inference).`);
  }
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`HF error ${resp.status}: ${txt}`);
  }

  const json = await resp.json();
  let text = "";
  if (Array.isArray(json)) {
    text = json[0]?.generated_text ?? (typeof json[0] === "string" ? json[0] : JSON.stringify(json[0]));
  } else if (json && typeof json === "object") {
    text = (json as any).generated_text ?? (json as any).text ?? JSON.stringify(json);
  } else text = String(json);

  return String(text).trim();
}
