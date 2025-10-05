// services/aiService.ts
// Uses Hugging Face Inference API to generate food-education lessons and a 3-question MC quiz.
// Expects EXPO_PUBLIC_HF_API_KEY in env (client-side token).

type GeneratedResult = {
  content: any;
  raw: string;
  modelUsed: string | null;
  fromFallback?: boolean;
};

const DEFAULT_MODEL = "google/flan-t5-base"; // instruction-tuned, reasonable size

function createFallbackLesson(lessonId: string, title?: string, subtitle?: string): GeneratedResult {
  const t = title ?? subtitle ?? `Lesson ${lessonId}`;
  const content = {
    title: t,
    overview:
      "Basic food education: short, reliable tips on nutrition, labels and food safety. (Fallback content — no AI available.)",
    sections: [
      { heading: "What this lesson covers", body: "How to read labels, watch serving sizes and basic food safety." },
      { heading: "Quick tips", body: "1) Check ingredient lists for added sugar. 2) Refrigerate perishables. 3) Compare serving sizes." },
    ],
    // 3 multiple-choice questions (A-D) — options array length = 4, correctIndex is 0..3
    quiz: [
      {
        question: "What should you check on a label to find added sugar?",
        options: ["Ingredient list and 'added sugars' field", "Calories only", "Brand name", "Picture on the box"],
        correctIndex: 0,
      },
      {
        question: "Which is a basic food safety practice?",
        options: ["Refrigerate perishable foods promptly", "Leave cooked food at room temperature", "Use same plate for raw and cooked", "Store everything at room temperature"],
        correctIndex: 0,
      },
      {
        question: "Which swap reduces added sugars?",
        options: ["Choose whole fruit instead of juice", "Drink more soda", "Add sugar to cereal", "Buy concentrated juice"],
        correctIndex: 0,
      },
    ],
    notes: ["Fallback content because the HF API was unavailable or quota exhausted."],
  };
  return { content, raw: JSON.stringify(content), modelUsed: null, fromFallback: true };
}

