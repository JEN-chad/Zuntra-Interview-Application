"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  RefreshCcw,
  ArrowRight,
  Target,
  Copy,
  Check,
  Code2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ExecutiveLoader } from "./ExecutiveLoader";


interface SessionUser {
  id: string;
  email: string;
  name?: string;
}

interface Session {
  user: SessionUser;
}

interface QuestionItem {
  question: string;
  type: string;
}

interface QuestionsListProps {
  formData: Record<string, any>;
  session: Session;
  onCreateLink: (interviewId: string) => void;
}

const QuestionsList: React.FC<QuestionsListProps> = ({
  formData,
  session,
  onCreateLink,
}) => {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateAiInterviewQuestions = useCallback(async () => {
    if (!formData || Object.keys(formData).length === 0) return;

    setLoading(true);
    setError(null);
    setQuestions([]);

    try {
      const apiEndpoint = "/api/generate-questions";
      let response: Response;

      if (formData.file) {
        const body = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
          if (value == null) return;
          if (key === "file") body.append(key, value);
          else if (Array.isArray(value)) body.append(key, JSON.stringify(value));
          else body.append(key, String(value));
        });

        response = await fetch(apiEndpoint, { method: "POST", body });
      } else {
        response = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error (${response.status})`);
      }

      const data = await response.json();

      if (Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
        toast.success("✅ Questions generated successfully!");
      } else {
        toast.info("⚠️ No questions were generated.");
      }
    } catch (err: any) {
      console.error("AI Generation Error:", err);
      setError(err.message || "Failed to generate questions.");
      toast.error(err.message || "Failed to generate questions.");
    } finally {
      setLoading(false);
    }
  }, [formData, session]);

  useEffect(() => {
    if (Object.keys(formData).length > 0 && !loading) {
      generateAiInterviewQuestions();
    }
  }, [formData, generateAiInterviewQuestions]);

  const handleFinish = async () => {
    if (loading) return;

    if (!session?.user?.id || !session?.user?.email) {
      toast.error("User not authenticated.");
      return;
    }

    if (questions.length === 0) {
      toast.info("Generate questions before saving.");
      return;
    }

    try {
      setLoading(true);

      const normalizedType =
        Array.isArray(formData.type) && formData.type.length > 0
          ? formData.type.map((t: any) => String(t))
          : formData.type
          ? [String(formData.type)]
          : [];

      const payload = {
        ...formData,
        type: normalizedType,
        userId: session.user.id,
        userEmail: session.user.email,
        questionList: questions,
        resumeScore: formData.resumeScore || null,
      };

      const res = await fetch("/api/save-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to save interview.");

      const interviewId = data.interviewId;

      if (interviewId) {
        toast.success("✅ Interview saved successfully!");
        onCreateLink(interviewId);
      } else {
        toast.info("Interview saved but ID missing.");
      }
    } catch (err: any) {
      console.error("Save interview error:", err);
      toast.error(err.message || "Failed to save interview.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // 🔵 Loading UI (Styled)
  if (loading) {
    return (
    <div className="w-full bg-white rounded-xl shadow-md border border-slate-200 mt-6">
      <ExecutiveLoader active={true} />
    </div>

    );
  }

  // ❌ Error UI (Styled)
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-8 rounded-2xl mt-6 shadow-sm text-red-700">
        <h3 className="text-lg font-semibold">Error Occurred</h3>
        <p className="text-sm mt-1">{error}</p>

        <Button
          variant="outline"
          onClick={generateAiInterviewQuestions}
          className="mt-4 flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-100"
        >
          <RefreshCcw size={16} /> Try Again
        </Button>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="p-10 text-center bg-white rounded-2xl mt-6 border shadow-sm text-gray-500">
        No questions were generated yet.
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mt-6">
      
      {/* Header */}
      <div className="px-8 py-6 border-b bg-slate-50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shadow-sm">
            <Target size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Your Generated Questions
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              Review and finalize your interview set
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold px-3 py-1 bg-slate-200 text-slate-600 rounded-full">
          {questions.length} Questions
        </span>
      </div>

      {/* Question List */}
      <div className="p-8 space-y-4">
        {questions.map((item, idx) => (
          <div
            key={idx}
            className="group relative p-5 border border-slate-200 rounded-xl bg-white hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 space-y-3">
                <h3 className="text-base font-medium text-slate-800 group-hover:text-blue-900 transition-colors">
                  {item.question}
                </h3>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-wide">
                  <Code2 size={12} />
                  {item.type}
                </span>
              </div>

              <button
                onClick={() => handleCopy(item.question, idx)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                {copiedIndex === idx ? (
                  <Check size={16} className="text-green-500" />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-slate-50 border-t flex justify-between flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          disabled={loading}
          onClick={generateAiInterviewQuestions}
          className="flex items-center gap-2 border-slate-300 text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:bg-white"
        >
          <RefreshCcw
            size={16}
            className="group-hover:rotate-180 transition-transform duration-500"
          />
          Regenerate
        </Button>

        <Button
          onClick={handleFinish}
          disabled={loading}
          className="bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-2 shadow-md"
        >
          Finish & Generate Link <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
};

export default QuestionsList;
