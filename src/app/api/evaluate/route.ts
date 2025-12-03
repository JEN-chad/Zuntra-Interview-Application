import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/db";
import { interviewSession } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { candidateId, answers } = await req.json();

    if (!candidateId || !answers) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const prompt = `
You are an expert technical interviewer.

Evaluate the candidate's performance.

Return STRICT JSON ONLY in this structure:

{
  "overallScore": number (0-100),
  "verdict": "Recommended" | "Not Recommended" | "Needs Improvement",
  "summary": "short paragraph summary",

  "breakdown": {
    "enthusiasm_interest": { "score": number (0-20), "feedback": string },
    "communication": { "score": number (0-20), "feedback": string },
    "self_awareness": { "score": number (0-20), "feedback": string },
    "technical_ability": { "score": number (0-20), "feedback": string },
    "professionalism": { "score": number (0-20), "feedback": string }
  },

  "answerLevelFeedback": [
    {
      "question": "...",
      "answer": "...",
      "score": number (1-10),
      "feedback": "..."
    }
  ],

  "metadata": {
    "totalQuestions": number,
    "responsesReceived": number,
    "silenceAutoSubmits": number,
    "manualSkips": number,
    "interviewDate": "ISO timestamp"
  }
}

Candidate answers:
${JSON.stringify(answers, null, 2)}
`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);

    const raw = result.response.text();
    const clean = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (err) {
      console.error("JSON parse error:", raw);
      parsed = {
        overallScore: 50,
        verdict: "Needs Improvement",
        summary: "Evaluation failed, fallback applied.",
      };
    }

    // save to DB
    await db
      .update(interviewSession)
      .set({ evaluation: parsed })
      .where(eq(interviewSession.candidateId, candidateId));

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Evaluation error:", err);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