/** Call Hugging Face inference for text generation */
async function callHuggingFace(apiKey: string, model: string, prompt: string) {
  const url = `https://api-inference.huggingface.co/models/${model}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      // parameters can control length/temperature; keep conservative tokens
      parameters: { max_new_tokens: 512, temperature: 0.6, top_p: 0.95 },
    }),
  });
  return resp;
}

/** Main exported generator */
export async function generateFoodLessonFromHuggingFace(
  lessonId: string,
  title?: string,
  subtitle?: string,
  opts?: { tone?: string; difficulty?: string; model?: string }
): Promise<GeneratedResult> {
  const apiKey = process.env.EXPO_PUBLIC_HF_API_KEY || (global as any).__HF_API_KEY__;
  if (!apiKey) {
    // no HF key configured -> fallback
    return createFallbackLesson(lessonId, title, subtitle);
  }

  const model = opts?.model ?? DEFAULT_MODEL;
  const tone = opts?.tone ?? "friendly";
  const difficulty = opts?.difficulty ?? "beginner";

  // Strict instruction prompt: produce valid JSON with 3 MC questions A-D
  const prompt = `
You are an expert food educator. Produce ONLY valid JSON (no commentary) with the following structure:
{
  "title": string,
  "overview": string,
  "sections": [ { "heading": string, "body": string } ],
  "quiz": [
    {
      "question": string,
      "options": [ string, string, string, string ],  // EXACTLY 4 options (A-D)
      "correctIndex": number // integer 0..3
    }
  ],
  "notes": [ string ]
}

Constraints:
- The quiz must contain exactly 3 questions.
- Keep language beginner-friendly, concise (mobile readable).
- Only include food education topics (nutrition, food labels, food safety, portion sizes, sugar, budgeting for food, labeling claims).
- Use safe content only. No politics or medical advice beyond basic nutrition tips.

Inputs:
lessonId: ${lessonId}
title: ${JSON.stringify(title ?? "")}
subtitle: ${JSON.stringify(subtitle ?? "")}
tone: ${tone}
difficulty: ${difficulty}

Return valid JSON only.
`.trim();

  try {
    const resp = await callHuggingFace(apiKey, model, prompt);
    if (!resp.ok) {
      const text = await resp.text();
      // HF will return 429 on quota; treat that specially and fallback
      if (resp.status === 429 || text.toLowerCase().includes("quota") || text.toLowerCase().includes("insufficient")) {
        console.warn("Hugging Face quota or 429 returned:", resp.status, text);
        return createFallbackLesson(lessonId, title, subtitle);
      }
      throw new Error(`Hugging Face error ${resp.status}: ${text}`);
    }

    // HF inference may return either a simple text or an array with generated text strings
    const json = await resp.json();
    // The HF text result often sits in json[0].generated_text or json.generated_text depending on model/inference
    let generatedText = "";
    if (Array.isArray(json) && json.length > 0) {
      // many HF models return [{ generated_text: "..." }]
      if (typeof json[0] === "string") {
        generatedText = json[0];
      } else if (typeof json[0].generated_text === "string") {
        generatedText = json[0].generated_text;
      } else {
        // try to stringify
        generatedText = JSON.stringify(json);
      }
    } else if (typeof json.generated_text === "string") {
      generatedText = json.generated_text;
    } else if (typeof json === "string") {
      generatedText = json;
    } else {
      generatedText = JSON.stringify(json);
    }

    // Extract JSON object from generated text (guard against extra text)
    const match = String(generatedText).match(/(\{[\s\S]*\})/);
    let parsed: any = null;
    if (match) {
      try {
        parsed = JSON.parse(match[1]);
      } catch (e) {
        parsed = null;
      }
    }

    // If parse failed, fallback to generatedText-wrapped lesson
    if (!parsed || typeof parsed !== "object") {
      // fallback parse: create a simple lesson with generated text as overview
      parsed = {
        title: title || `Lesson ${lessonId}`,
        overview: String(generatedText).slice(0, 400),
        sections: [{ heading: subtitle || "Overview", body: String(generatedText) }],
        quiz: [],
        notes: [],
      };
    }

    // Normalize quiz: ensure exactly 3 MC questions with 4 options each and numeric correctIndex 0..3
    if (Array.isArray(parsed.quiz) && parsed.quiz.length > 0) {
      const out: any[] = [];
      for (let i = 0; i < Math.min(parsed.quiz.length, 3); i++) {
        const it = parsed.quiz[i] ?? {};
        // Accept either {question, options, correctIndex} or {q, options, correctIndex} or {q, a}
        const question = it.question ?? it.q ?? String(it.prompt ?? `Question ${i + 1}`);
        let options = Array.isArray(it.options) ? it.options.map(String) : [];
        // if only an answer a present, create simple MC with answer first + distractors
        if (options.length < 4) {
          const answerText = it.answer ?? it.a ?? it.correct ?? "";
          const distractors = ["A plausible wrong option", "Another plausible wrong option", "A wrong option"];
          options = [String(answerText || "Correct answer"), ...distractors].slice(0, 4);
        }
        while (options.length < 4) options.push("None of the above");
        let correctIndex = typeof it.correctIndex === "number" ? it.correctIndex : -1;
        // try to find correct if 'answer' exists
        if ((correctIndex < 0 || correctIndex > 3) && typeof it.answer === "string") {
          const idx = options.findIndex((o: string) => o.trim() === String(it.answer).trim());
          if (idx >= 0) correctIndex = idx;
        }
        if (correctIndex < 0 || correctIndex > 3) correctIndex = 0;
        out.push({ question, options: options.slice(0, 4), correctIndex });
      }
      while (out.length < 3) {
        out.push({
          question: "Extra question: which is true?",
          options: ["True", "False", "Maybe", "Not sure"],
          correctIndex: 0,
        });
      }
      parsed.quiz = out;
    } else {
      // No quiz produced -> create 3 reasonable fallback MC questions
      parsed.quiz = createFallbackLesson(lessonId, title, subtitle).content.quiz;
    }

    return { content: parsed, raw: generatedText, modelUsed: model, fromFallback: false };
  } catch (err: any) {
    console.error("generateFoodLessonFromHuggingFace error:", err);
    return createFallbackLesson(lessonId, title, subtitle);
  }
}
