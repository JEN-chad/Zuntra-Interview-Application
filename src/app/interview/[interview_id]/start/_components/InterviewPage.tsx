"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type QItem = { id: string; question: string; type: string };

const MAIN_TIMER = 30;
const SILENCE_TIMER = 8; // seconds
const AUDIO_ACTIVITY_THRESHOLD = 500; // bytes — tune if needed

export default function InterviewPage({
  interviewId,
  candidateId,
}: {
  interviewId: string;
  candidateId: string;
}) {
  const router = useRouter();

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

  const mainTimerRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<number | null>(null);

  const answeredRef = useRef<Record<number, boolean>>({});
  const allAnswersRef = useRef<{ question: string; answer: string }[]>([]);

  const lastTranscriptRef = useRef<string>("");

  // AUDIO AUTOPLAY FIX
  useEffect(() => {
    const unlock = () => {
      const a = new Audio();
      a.play().catch(() => {});
      window.removeEventListener("click", unlock);
    };
    window.addEventListener("click", unlock);
    return () => window.removeEventListener("click", unlock);
  }, []);

  // LOAD QUESTIONS
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/interview/${interviewId}/questions`);
        const data = await res.json();
        setQuestions(Array.isArray(data) ? data : data.questions || []);
      } catch (err) {
        console.error("Failed to load questions", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [interviewId]);

  const currentQuestion = questions[currentIndex];

  // Run question when started and ready
  useEffect(() => {
    if (!started || loading || callEnded || !currentQuestion) return;
    runQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, started, loading, callEnded]);

  // -------------------------
  // STOP Audio
  // -------------------------
  const stopAudio = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {}
      audioRef.current.src = "";
    }
    audioRef.current = null;
  };

  // -------------------------
  // TTS
  // -------------------------
  const speakAndWait = async (text: string) => {
    return new Promise<void>(async (resolve) => {
      try {
        stopAudio();

        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (!res.ok) return resolve();

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        const audio = new Audio(url);
        audio.volume = 1.0;
        audioRef.current = audio;

        audio.onended = () => {
          resolve();
          URL.revokeObjectURL(url);
        };

        audio.play().catch(resolve);
      } catch {
        resolve();
      }
    });
  };

  // -------------------------
  // STT
  // -------------------------
  const startSTT = async () => {
    try {
      stopSTT();
      stopAudio();

      // use hostname to avoid localhost/127 differences
      const socket = new WebSocket(`ws://${window.location.hostname}:3001`);
      wsRef.current = socket;

      socket.onopen = async () => {
        console.log("🟢 STT CONNECTED");

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // Use WebM Opus which works on Chrome/Windows
        const mime = "audio/webm; codecs=opus";
        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(stream, { mimeType: mime });
        } catch (err) {
          // fallback to default if explicit mimeType fails
          recorder = new MediaRecorder(stream);
          console.warn("MediaRecorder mimeType fallback used", err);
        }
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          // log for debugging
          // large chunks indicate activity
          console.log("🎤 AUDIO CHUNK:", e.data.size);

          if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(e.data);
          }

          // If sizable audio chunk, treat as activity and reset silence timer
          if (e.data.size > AUDIO_ACTIVITY_THRESHOLD) {
            resetSilenceTimer();
          }
        };

        recorder.onstart = () => {
          // ensure silence timer starts even if STT doesn't emit interim results
          resetSilenceTimer();
        };

        // start with small timeslice to stream continuously
        recorder.start(150);
      };

      socket.onmessage = (event) => {
        // debug raw message
        console.log("🟦 RAW STT:", event.data);

        try {
          const msg = JSON.parse(event.data);
          console.log("🟩 PARSED STT:", msg);

          if (!msg.text) return;

          const incoming = msg.text.trim();
          if (!incoming) return;

          console.log("🎤 FINAL TEXT:", incoming);

          // update transcript and reset silence (server confirmed speech)
          lastTranscriptRef.current = incoming;
          setAnswer((prev) => (prev + " " + incoming).trim());
          resetSilenceTimer();
        } catch (err) {
          console.error("🔥 STT JSON ERROR:", err);
        }
      };

      socket.onerror = (e) => {
        console.error("❌ STT WebSocket error:", e);
      };

      socket.onclose = () => {
        console.log("🔴 STT socket closed");
      };
    } catch (err) {
      console.error("🔥 STT start error:", err);
    }
  };

  const stopSTT = () => {
    try {
      recorderRef.current?.stop();
    } catch {}

    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}

    try {
      wsRef.current?.close();
    } catch {}

    recorderRef.current = null;
    streamRef.current = null;
    wsRef.current = null;
    lastTranscriptRef.current = "";
    clearSilenceTimer();
  };

  // -------------------------
  // TIMERS
  // -------------------------
  const startMainTimer = () => {
    clearMainTimer();
    mainTimerRef.current = window.setInterval(() => {
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
    if (mainTimerRef.current) {
      clearInterval(mainTimerRef.current);
    }
    mainTimerRef.current = null;
  };

  const startSilenceTimer = () => {
    clearSilenceTimer();
    silenceTimerRef.current = window.setTimeout(() => {
      console.log("⏳ Silence timeout triggered");
      autoSubmit("Silence timeout");
    }, SILENCE_TIMER * 1000);
  };

  const resetSilenceTimer = () => {
    // debug
    console.log("🔄 Silence timer reset");
    clearSilenceTimer();
    startSilenceTimer();
  };

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = null;
  };

  const clearTimers = () => {
    clearMainTimer();
    clearSilenceTimer();
  };

  // -------------------------
  // RUN QUESTION
  // -------------------------
  const runQuestion = async () => {
    stopAudio();
    stopSTT();
    clearTimers();

    setAnswer("");
    setTimeLeft(MAIN_TIMER);

    // Speak question, then start STT + timers
    await speakAndWait(currentQuestion.question);

    await startSTT();
    startMainTimer();
    startSilenceTimer();
  };

  // -------------------------
  // AUTO SUBMIT
  // -------------------------
  const autoSubmit = async (reason: string) => {
    if (answeredRef.current[currentIndex]) return;

    answeredRef.current[currentIndex] = true;

    const final = answer || `(No response - ${reason})`;

    await storeAnswer(final);
  };

  // -------------------------
  // STORE ANSWER
  // -------------------------
  const storeAnswer = async (finalAnswer: string) => {
    stopAudio();
    stopSTT();
    clearTimers();

    allAnswersRef.current.push({
      question: currentQuestion.question,
      answer: finalAnswer,
    });

    // move to next or finish
    if (currentIndex + 1 >= questions.length) {
      await finalSubmitAll();
      return;
    }

    // short pause before next question for UX
    setTimeout(() => {
      setCurrentIndex((p) => p + 1);
      setAnswer("");
      setTimeLeft(MAIN_TIMER);
    }, 350);
  };

  // -------------------------
  // MANUAL NEXT
  // -------------------------
  const skipToNext = async () => {
    stopAudio();
    stopSTT();
    clearTimers();

    if (!answeredRef.current[currentIndex]) {
      answeredRef.current[currentIndex] = true;

      const final = answer || "(Skipped by user)";

      allAnswersRef.current.push({
        question: currentQuestion.question,
        answer: final,
      });
    }

    if (currentIndex + 1 >= questions.length) {
      await finalSubmitAll();
      return;
    }

    setCurrentIndex((p) => p + 1);
    setAnswer("");
    setTimeLeft(MAIN_TIMER);
  };

  // -------------------------
  // FINAL SUBMIT + REDIRECT
  // -------------------------
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

      // redirect to review/evaluation page immediately
      router.push(`/interview/${interviewId}/review/${candidateId}`);
    } catch (err) {
      console.error("final submit error:", err);
    }
  };

  // -------------------------
  // END CALL IMMEDIATELY
  // -------------------------
  const endCallNow = async () => {
    stopAudio();
    stopSTT();
    clearTimers();
    setCallEnded(true);

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
    } catch {}
  };

  // -------------------------
  // UI
  // -------------------------
  if (loading) return <div className="p-6 text-center text-lg">Loading…</div>;

  if (callEnded)
    return (
      <div className="p-10 text-center">
        <Card className="max-w-md mx-auto p-6">
          <CardHeader>
            <CardTitle>Interview Completed 🎉</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Your responses have been saved & evaluated.</p>
          </CardContent>
        </Card>
      </div>
    );

  if (!started)
    return (
      <div className="p-10 flex justify-center">
        <Card className="max-w-md mx-auto p-10">
          <CardHeader>
            <CardTitle className="text-xl">Ready to Begin Your Interview?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Ensure microphone permissions are enabled.</p>
            <Button
              className="w-full bg-blue-600 text-white"
              onClick={() => setStarted(true)}
            >
              Start Interview 🎙️
            </Button>
          </CardContent>
        </Card>
      </div>
    );

  if (!currentQuestion) return <div className="p-6">No questions available.</div>;

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-50 px-4">
      <Card className="w-full max-w-2xl shadow-xl border p-6 animate-in fade-in">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Question {currentIndex + 1} of {questions.length}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg text-lg font-medium shadow-sm">
            {currentQuestion.question}
          </div>

          <div>
            <p className="font-semibold mb-1 text-sm">Time Remaining</p>
            <Progress value={(timeLeft / MAIN_TIMER) * 100} />
            <p className="text-red-500 font-bold text-sm mt-1">{timeLeft}s</p>
          </div>

          <div className="bg-white border rounded-lg p-4 shadow-inner h-28 overflow-y-auto">
            <p className="text-gray-500 text-xs mb-1">Live Answer</p>
            <p className="font-semibold text-gray-800">
              {answer || <span className="italic text-gray-400">Listening…</span>}
            </p>
          </div>

          <div className="flex gap-4 mt-4">
            <Button variant="destructive" onClick={endCallNow} className="flex-1 py-3 text-md">
              End Interview
            </Button>

            <Button onClick={skipToNext} className="flex-1 bg-blue-600 text-white py-3 text-md">
              Next Question →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
