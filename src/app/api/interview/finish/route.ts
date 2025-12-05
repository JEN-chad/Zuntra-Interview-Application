import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { interviewSession } from "@/db/schema";
import { v4 as uuid } from "uuid";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ---------- TYPES ----------
type AnswerItem = {
  questionId: string;
  questionText: string;
  type: string;
  answer: string;
};

type FinishRequest = {
  interviewId: string;
  candidateId: string;
  answers: AnswerItem[];
};

// ---------- ROUTE ----------
export async function POST(req: NextRequest) {
  try {
    // Parse + Type
    const {
      interviewId,
      candidateId,
      answers,
    }: FinishRequest = await req.json();

    // Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash", // final stable model
    });

    // Construct evaluation prompt
    const prompt = `
You are an interview evaluator. Evaluate the entire interview.

${answers
  .map(
    (a, i) => `
Q${i + 1}: ${a.questionText}

A${i + 1}: ${a.answer}
`
  )
  .join("\n")}

Respond ONLY valid JSON:
{
  "overallScore": number,
  "summary": "string",
  "perQuestion": [
    {
      "questionId": "string",
      "score": number,
      "feedback": "string"
    }
  ]
}
`;

    // Call Gemini
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const clean = raw.replace(/```json|```/g, "").trim();

    let evaluation: any;

    try {
      evaluation = JSON.parse(clean);
    } catch {
      evaluation = {
        overallScore: 5,
        summary: "Evaluation parse error.",
        perQuestion: [],
      };
    }

    // Save entire session in ONE ROW
    await db.insert(interviewSession).values({
      id: uuid(),
      candidateId,
      interviewId,
      answers,
      evaluation,
    });

    return NextResponse.json({ success: true, evaluation });
  } catch (err) {
    console.error("finish error:", err);
    return NextResponse.json(
      { error: "Failed to finish interview" },
      { status: 500 }
    );
  }
}
