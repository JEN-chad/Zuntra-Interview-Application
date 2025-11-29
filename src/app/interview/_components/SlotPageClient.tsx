"use client";

import React, { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import SlotPicker from "../../(pages)/dashboard/create-interview/_components/SlotPicker";

export default function SlotPageClient({ interviewId }: { interviewId: string }) {
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCandidateId(localStorage.getItem("candidateId"));
  }, []);

  if (!mounted) return null;

  if (!candidateId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
          <div className="mx-auto w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mb-6">
            <ShieldAlert className="w-7 h-7 text-amber-600" />
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Authentication Required
          </h3>

          <p className="text-slate-500 text-sm mb-6">
            Please verify your email to proceed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-10">

        <SlotPicker interviewId={interviewId} candidateId={candidateId} />
      </div>
    </div>
  );
}
