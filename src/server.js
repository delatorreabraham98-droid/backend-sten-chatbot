import cors from "cors";
import express from "express";
import { config, getMissingRequiredEnv } from "./config.js";
import { whatsappRouter } from "./routes/whatsapp.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({
    name: "STEN Chatbot Backend",
    status: "ok"
  });
});

app.get("/health", (_req, res) => {
  const missingEnv = getMissingRequiredEnv();

  res.status(missingEnv.length ? 503 : 200).json({
    status: missingEnv.length ? "missing_env" : "ok",
    missingEnv
  });
});

app.use(whatsappRouter);

app.use((err, _req, res, _next) => {
  console.error("Unhandled request error", err);
  res.status(500).json({
    error: "internal_server_error"
  });
});

app.listen(config.port, () => {
  console.log(`STEN Chatbot Backend listening on port ${config.port}`);
});
