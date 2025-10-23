// app/api/generate-questions/route.ts

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Package for parsing PDF files
const pdf = require("pdf-parse");
// Package for parsing DOCX files
const mammoth = require("mammoth");

// Initialize the Google Generative AI client
if (!process.env.GOOGLE_API_KEY) {
  throw new Error("Missing GOOGLE_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// --- FIX ---
// Updated the model name to a valid, supported model for the API.
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    // Ensure the model outputs JSON
    responseMimeType: "application/json",
  },
});
// --- END FIX ---

/**
 * Handles POST requests to generate or review interview questions.
 *
 * This function determines the request type (JSON or FormData) and routes
 * to the appropriate logic.
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type");

    // Branch 1: File Upload (multipart/form-data)
    // "Review Questions" path
    if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      // 1. Extract file text
      const fileText = await extractTextFromFile(file);

      // 2. Extract other form data
      const jobPosition = formData.get("jobPosition") as string;
      const jobDescription = formData.get("jobDescription") as string;
      // The array was stringified on the frontend, so we parse it back
      const interviewTypes = JSON.parse(
        formData.get("interviewType") as string
      ) as string[];

      // 3. Build the prompt for "reviewing"
      const prompt = buildReviewPrompt(
        fileText,
        jobPosition,
        jobDescription,
        interviewTypes
      );

      // 4. Call the AI model
      const aiResponse = await generateAIContent(prompt);
      return NextResponse.json(aiResponse);

      // Branch 2: No File (application/json)
      // "Generate Questions" path
    } else if (contentType?.includes("application/json")) {
      const body = await request.json();
      const {
        jobPosition,
        jobDescription,
        interviewDuration,
        interviewType,
        experienceLevel,
      } = body;

      // 1. Build the prompt for "generating"
      const prompt = buildGenerationPrompt(
        jobPosition,
        jobDescription,
        interviewDuration,
        interviewType,
        experienceLevel
      );

      // 2. Call the AI model
      const aiResponse = await generateAIContent(prompt);
      return NextResponse.json(aiResponse);

      // Error Branch: Unsupported Content Type
    } else {
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

/**
 * Extracts text content from a File object (PDF or DOCX).
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

  // Handle plain text for .doc (which is often just text or simple binary)
  // Note: This is a fallback and may not work for complex .doc files
  if (file.type === "application/msword") {
    console.warn("Parsing .doc file as plain text. Formatting will be lost.");
    return fileBuffer.toString("utf-8"); // Attempt to read as text
  }

  throw new Error("Unsupported file type. Only PDF or DOCX/DOC are allowed.");
}

/**
 * Calls the Gemini API with a given prompt and parses the JSON response.
 */
async function generateAIContent(prompt: string) {
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const jsonText = response.text();

    // Parse the JSON string from the AI into a real object
    return JSON.parse(jsonText);
  } catch (e: any) {
    console.error("AI Generation Error:", e);
    // Log the full error to the console for more details
    console.error("Full error object:", JSON.stringify(e, null, 2));
    throw new Error("Failed to get a valid response from the AI model.");
  }
}

// --- Prompt Engineering Functions ---

/**
 * Creates a prompt for the AI to *generate* new questions.
 */

//! Old one
// function buildGenerationPrompt(
//   jobPosition: string,
//   jobDescription: string,
//   interviewDuration: string,
//   interviewType: string[], // Array of strings
//   experienceLevel: string
// ): string {
//   const typesString = interviewType.join(", ");

//   return `
//     You are an expert interview question generator for an AI platform.
//     Your task is to generate a set of high-quality interview questions.

//     Job Role: ${jobPosition}
//     Experience Level: ${experienceLevel}
//     Job Description: ${jobDescription}
//     Interview Duration: ${interviewDuration}
//     Requested Question Types: ${typesString}

//     Rules:
//     1. Generate a list of questions appropriate for the specified duration and experience level.
//     2. Group the questions strictly into the requested types: ${typesString}.
//     3. Respond ONLY with a valid JSON object matching this exact format:
//        { "questions": { "CategoryName": ["question 1", "question 2"], "AnotherCategory": ["question 3"] } }
//     4. "CategoryName" MUST be one of the requested types.
//   `;
// }

// ! New One
/**
 * Creates a prompt for the AI to *generate* new questions.
 * The number of questions scales based on interview duration,
 * matches experience level, and avoids repetition.
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
  let questionCountRange = "5–7"; // default
  if (interviewDuration.includes("5")) questionCountRange = "3–5";
  else if (interviewDuration.includes("15")) questionCountRange = "6–10";
  else if (interviewDuration.includes("30")) questionCountRange = "11–15";
  else if (interviewDuration.includes("45")) questionCountRange = "16–20";
  else if (interviewDuration.includes("60")) questionCountRange = "21–25";

  // Define experience-level expectations for clarity
  const experienceGuidelines = {
    Junior:
      "Focus on basic conceptual understanding, definitions, and simple problem-solving. Avoid overly complex or system-level questions.",
    Mid:
      "Include scenario-based and moderately challenging questions that test applied knowledge, debugging, and real-world understanding.",
    Senior:
      "Include advanced, design-level, and optimization-based questions that assess architecture, leadership, and deep domain expertise."
  };

  const levelGuideline =
    experienceGuidelines[experienceLevel as keyof typeof experienceGuidelines] ||
    "Generate questions relevant to the specified experience level.";

  return `
    You are an expert technical interviewer AI system.
    Your job is to generate a structured and diverse set of interview questions.

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
    4. Avoid asking similar or redundant questions.
    5. Each question must be contextually relevant to the Job Role and Description.
    6. Respond ONLY with a valid JSON object in this exact structure:
       {
         "questions": {
           "CategoryName": ["question 1", "question 2"],
           "AnotherCategory": ["question 3"]
         }
       }
    7. "CategoryName" MUST exactly match one of the requested types.
    8. Do NOT include any commentary, explanation, or text outside the JSON.
  `;
}


/**
 * Creates a prompt for the AI to *review and categorize* existing questions from a file.
 */
function buildReviewPrompt(
  fileText: string,
  jobPosition: string,
  jobDescription: string,
  interviewTypes: string[] // Array of strings
): string {
  const typesString = interviewTypes.join(", ");

  return `
    You are an expert recruitment assistant for an AI platform.
    Your task is to review and categorize a list of questions provided by a user.

    Job Role: ${jobPosition}
    Job Description: ${jobDescription}
    Requested Categories: ${typesString}

    Here is the list of questions extracted from the user's document:
    ---
    ${fileText}
    ---

    Rules:
    1. Read all the questions from the document text.
    2. Categorize each question into one of the requested categories: ${typesString}.
    3. If a question does not fit any category, omit it.
    4. Respond ONLY with a valid JSON object matching this exact format:
       { "questions": { "CategoryName": ["question 1", "question 2"], "AnotherCategory": ["question 3"] } }
    5. "CategoryName" MUST be one of the requested categories. If no questions fit a category, return an empty array for it.
  `;
}
