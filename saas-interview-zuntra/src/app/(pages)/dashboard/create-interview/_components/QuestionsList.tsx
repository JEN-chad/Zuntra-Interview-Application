"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface QuestionsListProps {
  formData: Record<string, any>;
}

// Type for expected API response
type QuestionGroups = Record<string, string[]>;

const QuestionsList: React.FC<QuestionsListProps> = ({ formData }) => {
  const [questions, setQuestions] = useState<QuestionGroups>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Fetch or regenerate AI interview questions
  const generateAiInterviewQuestions = useCallback(async () => {
    if (!formData) return;

    setLoading(true);
    setError(null);
    setQuestions({});

    try {
      const apiEndpoint = "/api/generate-questions";
      let response;

      // Handle file uploads
      if (formData.file) {
        const body = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            if (key === "file") {
              body.append(key, value);
            } else if (Array.isArray(value)) {
              body.append(key, JSON.stringify(value));
            } else {
              body.append(key, String(value));
            }
          }
        });

        response = await fetch(apiEndpoint, { method: "POST", body });
      } else {
        // JSON payload (no file)
        response = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error occurred" }));
        throw new Error(
          errorData.error || `Server responded with ${response.status}`
        );
      }

      const data = await response.json();

      if (data.questions && Object.keys(data.questions).length > 0) {
        setQuestions(data.questions);
        toast.success("✅ Questions generated successfully!");
      } else {
        toast.info("⚠️ No questions were generated.");
      }
    } catch (err: any) {
      console.error("AI Generation Error:", err);
      setError(err.message);
      toast.error(err.message || "Failed to generate questions.");
    } finally {
      setLoading(false);
    }
  }, [formData]);

  // ✅ Trigger question generation on formData change
  useEffect(() => {
    generateAiInterviewQuestions();
  }, [formData, generateAiInterviewQuestions]);

  // --- 🌀 Loading State ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-10 gap-4 mt-6">
        <Loader2 className="animate-spin text-blue-500" size={40} />
        <span className="text-lg font-medium text-gray-700">
          {
            formData.file ? "Processing your file..." : "Generating AI Interview Questions..."
          } 
        </span>
        <span className="text-sm text-gray-500">
          This may take a few moments.
        </span>
      </div>
    );
  }

  // --- ❌ Error State ---
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mt-6">
        <h3 className="font-bold">Error</h3>
        <p>{error}</p>
        <div className="mt-4">
          <Button
            variant="outline"
            onClick={generateAiInterviewQuestions}
            className="w-32"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // --- ⚠️ Empty State ---
  if (!loading && Object.keys(questions).length === 0) {
    return (
      <div className="text-center text-gray-500 p-10 mt-6 bg-white rounded-xl shadow-md border border-slate-200">
        No questions were generated.
      </div>
    );
  }

  // --- ✅ Success State ---
  return (
    <div className="w-full md:w-[95%] bg-white p-6 mt-6 rounded-xl shadow-md border border-slate-200 mx-auto md:mr-3 transition-all duration-300">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">
        Your Generated Questions
      </h2>

      <div className="flex flex-col gap-8">
        {Object.entries(questions).map(([type, questionList]) => (
          <div key={type} className="flex flex-col gap-3">
            <h3 className="text-xl font-semibold text-blue-600">
              {type} Questions
            </h3>
            <ul className="list-decimal list-inside flex flex-col gap-4 pl-3">
              {questionList.map((q, index) => (
                <li
                  key={index}
                  className="text-gray-800 text-base leading-relaxed"
                >
                  {q}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ✅ Action Buttons */}
      <div className="flex justify-between mt-10">
        <Button
          variant="outline"
          onClick={generateAiInterviewQuestions}
          disabled={loading}
          className="w-32"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-2" size={18} />
              Regenerating...
            </>
          ) : (
            "Regenerate"
          )}
        </Button>

        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white w-32"
          onClick={() => toast.info("Next step coming soon!")}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default QuestionsList;
