"use client";

import { Building2, Clock } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function InterviewUI() {
  const { interview_id } = useParams();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!interview_id) return;

    async function load() {
      try {
        const res = await fetch(`/api/interview/${interview_id}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.log("Error loading interview:", e);
      }
    }

    load();
  }, [interview_id]);

  if (!data)
    return (
      <div className="h-screen flex flex-col justify-center items-center text-gray-700 text-sm gap-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-blue-600">Loading interview…</p>
      </div>
    );

  return (
    <div className="h-screen flex justify-center items-center bg-gray-100 p-4 overflow-hidden">
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-2xl p-6 border flex flex-row items-center gap-6">

        {/* LEFT SIDE — SAME AS REFERENCE */}
        <div className="flex-1 flex flex-col justify-center items-center text-center p-4 border-r border-gray-200">
          <Image
            src="/logo.png"
            width={200}
            height={100}
            alt="Logo"
            className="w-[100px] mx-auto"
          />
          <p className="text-gray-500 text-sm mt-1">AI-Powered Interview Platform</p>

          <Image
            src="/interview.png"
            width={500}
            height={500}
            alt="Interview Illustration"
            className="w-[280px] mt-4"
          />
        </div>

        {/* RIGHT SIDE */}
        <div className="flex-1 p-6 flex flex-col justify-center">
          <h2 className="text-lg font-semibold">{data.jobPosition}</h2>

          <div className="flex items-center gap-4 text-gray-500 text-xs mt-2">
            <span>
              <Building2 className="inline w-3.5 h-3.5 mr-1" />
              {data.company || "Zuntra"}
            </span>

            <span>
              <Clock className="inline w-3.5 h-3.5 mr-1" />
              {data.duration || "30 Minutes"}
            </span>
          </div>

          {/* NAME INPUT */}
          <div className="text-left mt-4">
            <label className="text-xs font-medium">Enter your full name</label>
            <input
              type="text"
              placeholder="e.g., John Smith"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-blue-500"
            />
          </div>

          {/* EMAIL INPUT */}
          <div className="text-left mt-3">
            <label className="text-xs font-medium">Enter your email address</label>
            <input
              type="email"
              placeholder="e.g., john@example.com"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-blue-500"
            />
          </div>

          {/* INFO BOX */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4 text-left text-xs">
            <p className="font-semibold text-blue-600 mb-1">Before you begin</p>
            <ul className="list-disc ml-4 space-y-1 text-gray-700">
              <li>Ensure you have a stable internet connection</li>
              <li>Test your camera and microphone</li>
              <li>Find a quiet place for the interview</li>
            </ul>
          </div>

          {/* NEXT STEP BUTTON (replaces both old buttons) */}
          <button className="w-full bg-blue-600 text-white py-2.5 rounded-lg mt-5 font-medium hover:bg-blue-700 transition text-sm">
            Next Step →
          </button>
        </div>
      </div>
    </div>
  );
}
