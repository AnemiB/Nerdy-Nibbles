type GeneratedResult = {
  content: any;
  raw: string;
  modelUsed: string | null;
  fromFallback?: boolean;
};

const DEFAULT_MODEL = "google/flan-t5-base";

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
      parameters: { max_new_tokens: 512, temperature: 0.6, top_p: 0.95 },
    }),
  });
  return resp;
}

function extractBetweenTripleBackticks(text: string) {
  const tripleBacktickRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const m = text.match(tripleBacktickRegex);
  return m ? m[1].trim() : null;
}

function extractBalancedJson(text: string) {
  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) return null;
  let depth = 0;
  let inStringChar: string | false = false;
  let escapeNext = false;
  for (let i = firstBrace; i < text.length; i++) {
    const ch = text[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === "\\") {
      escapeNext = true;
      continue;
    }
    if (ch === '"' || ch === "'") {
      if (!inStringChar) inStringChar = ch;
      else if (inStringChar === ch) inStringChar = false;
      continue;
    }
    if (inStringChar) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(firstBrace, i + 1);
      }
    }
  }
  return null;
}

function lightRepairSingleQuotes(s: string) {
  return s.replace(/(['\u2018\u2019])(?=\s*:)|:\s*(['\u2018\u2019])|(['\u2018\u2019])(?=\s*[,\}])/g, '"');
}

export async function generateFoodLessonFromHuggingFace(
  lessonId: string,
  title?: string,
  subtitle?: string,
  opts?: { tone?: string; difficulty?: string; model?: string }
): Promise<GeneratedResult> {
  const apiKey = process.env.EXPO_PUBLIC_HF_API_KEY || (global as any).__HF_API_KEY__;
  if (!apiKey) return createFallbackLesson(lessonId, title, subtitle);

  const model = opts?.model ?? DEFAULT_MODEL;
  const tone = opts?.tone ?? "friendly";
  const difficulty = opts?.difficulty ?? "beginner";

  const prompt = `
You are an expert food educator. Produce ONLY valid JSON and nothing else. IMPORTANT: wrap the JSON in triple backticks like this:

\`\`\`json
{ ... }
\`\`\`

The JSON must follow exactly this structure:

{
  "title": string,
  "overview": string,
  "sections": [ { "heading": string, "body": string } ],
  "quiz": [
    {
      "question": string,
      "options": [ string, string, string, string ],
      "correctIndex": number
    }
  ],
  "notes": [ string ]
}

Constraints:
- The quiz must contain exactly 3 questions.
- Keep language beginner-friendly, concise (mobile readable).
- Only include food education topics (nutrition, food labels, food safety, portion sizes, sugar, budgeting for food, labelling claims).
- Use safe content only. No politics or medical advice beyond basic nutrition tips.
- Do NOT include any text outside the triple-backtick JSON block.

Inputs:
lessonId: ${lessonId}
title: ${JSON.stringify(title ?? "")}
subtitle: ${JSON.stringify(subtitle ?? "")}
tone: ${tone}
difficulty: ${difficulty}

Return valid JSON only, enclosed in triple backticks as shown above.
`.trim();

  try {
    const resp = await callHuggingFace(apiKey, model, prompt);

    if (!resp.ok) {
      const text = await resp.text().catch(() => "<non-text response>");
      console.warn("Hugging Face returned non-ok status:", resp.status, text.slice?.(0, 400) ?? text);
      if (resp.status === 429 || String(text).toLowerCase().includes("quota") || String(text).toLowerCase().includes("insufficient")) {
        return createFallbackLesson(lessonId, title, subtitle);
      }
      throw new Error(`Hugging Face error ${resp.status}: ${text}`);
    }

    // HF may return array/object/string
    const json = await resp.json().catch(async () => ({ raw: await resp.text().catch(() => "") }));

    let generatedText = "";
    if (Array.isArray(json) && json.length > 0) {
      if (typeof json[0] === "string") generatedText = json[0];
      else if (typeof json[0]?.generated_text === "string") generatedText = json[0].generated_text;
      else generatedText = JSON.stringify(json);
    } else if (typeof json?.generated_text === "string") {
      generatedText = json.generated_text;
    } else if (typeof json === "string") {
      generatedText = json;
    } else if (json?.raw && typeof json.raw === "string") {
      generatedText = json.raw;
    } else {
      generatedText = JSON.stringify(json);
    }

    let parsed: any = null;
    let extractedJsonText: string | null = null;

    extractedJsonText = extractBetweenTripleBackticks(generatedText);
    if (extractedJsonText) {
      try {
        parsed = JSON.parse(extractedJsonText);
      } catch (e) {
        console.warn("Failed to parse JSON inside triple backticks:", (e as Error).message);
        parsed = null;
      }
    }

    if (!parsed) {
      const balanced = extractBalancedJson(generatedText);
      if (balanced) {
        try {
          parsed = JSON.parse(balanced);
          extractedJsonText = balanced;
        } catch (e) {
          console.warn("Failed to JSON.parse balanced block. Error:", (e as Error).message);
          console.debug("Balanced block preview:", balanced.slice(0, 2000));
          parsed = null;
        }
      }
    }

    if (!parsed) {
      try {
        parsed = JSON.parse(generatedText);
        extractedJsonText = generatedText;
      } catch {
        parsed = null;
      }
    }

    if (!parsed) {
      try {
        const repaired = lightRepairSingleQuotes(generatedText);
        parsed = JSON.parse(repaired);
        extractedJsonText = repaired;
        console.warn("Parsed by light repair (single->double quotes).");
      } catch {
        parsed = null;
      }
    }

    if (!parsed || typeof parsed !== "object") {
      console.warn("Could not parse model output as JSON. Raw output (preview):", String(generatedText).slice(0, 1500));
      parsed = {
        title: title || `Lesson ${lessonId}`,
        overview: String(generatedText).slice(0, 400),
        sections: [{ heading: subtitle || "Overview", body: String(generatedText).slice(0, 2000) }],
        quiz: createFallbackLesson(lessonId, title, subtitle).content.quiz,
        notes: ["Generated output could not be parsed as JSON; fallback quiz inserted."],
      };
    }

    // Normalize quiz: Ensure exactly 3 MC questions with 4 options and correctIndex
    if (Array.isArray(parsed.quiz) && parsed.quiz.length > 0) {
      const out: any[] = [];
      for (let i = 0; i < Math.min(parsed.quiz.length, 3); i++) {
        const it = parsed.quiz[i] ?? {};
        const question = it.question ?? it.q ?? String(it.prompt ?? `Question ${i + 1}`);
        let options = Array.isArray(it.options) ? it.options.map(String) : [];
        if (options.length < 4) {
          const answerText = it.answer ?? it.a ?? it.correct ?? "";
          const distractors = ["A plausible wrong option", "Another plausible wrong option", "A wrong option"];
          options = [String(answerText || "Correct answer"), ...distractors].slice(0, 4);
        }
        while (options.length < 4) options.push("None of the above");
        let correctIndex = typeof it.correctIndex === "number" ? it.correctIndex : -1;
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
      parsed.quiz = createFallbackLesson(lessonId, title, subtitle).content.quiz;
    }

    return { content: parsed, raw: generatedText, modelUsed: model, fromFallback: false };
  } catch (err: any) {
    console.error("generateFoodLessonFromHuggingFace error:", err);
    return createFallbackLesson(lessonId, title, subtitle);
  }
}
