require("dotenv").config();
const express = require("express");
const { createServer } = require("http");
const { WebSocketServer } = require("ws");
const { SpeechClient } = require("@google-cloud/speech");
const { spawn } = require("child_process");

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Google STT client
const client = new SpeechClient({
  keyFilename: process.env.SPEECH_TO_TEXT_KEY,
});

wss.on("connection", (ws) => {
  console.log("🔌 Client connected to STT");

  // 🔥 Create Google Speech streamingRecognize stream
  const recognizeStream = client
    .streamingRecognize({
      config: {
        encoding: "LINEAR16",
        sampleRateHertz: 16000,
        languageCode: "en-US",
      },
      interimResults: true,
    })
    .on("data", (data) => {
      const result = data.results?.[0];
      if (!result) return;

      const transcript = result.alternatives?.[0]?.transcript?.trim();
      if (!transcript) return;

      if (result.isFinal) {
        console.log("🎤 FINAL:", transcript);
        ws.send(JSON.stringify({ text: transcript }));
      }
    })
    .on("error", (err) => {
      console.error("🔥 Google STT error:", err);
    });

  // 🔥 FFMPEG converts WebM Opus → raw PCM16
  const ffmpeg = spawn("ffmpeg", [
    "-loglevel", "quiet", // remove spam
    "-i", "pipe:0",       // input from websocket
    "-f", "s16le",        // raw PCM16 format
    "-acodec", "pcm_s16le",
    "-ac", "1",           // mono
    "-ar", "16000",       // 16kHz
    "pipe:1"              // output to Google STT stream
  ]);

  // FFmpeg output goes to Google
  ffmpeg.stdout.on("data", (chunk) => {
    recognizeStream.write(chunk);
  });

  // Incoming audio from browser → feed into ffmpeg
  ws.on("message", (msg) => {
    ffmpeg.stdin.write(msg);
  });

  ws.on("close", () => {
    console.log("❌ STT connection closed");
    recognizeStream.end();
    ffmpeg.stdin.end();
  });
});

server.listen(3001, () => {
  console.log("🚀 STT server running at ws://localhost:3001");
});
