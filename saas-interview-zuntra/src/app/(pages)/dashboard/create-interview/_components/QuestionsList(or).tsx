"use client";

import { useEffect } from "react";

interface QuestionsListProps {
  formData: Record<string, any>;
}

const QuestionsList: React.FC<QuestionsListProps> = ({ formData }) => {
  
  useEffect(()=> {
  if(formData){
    generateAiInterviewQuestions();
  }
  },[formData])

  const generateAiInterviewQuestions = (): void => {
    // TODO: implement AI question generation
    
  }
  return (
    <div>
      Questions
    </div>
  );
};

export default QuestionsList;
