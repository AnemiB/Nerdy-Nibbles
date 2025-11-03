import { GoogleGenAI } from "@google/genai";
import { GOOGLE_API_KEY, GEMINI_MODEL } from "../env";

const MODEL = GEMINI_MODEL || "gemini-2.5-flash";

async function withTimeout<T>(p: Promise<T>, timeoutMs = 60000): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Gemini request timed out after ${timeoutMs}ms`)), timeoutMs)),
  ]);
}

const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY || undefined });

export async function callChatAPI(message: string, timeoutMs = 60000): Promise<string> {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY missing (env.ts)");
  }
  try {
    const promise = ai.models.generateContent({
      model: MODEL,
      contents: String(message),

    } as any);

    const response: any = await withTimeout(promise, timeoutMs);

    let text = "";

    if (!response) throw new Error("Empty response from Gemini");

    if (typeof response === "string") text = response;
    else if (typeof response.text === "string") text = response.text;
    else if (typeof response.outputText === "string") text = response.outputText;
    else if (Array.isArray(response.output)) {
      for (const o of response.output) {
        if (typeof o === "string") {
          text = o;
          break;
        }
        if (o?.content && Array.isArray(o.content)) {
          for (const c of o.content) {
            if (typeof c?.text === "string") {
              text = c.text;
              break;
            }
            if (typeof c === "string") {
              text = c;
              break;
            }
          }
        }
        if (text) break;
      }
    } else if (response?.candidates && Array.isArray(response.candidates) && typeof response.candidates[0]?.content === "string") {
      text = response.candidates[0].content;
    } else if (response?.data && Array.isArray(response.data) && typeof response.data[0]?.text === "string") {
      text = response.data[0].text;
    } else {
      // Fallback: stringify whatever we got
      text = JSON.stringify(response);
    }

    return String(text).trim();
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    console.error("callChatAPI error:", msg);
    throw new Error(`Gemini error: ${msg}`);
  }
}
