"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/* -----------------------------
   Main Feedback Page
------------------------------*/
export default function FeedbackPage() {
  const router = useRouter();
  const { interview_id, feedback_id } = useParams();

  const [data, setData] = useState<any>(null);
  const [interview, setInterview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* ------------ 1. Fetch feedback ------------ */
  useEffect(() => {
    async function loadFeedback() {
      try {
        const res = await fetch(`/api/feedback/${feedback_id}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        setData({ error: "Fetch failed" });
      }
    }
    loadFeedback();
  }, [feedback_id]);

  /* ------------ 2. Fetch interview (to get cutoff) ------------ */
  useEffect(() => {
    async function loadInterview() {
      try {
        const res = await fetch(`/api/interview/${interview_id}`);
        const json = await res.json();
        setInterview(json);
      } finally {
        setLoading(false);
      }
    }
    loadInterview();
  }, [interview_id]);

  if (loading || !data || !interview) {
    return (
      <div className="flex justify-center items-center min-h-[50vh] text-lg font-medium">
        Loading…
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="text-center text-red-600 font-semibold p-10">
        Feedback not found.
      </div>
    );
  }

  /* ------------ Normalize Score Values ------------ */
  const normalize = (val: any) => {
    if (!val) return 0;
    if (val > 0 && val <= 1) return Math.round(val * 100);
    return Math.round(val);
  };

  const report = data.fullReport || {};

  const overall = normalize(data.overallScore ?? report.overallScore);
  const tone = normalize(data.toneStyleScore ?? report.toneStyle?.score);
  const content = normalize(data.contentScore ?? report.content?.score);
  const structure = normalize(data.structureScore ?? report.structure?.score);
  const skills = normalize(data.skillsScore ?? report.skills?.score);
  const ats = normalize(data.atsScore ?? report.ats?.score);

  const cutoff = interview.resumeScore ?? 0;
  const didPass = ats >= cutoff;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10">
      {/* Title */}
      <header>
        <h1 className="text-3xl font-extrabold">Resume Review</h1>
        <p className="text-gray-500 text-sm mt-1">
          Here’s an AI-driven breakdown of your resume.
        </p>
      </header>

      {/* Score Overview Card */}
      <div className="bg-white rounded-xl p-8 shadow border flex flex-col md:flex-row items-center gap-8">
        <ScoreCircle value={overall} />

        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-2">Your Resume Score</h2>

          <p className="text-sm text-gray-500 mb-4">
            Based on tone, content, structure, skills & ATS compatibility.
          </p>

          {/* Mini score blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MiniScore label="Tone & Style" value={tone} />
            <MiniScore label="Content" value={content} />
            <MiniScore label="Structure" value={structure} />
            <MiniScore label="Skills" value={skills} />
            <MiniScore label="ATS Score" value={ats} />
          </div>
        </div>
      </div>

      {/* ATS Section */}
      <ATSSection score={ats} keywords={report.ats?.recommendedKeywords || []} />

      {/* Detailed collapsible sections */}
      <div className="space-y-4">
        <Collapsible title="Tone & Style" score={tone} data={report.toneStyle} />
        <Collapsible title="Content" score={content} data={report.content} />
        <Collapsible title="Structure" score={structure} data={report.structure} />
        <Collapsible title="Skills" score={skills} data={report.skills} />
      </div>

      {/* PASS / FAIL CARD */}
      <div className="bg-white border rounded-xl p-6 shadow-md mt-10 space-y-4">
        {didPass ? (
          <>
            <p className="text-green-600 font-bold text-lg">
              🎉 Congratulations! You passed the resume screening.
            </p>

            <button
              className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
              onClick={() =>
                router.push(`/interview/${interview_id}/start`)
              }
            >
              Start Interview →
            </button>
          </>
        ) : (
          <>
            <p className="text-red-600 font-bold text-lg">
              ❌ Better luck next time — your ATS score did not meet the cutoff.
            </p>

            <button
              disabled
              className="px-6 py-3 rounded-lg bg-gray-400 text-white cursor-not-allowed"
            >
              Start Interview →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* -----------------------------
   Components
------------------------------*/

// Circular Score Dial
function ScoreCircle({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const radius = 54;
  const stroke = 10;
  const r = radius - stroke / 2;
  const circ = r * 2 * Math.PI;
  const offset = circ - (pct / 100) * circ;

  const color = pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <svg height="130" width="130">
      <circle
        stroke="#e5e7eb"
        fill="transparent"
        strokeWidth={stroke}
        r={r}
        cx="65"
        cy="65"
      />
      <circle
        stroke={color}
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={offset}
        r={r}
        cx="65"
        cy="65"
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-bold text-xl fill-gray-900"
      >
        {pct}
      </text>
      <text
        x="50%"
        y="65%"
        textAnchor="middle"
        className="fill-gray-400 text-xs"
      >
        /100
      </text>
    </svg>
  );
}

function MiniScore({ label, value }: any) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border flex justify-between items-center">
      <div className="text-sm font-medium">{label}</div>
      <div className="font-semibold">{value}/100</div>
    </div>
  );
}

function ATSSection({ score, keywords }: any) {
  return (
    <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl">
      <h3 className="text-xl font-semibold mb-1">ATS Score — {score}/100</h3>
      <p className="text-sm text-gray-600">
        Applicant Tracking System compatibility suggestions.
      </p>

      <div className="flex flex-wrap gap-2 mt-3">
        {keywords.map((k: any, i: number) => (
          <span
            key={i}
            className="px-3 py-1 bg-white rounded-full border text-sm text-gray-700"
          >
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

function Collapsible({ title, score, data }: any) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border rounded-lg bg-white shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex justify-between items-center text-left"
      >
        <span className="font-semibold">
          {title} — {score}/100
        </span>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-6 pb-6 pt-2 space-y-4">
          <div>
            <h4 className="font-medium mb-1">Strengths</h4>
            <ul className="list-disc ml-5 text-sm space-y-1">
              {data?.strengths?.length
                ? data.strengths.map((s: any, i: number) => <li key={i}>{s}</li>)
                : <li className="text-gray-400">None provided</li>}
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-1">Improvements</h4>
            <ul className="list-disc ml-5 text-sm space-y-1">
              {data?.improvements?.length
                ? data.improvements.map((s: any, i: number) => (
                    <li key={i}>{s}</li>
                  ))
                : <li className="text-gray-400">None provided</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
