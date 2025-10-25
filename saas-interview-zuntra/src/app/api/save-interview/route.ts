import { NextResponse } from "next/server";
import { db } from "@/db";
import { interview } from "@/db/schema";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      userId,
      userEmail,
      jobPosition,
      jobDescription,
      interviewDuration,
      interviewType,
      experienceLevel,
      questionList,
      resumeScore,
    } = body;

    // Basic validation
    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: "Missing required fields (userId or userEmail)" },
        { status: 400 }
      );
    }

    // Normalize `interviewType` (text[])
    const typeArray =
      Array.isArray(interviewType) && interviewType.length > 0
        ? interviewType.map((t) => String(t))
        : typeof interviewType === "string" && interviewType.trim() !== ""
        ? [interviewType.trim()]
        : null;

    // Normalize `questionList` (JSONB)
    const questionsJson =
      questionList && typeof questionList === "object"
        ? questionList
        : null;

    // Convert resumeScore to integer
    const resumeScoreInt =
      typeof resumeScore === "string"
        ? parseInt(resumeScore, 10)
        : typeof resumeScore === "number"
        ? resumeScore
        : null;

    // Insert interview record
    await db.insert(interview).values({
      id: uuidv4(),
      userId,
      userEmail,
      jobPosition: jobPosition ?? null,
      jobDescription: jobDescription ?? null,
      duration: interviewDuration ?? null, // use correct key
      type: typeArray,
      experienceLevel: experienceLevel ?? null,
      questionList: questionsJson,
      resumeScore: resumeScoreInt,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, message: "Interview saved!" });
  } catch (error: any) {
    console.error("❌ Error saving interview:", error);
    return NextResponse.json(
      { error: "Failed to save interview data." },
      { status: 500 }
    );
  }
}
