require("dotenv").config();
const express = require("express");
const { createServer } = require("http");
const { WebSocketServer } = require("ws");
const { SpeechClient } = require("@google-cloud/speech");

const app = express();
const server = createServer(app);

const wss = new WebSocketServer({ server });

const client = new SpeechClient({
  keyFilename: process.env.SPEECH_TO_TEXT_KEY,
});

wss.on("connection", (ws) => {
  console.log("🎤 STT WebSocket Connected");

  const recognizeStream = client
    .streamingRecognize({
      config: {
        encoding: "WEBM_OPUS",
        sampleRateHertz: 48000,
        languageCode: "en-US",
      },
      interimResults: true,
    })
    .on("data", (data) => {
      const result = data.results?.[0];
      const transcript = result?.alternatives?.[0]?.transcript ?? "";

      // Only send final confirmed results (removes repetition)
      if (result?.isFinal) {
        ws.send(JSON.stringify({ text: transcript }));
      }
    })
    .on("error", (err) => console.error("🔥 STT error:", err));

  ws.on("message", (chunk) => recognizeStream.write(chunk));
  ws.on("close", () => recognizeStream.end());
});

server.listen(3001, () => {
  console.log("🚀 STT Server running on ws://localhost:3001");
});
