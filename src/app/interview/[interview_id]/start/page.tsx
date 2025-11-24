"use client";

import { useState, useRef } from "react";

export default function InterviewStart() {
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const startRecording = async () => {
    setTranscript("");

    socketRef.current = new WebSocket("ws://localhost:3001");

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setTranscript((prev) => prev + " " + data.text);
    };

    socketRef.current.onopen = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderRef.current = new MediaRecorder(stream, { mimeType: "audio/webm" });

      recorderRef.current.ondataavailable = (event) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(event.data);
        }
      };

      recorderRef.current.start(200);
      setIsRecording(true);
    };
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    socketRef.current?.close();
    setIsRecording(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Interview Speaking Test</h2>

      <button
        onClick={isRecording ? stopRecording : startRecording}
        style={{
          background: isRecording ? "red" : "green",
          color: "white",
          padding: "10px 20px",
          borderRadius: 6,
          marginBottom: 16,
        }}
      >
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>

      <div
        style={{
          marginTop: 20,
          padding: 15,
          minHeight: 140,
          background: "#f1f1f1",
          borderRadius: 8,
          whiteSpace: "pre-wrap",
        }}
      >
        {transcript || "Transcript will appear here..."}
      </div>
    </div>
  );
}
