"use client";

import { Building2, Clock, Info, Ban } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Briefcase, Loader2 } from "lucide-react";

const ExecutiveLoader = () => {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);

  const steps = [
    "Establishing secure connection...",
    "Verifying interview session...",
    "Loading job information...",
    "Preparing interview room...",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : p + 1));
    }, 50);

    const stepTimer = setInterval(
      () => setStep((p) => (p < steps.length - 1 ? p + 1 : p)),
      1200
    );

    return () => {
      clearInterval(timer);
      clearInterval(stepTimer);
    };
  }, []);

  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-6 animate-fade-in">
      <div className="relative flex items-center justify-center w-24 h-24">
        <svg className="transform -rotate-90 w-24 h-24">
          <circle
            className="text-slate-200"
            strokeWidth="4"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="48"
            cy="48"
          />
          <circle
            className="text-blue-600 transition-all duration-300 ease-out"
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="48"
            cy="48"
          />
        </svg>

        <div className="absolute text-blue-600">
          {progress === 100 ? (
            <CheckCircle2 size={26} />
          ) : (
            <Briefcase size={26} className="animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};

export default function InterviewUI() {
  const { id: interview_id } = useParams();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [expired, setExpired] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [step, setStep] = useState<"info" | "otp" | "instructions">("info");
  const [loading, setLoading] = useState(false);

  const [verificationId, setVerificationId] = useState("");

  useEffect(() => {
    if (!interview_id) return;

    async function load() {
      const res = await fetch(`/api/interview/${interview_id}`);
      const json = await res.json();

      setData(json);

      const now = new Date();
      const expiry = json.expiresAt ? new Date(json.expiresAt) : null;

      if (expiry && now > expiry) setExpired(true);
    }

    load();
  }, [interview_id]);

  async function startVerification() {
    if (!fullName || !email) {
      alert("Enter full name and email");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/candidate/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email,
        interviewId: interview_id,
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (!json.success) return alert(json.error);

    setVerificationId(json.verificationId);
    setStep("otp");
  }

  async function verifyOtp() {
    if (otp.length !== 6) {
      alert("Enter a 6 digit OTP");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/candidate/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email,
        otp,
        interviewId: interview_id,
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (!json.success) return alert(json.error);

    localStorage.setItem("candidateId", json.candidateId);

    setStep("instructions");
  }

  if (!data)
    return (
      <div className="h-screen flex justify-center items-center bg-gray-50">
        <ExecutiveLoader />
      </div>
    );

  if (expired)
    return (
      <div className="h-screen flex justify-center items-center">
        <p className="text-red-600 text-lg">Interview is expired.</p>
      </div>
    );

  return (
    <div className="h-screen flex justify-center items-center bg-gray-100 p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-semibold">{data.jobPosition}</h1>

        {/* onboarding flow */}
        {/* ... unchanged (same as your code) ... */}

      </div>
    </div>
  );
}
