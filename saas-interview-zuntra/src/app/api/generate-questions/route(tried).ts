import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Packages for parsing files
const pdf = require("pdf-parse");
const mammoth = require("mammoth");

// --- Initialize Google Gemini client ---
if (!process.env.GOOGLE_API_KEY) {
  throw new Error("Missing GOOGLE_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json", // ensures structured JSON
  },
});

// =====================================================================
//                           MAIN HANDLER
// =====================================================================
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type");

    // =====================================================================
    // 1️⃣  FILE UPLOAD BRANCH  →  Extract Questions Locally (NO AI CALL)
    // =====================================================================
    if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      // 1. Extract text content
      const fileText = await extractTextFromFile(file);

      // 2. Extract questions from text (simple regex-based extraction)
      const extractedQuestions = extractQuestionsFromText(fileText);

      // 3. Return structured response (NO AI)
      return NextResponse.json({
        source: "file",
        parsedText: fileText,
        questions: {
          Extracted: extractedQuestions.length
            ? extractedQuestions
            : ["No valid questions found in the uploaded file."],
        },
      });
    }

    // =====================================================================
    // 2️⃣  JSON PAYLOAD BRANCH  →  Generate Questions Using AI
    // =====================================================================
    else if (contentType?.includes("application/json")) {
      const body = await request.json();
      const {
        jobPosition,
        jobDescription,
        interviewDuration,
        interviewType,
        experienceLevel,
      } = body;

      // 1. Build prompt for Gemini
      const prompt = buildGenerationPrompt(
        jobPosition,
        jobDescription,
        interviewDuration,
        interviewType,
        experienceLevel
      );

      // 2. Generate AI-based questions
      const aiResponse = await generateAIContent(prompt);
      return NextResponse.json(aiResponse);
    }

    // =====================================================================
    // 3️⃣  UNSUPPORTED CONTENT TYPE
    // =====================================================================
    else {
      return NextResponse.json(
        { error: "Unsupported Content-Type" },
        { status: 415 }
      );
    }
  } catch (error: any) {
    console.error("Error in /api/generate-questions:", error);
    return NextResponse.json(
      { error: error.message || "An internal server error occurred" },
      { status: 500 }
    );
  }
}

// =====================================================================
//                      HELPER FUNCTIONS
// =====================================================================

/**
 * Extracts text content from a File object (PDF, DOCX, DOC).
 */
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
    console.warn("Parsing .doc file as plain text. Formatting will be lost.");
    return fileBuffer.toString("utf-8");
  }

  throw new Error("Unsupported file type. Only PDF, DOCX, or DOC allowed.");
}

/**
 * Extracts questions directly from raw text using regex patterns.
 * Detects questions ending with '?' or structured as 'Q1.', '1)', '-', '*', etc.
 */
function extractQuestionsFromText(text: string): string[] {
  const questionPattern =
    /(?:^|\n)(?:Q\d*\.|\d+\)|\d+\.\s*|-|\*)?\s*([A-Z][^?]{5,}\?)/g;

  const matches: string[] = [];
  let match;
  while ((match = questionPattern.exec(text)) !== null) {
    matches.push(match[1].trim());
  }

  // Deduplicate and clean
  return [...new Set(matches)];
}

/**
 * Calls the Gemini AI model and ensures valid JSON response.
 */
async function generateAIContent(prompt: string) {
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const jsonText = response.text();

    return JSON.parse(jsonText);
  } catch (e: any) {
    console.error("AI Generation Error:", e);
    throw new Error("Failed to get a valid response from the AI model.");
  }
}

// =====================================================================
//                      PROMPT ENGINEERING
// =====================================================================

/**
 * Creates a prompt for the AI to *generate* new interview questions.
 * Adjusts question count and complexity based on interview duration and experience.
 */
function buildGenerationPrompt(
  jobPosition: string,
  jobDescription: string,
  interviewDuration: string,
  interviewType: string[],
  experienceLevel: string
): string {
  const typesString = interviewType.join(", ");

  // Determine question count range based on duration
  let questionCountRange = "5–7";
  if (interviewDuration.includes("5")) questionCountRange = "3–5";
  else if (interviewDuration.includes("15")) questionCountRange = "6–10";
  else if (interviewDuration.includes("30")) questionCountRange = "11–15";
  else if (interviewDuration.includes("45")) questionCountRange = "16–20";
  else if (interviewDuration.includes("60")) questionCountRange = "21–25";

  const experienceGuidelines = {
    Junior:
      "Focus on fundamental concepts, basic problem-solving, and definitions. Avoid complex architecture-level questions.",
    Mid:
      "Include scenario-based, practical coding, and applied reasoning questions.",
    Senior:
      "Ask deep design, optimization, and leadership-related questions testing architecture and strategy.",
  };

  const levelGuideline =
    experienceGuidelines[
      experienceLevel as keyof typeof experienceGuidelines
    ] || "Generate questions relevant to the specified experience level.";

  return `
    You are an expert technical interviewer AI system.
    Your task is to generate a structured and diverse set of interview questions.

    Job Role: ${jobPosition}
    Experience Level: ${experienceLevel}
    Job Description: ${jobDescription}
    Interview Duration: ${interviewDuration}
    Requested Question Types: ${typesString}

    Guidelines:
    1. Generate approximately ${questionCountRange} unique, non-repetitive questions.
    2. Divide them evenly across the requested types: ${typesString}.
    3. Questions must align with the experience level:
       ${levelGuideline}
    4. Avoid redundant or repetitive questions.
    5. Each question must be contextually relevant to the role and description.
    6. Respond ONLY with a valid JSON object in this structure:
       {
         "questions": {
           "CategoryName": ["question 1", "question 2"],
           "AnotherCategory": ["question 3"]
         }
       }
    7. Do NOT include any commentary or text outside the JSON.
  `;
}
