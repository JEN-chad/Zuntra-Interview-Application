"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type QItem = { id: string; question: string; type: string };

const MAIN_TIMER = 30;
const SILENCE_TIMER = 8;

export default function InterviewPage({
  interviewId,
  candidateId,
}: {
  interviewId: string;
  candidateId: string;
}) {
  const [questions, setQuestions] = useState<QItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);

  const [started, setStarted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);

  const [timeLeft, setTimeLeft] = useState(MAIN_TIMER);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const mainTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const answeredRef = useRef<Record<number, boolean>>({});
  const allAnswersRef = useRef<{ question: string; answer: string }[]>([]);

  // Unlock audio autoplay
  useEffect(() => {
    const unlock = () => {
      const a = new Audio();
      a.play().catch(() => {});
      window.removeEventListener("click", unlock);
    };
    window.addEventListener("click", unlock);
  }, []);

  // Load questions
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/interview/${interviewId}/questions`);
        const data = await res.json();
        setQuestions(Array.isArray(data) ? data : data.questions || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [interviewId]);

  const currentQuestion = questions[currentIndex];

  // Start question when started or index changed
  useEffect(() => {
    if (loading) return;
    if (!started) return;
    if (callEnded) return;
    if (!currentQuestion) return;

    runQuestion();
  }, [currentIndex, loading, started, callEnded]);

  // --------------------------------
  // STOP AUDIO FUNCTION
  // --------------------------------
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  };

  // --------------------------------
  // TTS WITH AUTO-STOP
  // --------------------------------
  const speakAndWait = (text: string): Promise<void> => {
    return new Promise(async (resolve) => {
      try {
        stopAudio(); // stop old audio instantly

        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (!res.ok) return resolve();

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        const audio = new Audio(url);
        audioRef.current = audio;
        audio.volume = 1.0;

        const playPromise = audio.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              audio.onended = () => {
                resolve();
                URL.revokeObjectURL(url);
                audioRef.current = null;
              };
            })
            .catch(() => resolve());
        } else {
          audio.onended = () => {
            resolve();
            URL.revokeObjectURL(url);
            audioRef.current = null;
          };
        }
      } catch {
        resolve();
      }
    });
  };

  // --------------------------------
  // STT
  // --------------------------------
  const startSTT = async () => {
    try {
      stopSTT();
      stopAudio();

      const socket = new WebSocket("ws://localhost:3001");
      wsRef.current = socket;

      socket.onopen = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const recorder = new MediaRecorder(stream, {
          mimeType: "audio/webm; codecs=opus",
        });
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(e.data);
          }
          resetSilenceTimer();
        };

        recorder.start(150);
      };

      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.text) {
          setAnswer(msg.text); // no trimming — store raw text
        }
      };
    } catch (e) {
      console.error("STT error:", e);
    }
  };

  const stopSTT = () => {
    try {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      wsRef.current?.close();
    } catch {}
    recorderRef.current = null;
    streamRef.current = null;
    wsRef.current = null;
  };

  // --------------------------------
  // TIMERS
  // --------------------------------
  const startMainTimer = () => {
    clearMainTimer();
    mainTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearMainTimer();
          autoSubmit("Time limit reached");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  const clearMainTimer = () => {
    if (mainTimerRef.current) clearInterval(mainTimerRef.current);
    mainTimerRef.current = null;
  };

  const startSilenceTimer = () => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(
      () => autoSubmit("Silence timeout"),
      SILENCE_TIMER * 1000
    );
  };
  const resetSilenceTimer = () => {
    clearSilenceTimer();
    startSilenceTimer();
  };
  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
  };

  const clearTimers = () => {
    clearMainTimer();
    clearSilenceTimer();
  };

  // --------------------------------
  // QUESTION FLOW
  // --------------------------------
  const runQuestion = async () => {
    stopAudio();
    stopSTT();
    clearTimers();

    setAnswer("");
    setTimeLeft(MAIN_TIMER);

    await speakAndWait(currentQuestion.question);

    startSTT();
    startMainTimer();
    startSilenceTimer();
  };

  // --------------------------------
  // AUTOSUBMIT
  // --------------------------------
  const autoSubmit = async (reason: string) => {
    if (answeredRef.current[currentIndex]) return;

    answeredRef.current[currentIndex] = true;

    const finalAnswer = answer.length > 0 ? answer : `(No response - ${reason})`;

    await storeAnswer(finalAnswer);
  };

  // --------------------------------
  // STORE ANSWER
  // --------------------------------
  const storeAnswer = async (finalAnswer: string) => {
    stopAudio();
    stopSTT();
    clearTimers();

    allAnswersRef.current.push({
      question: currentQuestion.question,
      answer: finalAnswer,
    });

    if (currentIndex + 1 >= questions.length) {
      finalSubmitAll();
    } else {
      setCurrentIndex((prev) => prev + 1);
      setAnswer("");
      setTimeLeft(MAIN_TIMER);
    }
  };

  // --------------------------------
  // NEXT QUESTION BUTTON
  // --------------------------------
  const skipToNext = async () => {
    stopAudio();
    stopSTT();
    clearTimers();

    if (!answeredRef.current[currentIndex]) {
      answeredRef.current[currentIndex] = true;

      const finalAnswer =
        answer.length > 0 ? answer : "(Skipped by user)";

      allAnswersRef.current.push({
        question: currentQuestion.question,
        answer: finalAnswer,
      });
    }

    if (currentIndex + 1 >= questions.length) {
      finalSubmitAll();
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setAnswer("");
    setTimeLeft(MAIN_TIMER);
  };

  // --------------------------------
  // END INTERVIEW
  // --------------------------------
  const finalSubmitAll = async () => {
    stopAudio();
    stopSTT();
    clearTimers();

    try {
      await fetch(`/api/interview/${interviewId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId,
          candidateId,
          answers: allAnswersRef.current,
        }),
      });

      await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId,
          answers: allAnswersRef.current,
        }),
      });

      setCallEnded(true);
    } catch (err) {
      console.error("Final submit failed:", err);
    }
  };

  // --------------------------------
  // END CALL BUTTON
  // --------------------------------
  const endCallNow = async () => {
    stopAudio();
    stopSTT();
    clearTimers();
    setCallEnded(true);

    await fetch(`/api/interview/${interviewId}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        interviewId,
        candidateId,
        answers: allAnswersRef.current,
      }),
    });
  };

  // --------------------------------
  // UI SCREENS
  // --------------------------------

  if (loading)
    return <div className="p-6 text-center text-lg">Loading questions…</div>;

  if (callEnded)
    return (
      <div className="p-10 text-center">
        <Card className="max-w-md mx-auto p-6">
          <CardHeader>
            <CardTitle>Interview Completed 🎉</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mt-2">
              Thank you. Your responses have been saved & evaluated.
            </p>
          </CardContent>
        </Card>
      </div>
    );

  if (!started)
    return (
      <div className="p-10 flex justify-center">
        <Card className="max-w-md mx-auto p-10">
          <CardHeader>
            <CardTitle className="text-xl">
              Ready to Begin Your Interview?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Click start when you're ready. Ensure microphone permission is allowed.
            </p>
            <Button
              onClick={() => setStarted(true)}
              className="w-full bg-blue-600 text-white"
            >
              Start Interview 🎙️
            </Button>
          </CardContent>
        </Card>
      </div>
    );

  if (!currentQuestion)
    return <div className="p-6">No questions found.</div>;

  // --------------------------------
  // MAIN INTERVIEW UI
  // --------------------------------

  return (
    <div className="p-6 flex justify-center">
      <Card className="w-full max-w-2xl p-6">
        <CardHeader>
          <CardTitle>
            Question {currentIndex + 1} / {questions.length}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-lg">{currentQuestion.question}</p>

          <div>
            <p className="font-semibold mb-2">Time Remaining</p>
            <Progress value={(timeLeft / MAIN_TIMER) * 100} />
            <p className="text-red-600 font-bold mt-1">{timeLeft}s</p>
          </div>

          <div className="bg-gray-100 p-3 rounded">
            <p className="text-gray-600">Your Answer (live):</p>
            <p className="font-semibold">{answer || "Listening…"}</p>
          </div>

          <div className="flex gap-4">
            <Button
              variant="destructive"
              onClick={endCallNow}
              className="flex-1"
            >
              End Call
            </Button>

            <Button
              onClick={skipToNext}
              className="flex-1 bg-blue-600 text-white"
            >
              Next Question ➜
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
