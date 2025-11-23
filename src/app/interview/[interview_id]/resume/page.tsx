"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadCloud } from "lucide-react";

export default function ResumePage() {
  const { interview_id } = useParams();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // -------------------------------
  // ✔ Route Protection
  // -------------------------------
  useEffect(() => {
    const verifiedCandidate = localStorage.getItem("candidateId");
    if (!verifiedCandidate && interview_id) {
      router.replace(`/interview/${interview_id}`);
    }
  }, [interview_id, router]);

  // -------------------------------
  // ✔ Load Interview Data
  // -------------------------------
  useEffect(() => {
    if (!interview_id) return;

    async function load() {
      try {
        const res = await fetch(`/api/interview/${interview_id}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.log(err);
      }
    }

    load();
  }, [interview_id]);

  if (!data)
    return (
      <div className="min-h-screen flex justify-center items-center p-6 bg-gray-50">
        <Card className="w-full max-w-3xl p-8 rounded-2xl shadow-xl bg-white">
          <CardHeader>
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );

  // -------------------------------
  // ✔ Submit Resume (FIXED)
  // -------------------------------
  async function submitResume() {
    if (!file) return alert("Upload a resume first.");

    setLoading(true);

    try {
      // ⛔ DO NOT CREATE A NEW CANDIDATE AGAIN
      const candidateId = localStorage.getItem("candidateId");

      if (!candidateId) {
        setLoading(false);
        return alert("Candidate not verified. Please complete verification.");
      }

      // Build form data
      const form = new FormData();
      form.append("resume", file);
      form.append("interviewId", data.id);
      form.append("candidateId", candidateId);

      // Upload resume + generate feedback
      const res = await fetch("/api/resume", {
        method: "POST",
        body: form,
      });

      setLoading(false);

      if (!res.ok) {
        return alert("Resume analysis failed.");
      }

      const js = await res.json();
      router.push(`/interview/${data.id}/feedback/${js.feedbackId}`);

    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Unexpected error.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-start p-8">
      <Card className="w-full max-w-3xl rounded-2xl shadow-lg bg-white border border-gray-200 p-6">
        <CardHeader className="pb-6 border-b">
          <CardTitle className="text-3xl font-semibold text-gray-900">
            Resume Analysis
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Optimize your hiring process with AI-driven insights. Match resumes
            to job descriptions instantly.
          </p>
        </CardHeader>

        <CardContent className="space-y-10 pt-6">
          {/* Step 1 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Job Details <span className="text-xs text-gray-500">• Step 1 of 2</span>
            </h3>

            <div className="space-y-2">
              <Label className="text-sm text-gray-700">Job Title</Label>
              <Input
                disabled
                value={data.jobPosition}
                className="bg-gray-100 border-gray-200 rounded-xl shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-700">Job Description</Label>
              <Textarea
                disabled
                rows={6}
                value={data.jobDescription}
                className="bg-gray-100 border-gray-200 rounded-xl shadow-sm resize-none"
              />
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Candidate Resume <span className="text-xs text-gray-500">• Step 2 of 2</span>
            </h3>

            {/* Upload Box */}
            <div
              className="relative border-2 border-dashed border-gray-300 rounded-2xl p-10 bg-gray-50 hover:bg-gray-100 transition-all duration-300 flex flex-col items-center gap-3 text-center cursor-pointer"
              onClick={() =>
                document.getElementById("resumeUploadInput")?.click()
              }
            >
              <UploadCloud className="w-10 h-10 text-gray-600" />

              <p className="text-gray-800 text-sm font-medium">
                {file ? file.name : "Click to upload or drag & drop"}
              </p>

              <p className="text-xs text-gray-500">PDF or DOCX up to 10MB</p>

              <Input
                id="resumeUploadInput"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx"
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Start Button */}
          <Button
            className="w-full h-12 rounded-xl bg-blue-600 text-white font-semibold text-base shadow-md hover:bg-blue-700 transition-all duration-200"
            disabled={loading}
            onClick={submitResume}
          >
            {loading ? "Analyzing…" : "Start Analysis →"}
          </Button>

          <p className="text-center text-xs text-gray-500 -mt-2">
            By clicking Start, you agree to process data securely.
          </p>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 max-w-xl mx-auto">
            <div className="flex items-center gap-2 bg-white border px-4 py-3 rounded-xl shadow-sm hover:shadow transition">
              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-green-100 text-green-600 text-sm">
                ✓
              </div>
              <p className="text-sm font-medium text-gray-700">95% Match Accuracy</p>
            </div>

            <div className="flex items-center gap-2 bg-white border px-4 py-3 rounded-xl shadow-sm hover:shadow transition">
              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 text-sm">
                ✦
              </div>
              <p className="text-sm font-medium text-gray-700">AI-Powered Insights</p>
            </div>

            <div className="flex items-center gap-2 bg-white border px-4 py-3 rounded-xl shadow-sm hover:shadow transition">
              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm">
                📄
              </div>
              <p className="text-sm font-medium text-gray-700">Multi-format Support</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
