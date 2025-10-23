"use client";

import { Progress } from "@/components/ui/progress";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import FormContainer from "./_components/FormContainer";
import QuestionsList from "./_components/QuestionsList";

const CreateInterview = () => {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);

  // ✅ Initialize formData to avoid undefined issues
  const [formData, setFormData] = useState<Record<string, any>>({});

  // ✅ Handle form input changes
  const onHandleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    console.log({ ...formData, [field]: value });
  };

  // ✅ Handle Back Arrow Click
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1); // Go back to the previous step (e.g., from Questions → Form)
    } else {
      router.push("/dashboard"); // Optional: go back to dashboard if already on first step
    }
  };

  return (
    <div className="md:ml-2 lg:ml-6 mt-2 px-10 md:px-24 lg:px-44 xl:px-56">
      {/* Header with Back Arrow */}
      <div className="flex items-center gap-5">
        <ArrowLeft
          onClick={handleBack}
          className="cursor-pointer hover:text-blue-500 transition-colors"
        />
        <h1 className="text-2xl font-bold">Create New Interview</h1>
      </div>

      {/* Progress Bar */}
      <Progress value={step * 33.33} className="my-4" />

      {/* Step Logic */}
      {step === 1 ? (
        <FormContainer
          formData={formData}
          onHandleInputChange={onHandleInputChange}
          GoToNextStep={() => setStep(step + 1)}
        />
      ) : step === 2 ? (
        <QuestionsList formData={formData} />
      ) : null}
    </div>
  );
};

export default CreateInterview;
