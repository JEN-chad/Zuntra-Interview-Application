"use client";

import { useState, ChangeEvent, useRef, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Assuming this is an array of { title: string, icon: ComponentType }
import { InterviewType } from "@/services/Constants"; 
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, X } from "lucide-react";
import { toast } from "sonner";

const FormContainer = () => {
  const [jobPosition, setJobPosition] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [interviewType, setInterviewType] = useState<string>(""); // State for type
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Loading state
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes: string[] = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
      ];

      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error("Invalid file type. Only PDF or Word files are allowed.");
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // Reset file input
        }
        return;
      }

      setFile(selectedFile);
      toast.success(`File "${selectedFile.name}" uploaded successfully.`);
    } else {
      setFile(null);
    }
  };

  const handleRemoveFile = (): void => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input using ref
    }
    toast("File removed.");
  };

  /**
   * This is the full handleSubmit function you requested.
   * It validates all fields and sends them to the correct API endpoint.
   */
const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
  e.preventDefault(); // Prevent default form submission
  if (isLoading) return; // Prevent multiple submissions

  // --- 1. Validation ---
  if (!jobPosition.trim()) {
    toast.error("Job Position is required.");
    return;
  }
  if (!jobDescription.trim()) {
    toast.error("Job Description is required.");
    return;
  }
  if (!duration) {
    toast.error("Interview Duration is required.");
    return;
  }
  if (!interviewType) {
    toast.error("Interview Type is required.");
    return;
  }

  setIsLoading(true);
  const loadingToastId = toast.loading(
    file ? "Parsing file and extracting questions..." : "Generating interview questions..."
  );

  try {
    let questions: string[];

    if (file) {
      // --- 2. Path 1: Parse File ---
      const formData = new FormData();
      formData.append("file", file);
      formData.append("jobPosition", jobPosition);
      formData.append("jobDescription", jobDescription);
      formData.append("duration", duration);
      formData.append("interviewType", interviewType);

      const res = await fetch("/api/parse-file", {
        method: "POST",
        body: formData,
      });

      const text = await res.text(); // read raw response
      let data: any;
      try {
        data = JSON.parse(text); // attempt JSON parsing
      } catch (parseError) {
        console.error("Failed to parse JSON from /api/parse-file:", text);
        throw new Error("Server returned an invalid response");
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to process file");
      }

      questions = data.questions;
      toast.success("Questions extracted successfully!");
    } else {
      // --- 3. Path 2: Generate Questions ---
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobPosition, jobDescription, duration, interviewType }),
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error("Failed to parse JSON from /api/generate-questions:", text);
        throw new Error("Server returned an invalid response");
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to generate questions");
      }

      questions = data.questions;
      toast.success("Questions generated successfully!");
    }

    console.log("Final Questions:", questions);
  } catch (err) {
    console.error(err);
    toast.error(err instanceof Error ? err.message : "An unknown error occurred. Try again.");
  } finally {
    setIsLoading(false);
    toast.dismiss(loadingToastId);
  }
};

  return (
    <form // Changed to <form> element
      onSubmit={handleSubmit} // Added onSubmit
      className="
        w-full md:w-[95%]
        bg-white 
        p-6 mt-6
        rounded-xl shadow-md border border-slate-200
        mx-auto md:mr-3
        transition-all duration-300
      "
    >
      {/* Job Position */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">
          Job Position
        </label>
        <Input
          placeholder="e.g. Full Stack Developer"
          value={jobPosition}
          onChange={(e) => onHandleInputChange("jobPosition", e.target.value)}
          disabled={isLoading}
        />
      </div>

      {/* Job Description */}
      <div className="flex flex-col gap-2 mt-5">
        <label className="text-sm font-medium text-gray-700">
          Job Description
        </label>
        <Textarea
          placeholder="Enter details of the job description"
          className="h-[200px]"
          value={jobDescription}
          onChange={(e) => onHandleInputChange("jobDescription", e.target.value)}
          disabled={isLoading}
        />
      </div>

      {/* Interview Duration */}
      <div className="flex flex-col gap-2 mt-5">
        <label className="text-sm font-medium text-gray-700">
          Interview Duration
        </label>
        <Select
          onValueChange={(value: string) => onHandleInputChange("interviewDuration", value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Duration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5 Min">5 Min</SelectItem>
            <SelectItem value="15 Min">15 Min</SelectItem>
            <SelectItem value="30 Min">30 Min</SelectItem>
            <SelectItem value="45 Min">45 Min</SelectItem>
            <SelectItem value="60 Min">60 Min</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Interview Type */}
      <div className="flex flex-col gap-3 mt-5">
        <label className="text-sm font-medium text-gray-700">
          Interview Type
        </label>
        <div className="flex gap-3 flex-wrap">
          {InterviewType.map((type: any, index: number) => (
            <div
              key={index}
              onClick={() => !isLoading && setInterviewType(type.title)} // Added onClick
              className={`
                flex gap-2 items-center rounded-2xl p-1 px-2 transition-all
                ${isLoading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                ${
                  interviewType === type.title
                    ? "bg-blue-600 text-white" // Active state
                    : "bg-blue-50 border border-gray-200 hover:bg-blue-100"
                }
              `}
            >
              <type.icon size={20} />
              <span className="text-sm">{type.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* File Upload */}
      <div className="flex flex-col gap-2 mt-5">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          Upload Questions (Optional)
        </label>
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            ref={fileInputRef} // Added ref
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            disabled={isLoading}
            className="cursor-pointer w-fit"
          />

          {file && (
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-lg border border-gray-200 shadow-sm">
              <span className="text-sm text-gray-700 truncate max-w-[180px]">
                {file.name}
              </span>
              <button
                type="button" // Set type to prevent form submission
                onClick={handleRemoveFile}
                disabled={isLoading}
                className="text-red-500 hover:text-red-700 disabled:opacity-50"
                title="Remove file"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="mt-7 flex justify-end">
        <Button
          type="submit" // Set button type to submit
          className="flex gap-2 items-center min-w-[180px]" // Added min-width
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Processing...
            </>
          ) : (
            <>
              {file ? "Review Questions" : "Generate Questions"} <ArrowRight />
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default FormContainer;