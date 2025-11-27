import { NextResponse } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";
import mammoth from "mammoth";

/**
 * Required env:
 *  - GCP_PROJECT_ID
 *  - GOOGLE_APPLICATION_CREDENTIALS (absolute path to service account JSON)
 */

const pdf = require("pdf-parse");

// ---------- ENV VALIDATION ----------
if (!process.env.GCP_PROJECT_ID) {
  throw new Error("Missing GCP_PROJECT_ID env var");
}
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS env var");
}

// ---------- Vertex Client ----------
const vertex = new VertexAI({
  project: process.env.GCP_PROJECT_ID,
  location: "us-central1",
  googleAuthOptions: {
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },
});

// Preferred model list
const PREFERRED_MODELS = [
  `projects/${process.env.GCP_PROJECT_ID}/locations/us-central1/publishers/google/models/gemini-2.0-flash`,
  `projects/${process.env.GCP_PROJECT_ID}/locations/us-central1/models/gemini-2.0-flash`,
  "models/gemini-2.0-flash",
  "google/gemini-2.0-flash",
];

// ---------- Resolve Model ----------
async function getAvailableModel() {
  let lastErr: any = null;
  for (const modelId of PREFERRED_MODELS) {
    try {
      const candidate = vertex.getGenerativeModel({
        model: modelId,
        generationConfig: { responseMimeType: "application/json" },
      });
      return candidate;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("No available Vertex model found");
}

// ---------- Main Handler ----------
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // -------------------- CASE A: multipart with file --------------------
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const fileText = await extractTextFromFile(file);

      const jobPosition = String(formData.get("jobPosition") || "").trim();
      const jobDescription = String(formData.get("jobDescription") || "").trim();
      const interviewTypes = JSON.parse(
        String(formData.get("interviewType") || "[]")
      ) as string[];

      const prompt = buildReviewPrompt(
        fileText,
        jobPosition,
        jobDescription,
        interviewTypes
      );

      const aiResponse = await generateAIContent(prompt);
      return NextResponse.json(normalizeToType2(aiResponse));
    }

    // -------------------- CASE B: application/json --------------------
    if (contentType.includes("application/json")) {
      const body = await request.json();

      const {
        jobPosition = "",
        jobDescription = "",
        interviewDuration = "",
        interviewType = [],
        experienceLevel = "Mid",
      } = body;

      const prompt = buildGenerationPrompt(
        String(jobPosition),
        String(jobDescription),
        String(interviewDuration),
        Array.isArray(interviewType)
          ? (interviewType as string[])
          : [String(interviewType)],
        String(experienceLevel)
      );

      const aiResponse = await generateAIContent(prompt);
      return NextResponse.json(normalizeToType2(aiResponse));
    }

    return NextResponse.json(
      { error: "Unsupported Content-Type" },
      { status: 415 }
    );
  } catch (err: any) {
    console.error("Error in /api/generate-questions:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ====================================================================
//                        FILE TEXT EXTRACTION
// ====================================================================

async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = file.type;

  // ---------- 1. PDF → Gemini ----------
  if (mime === "application/pdf") {
    return await extractUsingGemini(buffer, mime);
  }

  // ---------- 2. Image → Gemini ----------
  if (
    mime.startsWith("image/") &&
    (mime.endsWith("png") ||
      mime.endsWith("jpeg") ||
      mime.endsWith("jpg") ||
      mime.endsWith("webp"))
  ) {
    return await extractUsingGemini(buffer, mime);
  }

  // ---------- 3. DOCX → Mammoth ----------
  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result?.value || "";
  }

  // ---------- 4. DOC → fallback ----------
  if (mime === "application/msword") {
    return buffer.toString("utf-8");
  }

  // ---------- 5. Other files → fallback ----------
  return buffer.toString("utf-8");
}

// ---------- Gemini Parser for PDF & Images ----------
async function extractUsingGemini(buffer: Buffer, mimeType: string) {
  const base64 = buffer.toString("base64");
  const model = await getAvailableModel();

  const prompt = `
Extract all readable text from this document or image.
Return ONLY plain text. No markdown. No code blocks.
Preserve logical reading order.
`;

  const result = await model.generateContent({
    contents: [
      { role: "user", parts: [{ text: prompt }] },
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
        ],
      },
    ],
  });

  return (
    result?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ""
  );
}

