"use client";

import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Phone, Video, Sparkles, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

const CreateOptions = () => {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {/* VIDEO INTERVIEW - PRIMARY ACTION */}
      <Card
        onClick={() => router.push("/dashboard/create-interview")}
        className="group relative overflow-hidden p-6 cursor-pointer rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-300/50"
      >
        {/* Subtle Background Hover Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative flex items-start gap-5">
          {/* Icon Container - Solid Blue for Primary Emphasis */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-200 group-hover:scale-105 transition-transform duration-300">
            <Video className="h-6 w-6" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                Create AI Interview
              </CardTitle>
              {/* Badge */}
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-100">
                <Sparkles className="mr-1 h-3 w-3" />
                AI Powered
              </span>
            </div>
            <CardDescription className="text-slate-500 text-sm leading-relaxed">
              Generate smart, AI-driven interview sessions and assign them to candidates instantly.
            </CardDescription>
          </div>

          {/* Arrow Indicator */}
          <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" />
        </div>
      </Card>

      {/* PHONE SCREENING - SECONDARY ACTION */}
      <Card
        className="group relative overflow-hidden p-6 cursor-pointer rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:border-indigo-300/50"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative flex items-start gap-5">
          {/* Icon Container - Light Style that fills on hover */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
            <Phone className="h-6 w-6" />
          </div>

          <div className="flex-1 space-y-1.5">
            <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
              Schedule Phone Screening
            </CardTitle>
            <CardDescription className="text-slate-500 text-sm leading-relaxed">
              Organize and schedule manual phone screening calls with candidates seamlessly.
            </CardDescription>
          </div>

           <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all duration-300" />
        </div>
      </Card>
    </div>
  );
};

export default CreateOptions;