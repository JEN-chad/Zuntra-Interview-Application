"use client";

import { Progress } from "@/components/ui/progress";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import FormContainer from "./_components/FormContainer";

const CreateInterview = () => {
  const [step, setStep] = useState(1);
  const router = useRouter();

  // ✅ Initialize formData as an empty object (so it’s never undefined)
  const [formData, setFormData] = useState<Record<string, any>>({});

  const onHandleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    console.log({ ...formData, [field]: value });
  };

  return (
    <div className="md:ml-2 lg:ml-6 mt-2 px-10 md:px-24 lg:px-44 xl:px-56">
      <div className="flex items-center gap-5">
        <ArrowLeft
          onClick={() => router.back()}
          className="cursor-pointer hover:text-blue-500 transition-colors"
        />
        <h1 className="text-2xl font-bold">Create New Interview</h1>
      </div>

      <Progress value={step * 33.33} className="my-4" />

      {/* ✅ Pass formData down */}
      <FormContainer
        formData={formData}
        onHandleInputChange={onHandleInputChange}
      />
    </div>
  );
};

export default CreateInterview;
