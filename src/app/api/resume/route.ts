export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { feedback, resumeQuestions } from "@/db/schema";
import { randomUUID } from "crypto";
import { VertexAI } from "@google-cloud/vertexai";
import PDFParser from "pdf2json";

// ------------ PDF to TEXT ------------
async function extractPdfText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (err: any) =>
      reject(err?.parserError ?? err)
    );

    pdfParser.on("pdfParser_dataReady", (data: any) => {
      let text = "";
      data.Pages.forEach((page: any) => {
        page.Texts.forEach((t: any) => {
          t.R.forEach((r: any) => {
            text += decodeURIComponent(r.T) + " ";
          });
        });
      });
      resolve(text);
    });

    pdfParser.parseBuffer(buffer);
  });
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const interviewId = form.get("interviewId") as string | null;
    const candidateIdRaw = form.get("candidateId") as string | null;
    const file = form.get("resume") as File | null;

    const candidateId = candidateIdRaw?.trim();

    // Validate IDs
    if (!candidateId) {
      return NextResponse.json(
        { error: "Missing candidateId" },
        { status: 400 }
      );
    }

    if (!interviewId) {
      return NextResponse.json(
        { error: "Missing interviewId" },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: "Resume file missing" },
        { status: 400 }
      );
    }

    // Convert PDF → text
    const buffer = Buffer.from(await file.arrayBuffer());
    const resumeText = await extractPdfText(buffer);

    // Fetch interview
    const job = await db.query.interview.findFirst({
      where: (i, { eq }) => eq(i.id, interviewId),
    });

    if (!job) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    // ------------ AI PROMPT ------------
    const prompt = `
Return ONLY JSON strictly like this:

{
  "overallScore": 0.0,
  "toneStyle": { "score": 0.0, "strengths": [], "improvements": [] },
  "content": { "score": 0.0, "strengths": [], "improvements": [] },
  "structure": { "score": 0.0, "strengths": [], "improvements": [] },
  "skills": { "score": 0.0, "strengths": [], "improvements": [] },
  "ats": { "score": 0.0, "recommendedKeywords": [] }
}

Scores MUST be between 0.0 and 1.0.

Job Description:
${job.jobDescription}

Resume:
${resumeText}
`;

    const vertex = new VertexAI({
      project: process.env.GCP_PROJECT_ID!,
      location: "us-central1",
    });

    const model = vertex.getGenerativeModel({
      model: "models/gemini-2.0-flash",
    });

    const aiResult = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    let raw = aiResult.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    raw = raw?.replace(/```json/gi, "").replace(/```/g, "").trim();

    let json: any = {};
    try {
      json = JSON.parse(raw);
    } catch (err) {
      console.log("JSON Parse Error:", raw);
      return NextResponse.json(
        { error: "Gemini returned invalid JSON", raw },
        { status: 500 }
      );
    }

    // ------------ Generate 5 Questions ------------
    const questionPrompt = `
Generate EXACTLY 5 interview questions based on this resume.
Return ONLY a JSON array.

Resume:
${resumeText}
`;

    const questionResult = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: questionPrompt }] }],
    });

    let qRaw =
      questionResult.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    qRaw = qRaw.replace(/```json/gi, "").replace(/```/g, "").trim();

    let parsedQuestions: string[] = [];
    try {
      parsedQuestions = JSON.parse(qRaw);
    } catch (err) {
      console.log("Question JSON Parse Error:", qRaw);
      parsedQuestions = [];
    }

    // ------------ SAVE QUESTIONS (FIXED) ------------
    await db.insert(resumeQuestions).values({
      id: randomUUID(),
      candidateId: candidateId!,   // FIXED
      interviewId: interviewId!,   // FIXED
      questions: parsedQuestions,
    });

    // ------------ FIX SCORE SCALING ------------
    const scale = (n: number) => Math.round(Number(n) * 100);

    const feedbackId = randomUUID();

    await db.insert(feedback).values({
      id: feedbackId,
      candidateId: candidateId!,  // FIXED
      interviewId: interviewId!,  // FIXED
      overallScore: scale(json.overallScore),
      toneStyleScore: scale(json.toneStyle.score),
      contentScore: scale(json.content.score),
      structureScore: scale(json.structure.score),
      skillsScore: scale(json.skills.score),
      atsScore: scale(json.ats.score ?? 0),
      fullReport: json,
    });

    return NextResponse.json({
      success: true,
      feedbackId,
    });
  } catch (err) {
    console.log("Resume API Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
