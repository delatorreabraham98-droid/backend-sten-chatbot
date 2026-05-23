import cors from "cors";
import express from "express";
import { config, getMissingRequiredEnv } from "./config.js";
import { adminRouter } from "./routes/admin.js";
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

app.use(adminRouter);
app.use(whatsappRouter);

app.use((err, _req, res, _next) => {
  console.error("Unhandled request error", err);
  res.status(500).json({
    error: "internal_server_error"
  });
});

const server = app.listen(config.port, () => {
  console.log(`STEN Chatbot Backend listening on port ${config.port}`);
});

function shutdown() {
  console.log("Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