// ====================================================================
//                        GENERATE QUESTIONS
// ====================================================================

async function generateAIContent(prompt: string) {
  try {
    const model = await getAvailableModel();

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const rawText =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      console.error("Vertex raw result (unexpected shape):", JSON.stringify(result, null, 2));
      throw new Error("No text returned from Vertex model");
    }

    return JSON.parse(rawText);
  } catch (err) {
    console.error("Vertex Generation Error:", err);
    throw err;
  }
}

// ====================================================================
//                        NORMALIZER
// ====================================================================

function normalizeToType2(aiResponse: any) {
  const output: { questions: { question: string; type: string }[] } = {
    questions: [],
  };

  if (!aiResponse || !aiResponse.questions) return output;

  // Already [{question,type}]
  if (Array.isArray(aiResponse.questions)) {
    output.questions = aiResponse.questions
      .filter((q: any) => q?.question && q?.type)
      .map((q: any) => ({
        question: String(q.question).trim(),
        type: String(q.type).trim(),
      }));
    return output;
  }

  // Object form { technical: ["q1"], soft: ["q2"] }
  Object.entries(aiResponse.questions).forEach(([type, list]) => {
    if (Array.isArray(list)) {
      list.forEach((q) => {
        if (q && typeof q === "string" && q.trim()) {
          output.questions.push({ question: q.trim(), type });
        }
      });
    }
  });

  return output;
}

// ====================================================================
//                        PROMPT BUILDERS
// ====================================================================

function buildGenerationPrompt(
  jobPosition: string,
  jobDescription: string,
  interviewDuration: string,
  interviewType: string[],
  experienceLevel: string
): string {
  const typesString = interviewType.join(", ") || "technical,behavioral";

  let questionCountRange = "5–7";
  if (interviewDuration.includes("5")) questionCountRange = "3–5";
  else if (interviewDuration.includes("15")) questionCountRange = "6–10";
  else if (interviewDuration.includes("30")) questionCountRange = "11–15";
  else if (interviewDuration.includes("45")) questionCountRange = "16–20";
  else if (interviewDuration.includes("60")) questionCountRange = "21–25";

  const experienceGuidelines: Record<string, string> = {
    Junior: "Focus on basic conceptual understanding and simple problem-solving.",
    Mid: "Include scenario-based questions testing applied knowledge and debugging.",
    Senior:
      "Include advanced, design-level questions that assess architecture and leadership.",
  };

  const levelGuideline =
    experienceGuidelines[experienceLevel] ||
    "Generate questions relevant to the experience level.";

  return `You are an expert AI interviewer that generates professional interview questions.

Job Role: ${jobPosition}
Experience Level: ${experienceLevel}
Job Description: ${jobDescription}
Interview Duration: ${interviewDuration}
Requested Question Types: ${typesString}

Guidelines:
1. Generate approximately ${questionCountRange} unique, high-quality questions.
2. Each question must include both "question" and its "type".
3. The "type" value must be exactly one of: ${typesString}.
4. Align questions with the specified experience level:
   ${levelGuideline}
5. Avoid redundancy and irrelevant questions.
6. Respond ONLY with pure JSON:

{
  "questions": [
    { "question": "string", "type": "string" }
  ]
}

Do NOT include any explanation or commentary.`;
}

function buildReviewPrompt(
  fileText: string,
  jobPosition: string,
  jobDescription: string,
  interviewTypes: string[]
): string {
  const typesString = interviewTypes.join(", ") || "technical,behavioral";

  return `You are an expert recruitment assistant.
Analyze the document and extract interview questions.

Job Role: ${jobPosition}
Job Description: ${jobDescription}
Categories: ${typesString}

Document:
---
${fileText}
---

Rules:
1. Identify all valid interview questions.
2. Assign each a type from: ${typesString}.
3. Remove duplicates or irrelevant items.
4. Respond ONLY with JSON:

{
  "questions": [
    { "question": "string", "type": "string" }
  ]
}
`;
}
