import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
const pdf = require("pdf-parse");
const mammoth = require("mammoth");

// --- 🔑 Validate API Key ---
if (!process.env.GOOGLE_API_KEY) {
  throw new Error("Missing GOOGLE_API_KEY environment variable");
}

// --- 🤖 Initialize Gemini Model ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
  },
});

// ===================================================================
// MAIN HANDLER
// ===================================================================
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type");

    // --- Case 1: Review uploaded file ---
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

    // --- Case 2: Generate new questions ---
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

    // --- Unsupported content type ---
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
// HELPERS
// ===================================================================

// --- 🧾 Extract text from uploaded file ---
async function extractTextFromFile(file: File): Promise<string> {
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf") {
    const data = await pdf(fileBuffer);
    return data.text;
  }

  if (
    file.type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  }

  if (file.type === "application/msword") {
    console.warn("Parsing .doc file as plain text (best-effort).");
    return fileBuffer.toString("utf-8");
  }

  throw new Error("Unsupported file type. Only PDF or DOCX/DOC are allowed.");
}

// --- 🤖 Generate AI Response ---
async function generateAIContent(prompt: string) {
  try {
    const result = await model.generateContent(prompt);
    const jsonText = result.response.text();
    return JSON.parse(jsonText);
  } catch (err) {
    console.error("AI Generation Error:", err);
    throw new Error("Failed to get valid JSON from Gemini model.");
  }
}

// --- 🧩 Normalize any AI output into Type 2 format ---
function normalizeToType2(aiResponse: any) {
  const output: { questions: { question: string; type: string }[] } = {
    questions: [],
  };

  if (!aiResponse) return output;

  // Case A: Already Type 2 format
  if (Array.isArray(aiResponse.questions)) {
    output.questions = aiResponse.questions
      .filter((q) => q.question && q.type)
      .map((q) => ({
        question: String(q.question).trim(),
        type: String(q.type).trim(),
      }));
    return output;
  }

  // Case B: Old grouped format
  if (typeof aiResponse.questions === "object") {
    Object.entries(aiResponse.questions).forEach(([type, list]) => {
      if (Array.isArray(list)) {
        list.forEach((q) => {
          if (typeof q === "string" && q.trim()) {
            output.questions.push({ question: q.trim(), type });
          }
        });
      }
    });
  }

  return output;
}

// ===================================================================
// PROMPT ENGINEERING
// ===================================================================

function buildGenerationPrompt(
  jobPosition: string,
  jobDescription: string,
  interviewDuration: string,
  interviewType: string[],
  experienceLevel: string
): string {
  const typesString = interviewType.join(", ");

  let questionCountRange = "5–7";
  if (interviewDuration.includes("5")) questionCountRange = "3–5";
  else if (interviewDuration.includes("15")) questionCountRange = "6–10";
  else if (interviewDuration.includes("30")) questionCountRange = "11–15";
  else if (interviewDuration.includes("45")) questionCountRange = "16–20";
  else if (interviewDuration.includes("60")) questionCountRange = "21–25";

  const experienceGuidelines = {
    Junior:
      "Focus on basic conceptual understanding and simple problem-solving.",
    Mid:
      "Include scenario-based questions testing applied knowledge and debugging.",
    Senior:
      "Include advanced, design-level questions that assess architecture and leadership.",
  };

  const levelGuideline =
    experienceGuidelines[experienceLevel as keyof typeof experienceGuidelines] ||
    "Generate questions relevant to the experience level.";

  return `
You are an expert AI interviewer that generates professional interview questions.

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
6. Respond ONLY with pure JSON in this structure:

{
  "questions": [
    { "question": "string", "type": "string" },
    { "question": "string", "type": "string" }
  ]
}

Do NOT include any explanations or commentary.
  `;
}

function buildReviewPrompt(
  fileText: string,
  jobPosition: string,
  jobDescription: string,
  interviewTypes: string[]
): string {
  const typesString = interviewTypes.join(", ");

  return `
You are an expert recruitment assistant for an AI interview platform.
Analyze and categorize questions found in the provided document.

Job Role: ${jobPosition}
Job Description: ${jobDescription}
Categories: ${typesString}

Document Text:
---
${fileText}
---

Rules:
1. Identify all valid interview questions.
2. Assign each one a "type" from: ${typesString}.
3. Exclude duplicates or irrelevant content.
4. Respond ONLY with JSON in this format:

{
  "questions": [
    { "question": "string", "type": "string" },
    { "question": "string", "type": "string" }
  ]
}
  `;
}
