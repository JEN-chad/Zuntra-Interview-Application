export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { feedback, resumeQuestions } from "@/db/schema";
import { randomUUID } from "crypto";
import { VertexAI } from "@google-cloud/vertexai";
import PDFParser from "pdf2json";

// ------------ SAFE PDF to TEXT ------------
async function extractPdfText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (err: any) =>
      reject(err?.parserError ?? err)
    );

    pdfParser.on("pdfParser_dataReady", (data: any) => {
      let text = "";

      const safeDecode = (str: string) => {
        try {
          if (/%[0-9A-Fa-f]{2}/.test(str)) {
            return decodeURIComponent(str);
          }
        } catch {
          return str;
        }
        return str;
      };

      data.Pages.forEach((page: any) => {
        page.Texts.forEach((t: any) => {
          t.R.forEach((r: any) => {
            text += safeDecode(r.T) + " ";
          });
        });
      });

      resolve(text.trim());
    });

    pdfParser.parseBuffer(buffer);
  });
}

// ------------ CLEAN JSON ------------
function cleanJSON(str: string) {
  return str
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/\n/g, " ")
    .trim();
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const interviewId = form.get("interviewId") as string | null;
    const candidateIdRaw = form.get("candidateId") as string | null;
    const file = form.get("resume") as File | null;

    const candidateId = candidateIdRaw?.trim();

    // Validate
    if (!candidateId)
      return NextResponse.json({ error: "Missing candidateId" }, { status: 400 });

    if (!interviewId)
      return NextResponse.json({ error: "Missing interviewId" }, { status: 400 });

    if (!file)
      return NextResponse.json({ error: "Resume file missing" }, { status: 400 });

    // Extract Resume Text Safely
    const buffer = Buffer.from(await file.arrayBuffer());
    let resumeText = await extractPdfText(buffer);

    if (!resumeText || resumeText.length < 10) {
      resumeText = "Resume parsing failed or text is empty.";
    }

    // Fetch Job Description
    const job = await db.query.interview.findFirst({
      where: (i, { eq }) => eq(i.id, interviewId),
    });

    if (!job) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // ------------ SINGLE AI CALL ------------
    const prompt = `
You are an expert resume evaluator and technical interviewer.

Return ONLY valid JSON in the EXACT STRUCTURE below:

{
  "evaluation": {
    "overallScore": 0.0,
    "toneStyle": { "score": 0.0, "strengths": [], "improvements": [] },
    "content": { "score": 0.0, "strengths": [], "improvements": [] },
    "structure": { "score": 0.0, "strengths": [], "improvements": [] },
    "skills": { "score": 0.0, "strengths": [], "improvements": [] },
    "ats": { "score": 0.0, "recommendedKeywords": [] }
  },
  "questions": [
    { "question": "" }
  ]
}

Rules:
- ONLY JSON. No markdown. No explanations.
- evaluation = exactly the structure above, scores 0.0–1.0.
- questions MUST BE EXACTLY 5 objects.
- Each object MUST be: { "question": "..." }
- Questions must be personalized based on resume & job description.

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

    let raw = cleanJSON(
      aiResult.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}"
    );

    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.log("JSON Parse Error:", raw);
      return NextResponse.json(
        { error: "Gemini returned invalid JSON", raw },
        { status: 500 }
      );
    }

    // Extract evaluation + questions
    const json = parsed.evaluation;
    const parsedQuestions = Array.isArray(parsed.questions)
      ? parsed.questions
      : [];

    // ------------ SAVE QUESTIONS ------------
    await db.insert(resumeQuestions).values({
      id: randomUUID(),
      candidateId: candidateId!,
      interviewId: interviewId!,
      questions: parsedQuestions,
    });

    // ------------ SAVE FEEDBACK ------------
    const scale = (n: number) => Math.round(Number(n) * 100);

    const feedbackId = randomUUID();

    await db.insert(feedback).values({
      id: feedbackId,
      candidateId: candidateId!,
      interviewId: interviewId!,
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
