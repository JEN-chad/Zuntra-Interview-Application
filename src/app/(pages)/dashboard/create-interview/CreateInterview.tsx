"use client";

import { Progress } from "@/components/ui/progress";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import FormContainer from "./_components/FormContainer";
import QuestionsList from "./_components/QuestionsList";
import InterviewLink from "./_components/InterviewLink";
import CreateSlots from "./_components/CreateSlots";

interface CreateInterviewProps {
  session: any;
}

const CreateInterview: React.FC<CreateInterviewProps> = ({ session }) => {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [interviewId, setInterviewId] = useState<string>("");

  // ----------------------------------------
  // Generic form handler
  // ----------------------------------------
  const onHandleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ----------------------------------------
  // Back
  // ----------------------------------------
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      return;
    }
    router.push("/dashboard");
  };

  // ----------------------------------------
  // When Questions step creates an interview → go to slots
  // ----------------------------------------
  const onQuestionsCreated = (id: string) => {
    setInterviewId(id);
    setStep(3); // ⭐ Step 3 is now the SLOT CREATION
  };

  // ----------------------------------------
  // Reset
  // ----------------------------------------
  const handleReset = () => {
    setFormData({});
    setInterviewId("");
    setStep(1);
  };

  return (
    <div className="md:ml-2 lg:ml-6 mt-2 px-10 md:px-24 lg:px-44 xl:px-56">
      {/* Header */}
      <div className="flex items-center gap-5">
        <ArrowLeft
          onClick={handleBack}
          className="cursor-pointer hover:text-blue-500 transition-colors"
        />
        <h1 className="text-2xl font-bold">Create New Interview</h1>
      </div>

      {/* Progress */}
      <Progress value={(step / 4) * 100} className="my-4 [&>div]:bg-blue-600" />

      {/* STEP 1 */}
      {step === 1 && (
        <FormContainer
          formData={formData}
          onHandleInputChange={onHandleInputChange}
          GoToNextStep={() => setStep(2)}
        />
      )}

      {/* STEP 2 – Questions */}
      {step === 2 && (
        <QuestionsList
          formData={formData}
          session={session}
          onCreateLink={onQuestionsCreated}
        />
      )}

      {/* ⭐ STEP 3 – CREATE SLOTS */}
      {step === 3 && (
       <CreateSlots
        interviewId={interviewId}
        duration={formData.interviewDuration}
        onDone={(startDate, endDate) => {
        setFormData((prev) => ({
        ...prev,
        slotStartDate: startDate,
        slotEndDate: endDate,
        }));
        setStep(4);
       }}
       onBack={() => setStep(2)}
       />

      )}

      {/* ⭐ STEP 4 – INTERVIEW LINK */}
      {step === 4 && (
        <InterviewLink
          interviewId={interviewId}
          formData={formData}
          onCreate={() => router.push(`/interview/${interviewId}`)}
          onReset={handleReset}
        />
      )}
    </div>
  );
};

export default CreateInterview;
