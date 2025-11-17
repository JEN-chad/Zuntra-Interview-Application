import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
const pdf = require("pdf-parse");
const mammoth = require("mammoth");

// ---------------------------------------------
// 🔑 Validate API Key
// ---------------------------------------------
if (!process.env.GOOGLE_API_KEY) {
  throw new Error("Missing GOOGLE_API_KEY environment variable");
}

// ---------------------------------------------
// 🤖 Initialize Gemini Client
// ---------------------------------------------
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// ---------------------------------------------
// 🔁 MODEL FAILOVER LIST
// ---------------------------------------------
const MODEL_FAILOVER_LIST = [
  "gemini-2.0-flash-thinking",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

function getModel(name: string) {
  return genAI.getGenerativeModel({
    model: name,
    generationConfig: { responseMimeType: "application/json" },
  });
}

// ===================================================================
// MAIN HANDLER
// ===================================================================
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type");

    // ----------------- Resume Review (file upload) -----------------
    if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const fileText = await extractTextFromFile(file);

      const jobPosition = formData.get("jobPosition") as string;
      const jobDescription = formData.get("jobDescription") as string;
      const interviewTypes = JSON.parse(
        formData.get("interviewType") as string
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

    // ----------------- Question Generation (JSON body) -----------------
    else if (contentType?.includes("application/json")) {
      const body = await request.json();
      const {
        jobPosition,
        jobDescription,
        interviewDuration,
        interviewType,
        experienceLevel,
      } = body;

      const prompt = buildGenerationPrompt(
        jobPosition,
        jobDescription,
        interviewDuration,
        interviewType,
        experienceLevel
      );

      const aiResponse = await generateAIContent(prompt);
      return NextResponse.json(normalizeToType2(aiResponse));
    }

    return NextResponse.json(
      { error: "Unsupported Content-Type" },
      { status: 415 }
    );
  } catch (error: any) {
    console.error("Error in /api/generate-questions:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ===================================================================
// 🧾 Extract text from file
// ===================================================================
async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf") {
    const data = await pdf(buffer);
    return data.text;
  }

  if (
    file.type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (file.type === "application/msword") {
    return buffer.toString("utf-8");
  }

  throw new Error("Unsupported file type. Only PDF or DOCX/DOC allowed.");
}

// ===================================================================
// 🤖 AI GENERATION WITH AUTO-MODEL FAILOVER
// ===================================================================
async function generateAIContent(prompt: string) {
  const maxRetriesPerModel = 2;

  for (const modelName of MODEL_FAILOVER_LIST) {
    console.log(`🔄 Trying model: ${modelName}`);

    const model = getModel(modelName);

    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      try {
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const rawText = result.response.text();
        const cleanedJSON = extractJSON(rawText);

        console.log(`✅ Success using ${modelName}`);
        return JSON.parse(cleanedJSON);
      } catch (err: any) {
        console.error(
          `❌ Model ${modelName} failed (Attempt ${attempt}/${maxRetriesPerModel}):`, err
        );

        const retryable = [429, 500, 503].includes(err?.status);

        if (retryable && attempt < maxRetriesPerModel) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          continue;
        }

        break; // move to next model
      }
    }

    console.log(`⚠️ Switching model due to failure: ${modelName}`);
  }

  throw new Error("All Gemini models failed after failover attempts.");
}

// ===================================================================
// 🔧 Extract JSON safely
// ===================================================================
function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Gemini did not return valid JSON.");
  return match[0];
}

// ===================================================================
// 🧩 Normalize output
// ===================================================================
function normalizeToType2(aiResponse: any) {
  const output: { questions: { question: string; type: string }[] } = {
    questions: [],
  };

  if (!aiResponse) return output;

  if (Array.isArray(aiResponse.questions)) {
    output.questions = aiResponse.questions.map((q) => ({
      question: String(q.question).trim(),
      type: String(q.type).trim(),
    }));
    return output;
  }

  if (typeof aiResponse.questions === "object") {
    Object.entries(aiResponse.questions).forEach(([type, list]) => {
      if (Array.isArray(list)) {
        list.forEach((q) =>
          output.questions.push({ question: q.trim(), type })
        );
      }
    });
  }

  return output;
}

// ===================================================================
// 🧠 PROMPT ENGINEERING
// ===================================================================
function buildGenerationPrompt(
  jobPosition: string,
  jobDescription: string,
  interviewDuration: string,
  interviewType: string[],
  experienceLevel: string
) {
  const types = interviewType.join(", ");

  let count = "5–7";
  if (interviewDuration.includes("5")) count = "3–5";
  if (interviewDuration.includes("15")) count = "6–10";
  if (interviewDuration.includes("30")) count = "11–15";
  if (interviewDuration.includes("45")) count = "16–20";
  if (interviewDuration.includes("60")) count = "21–25";

  const expGuide: any = {
    Junior: "Ask basic conceptual questions.",
    Mid: "Ask applied knowledge & debugging.",
    Senior: "Ask architecture, leadership & system design.",
  };

  return `
You are an expert AI interviewer.

Job Role: ${jobPosition}
Experience: ${experienceLevel}
Description: ${jobDescription}
Duration: ${interviewDuration}
Question Types: ${types}

Rules:
1. Generate ${count} high-quality questions.
2. Return ONLY JSON.
3. Each item must include "question" and "type".
4. Type must be one of: ${types}.
5. Use experience level: ${expGuide[experienceLevel]}

JSON format:
{
  "questions": [
    { "question": "string", "type": "string" }
  ]
}
`;
}

function buildReviewPrompt(
  fileText: string,
  jobPosition: string,
  jobDescription: string,
  interviewTypes: string[]
) {
  const types = interviewTypes.join(", ");

  return `
You are an expert recruitment assistant.

Extract interview questions from this document and categorize them.

Document:
---
${fileText}
---

Rules:
1. Only valid interview questions.
2. No duplicates.
3. Each item contains "question" and "type".
4. JSON only.

Types: ${types}

JSON Response:
{
  "questions": [
    { "question": "string", "type": "string" }
  ]
}
`;
}
