import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { interviewSession } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ============ STRONG JSON CLEANER ============
function cleanJSON(raw: string) {
  return raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/^[^{]*({[\s\S]*})[^}]*$/m, "$1") // extract ONLY inside first { }
    .replace(/\n/g, " ")                      // remove newlines
    .replace(/\r/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const { candidateId, answers } = await req.json();

    if (!candidateId || !answers) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Construct prompt
    const prompt = `
You are an advanced AI interview evaluator. Analyze the candidate’s performance based on the answers provided.

Your job is to produce a deep, structured evaluation that captures:
- Communication ability
- Clarity of thought
- Technical and analytical skill
- Professionalism
- Overall interview readiness

IMPORTANT — Return STRICT JSON ONLY.
No markdown, no commentary, no backticks.

FINAL JSON FORMAT:
{
  "overallScore": number,
  "verdict": string,
  "summary": string,
  "recommendation": {
    "isRecommended": boolean,
    "level": string,
    "reason": string
  },
  "breakdown": {
    "enthusiasm_interest": { "score": number, "feedback": string },
    "communication": { "score": number, "feedback": string },
    "self_awareness": { "score": number, "feedback": string },
    "technical_ability": { "score": number, "feedback": string },
    "professionalism": { "score": number, "feedback": string }
  },
  "combinedAnswerInsights": {
    "strengths": string,
    "weaknesses": string,
    "overallPatterns": string
  },
  "metadata": {
    "totalQuestions": number,
    "responsesReceived": number,
    "silenceAutoSubmits": number,
    "manualSkips": number,
    "interviewDate": string
  }
}

EVALUATION RULES:

1. **combinedAnswerInsights**
   - Instead of scoring each question individually, analyze all answers together.
   - Extract patterns such as:
     - recurring strengths
     - repeating weaknesses
     - mindset indicators
     - depth of thinking
     - communication style trends
     - technical or conceptual patterns

2. **breakdown section**
   - Provide a genuine, multi-sentence evaluation for each category.
   - Feedback should feel like a human interviewer's detailed notes.

3. **verdict rules**
   - "Strongly Recommended" → overallScore ≥ 85
   - "Recommended" → overallScore ≥ 70
   - "Neutral" → 50–69
   - "Not Recommended" → < 50
   - isRecommended = true only for the first two levels.

4. **summary**
   - A holistic narrative of the candidate’s performance.
   - Should read like a polished evaluator’s summary.

Candidate Answers:
${JSON.stringify(answers, null, 2)}
`;



    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);

    let text = result.response.text();
    let cleaned = cleanJSON(text);

    let parsed;

    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON parse error:", text);
      
      parsed = {
        summary: "Evaluation failed, fallback applied.",
        verdict: "Needs Improvement",
        overallScore: 50,
      };
    }

    // Save to database
    await db
      .update(interviewSession)
      .set({ evaluation: parsed })
      .where(eq(interviewSession.candidateId, candidateId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Evaluation API Error:", err);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}