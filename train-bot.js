import { generateBotReply } from "./src/services/aiResponder.js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

const PHONE = process.env.TEST_PHONE || "5216866500526";
const NAME = process.env.TEST_NAME || "Test";

const CONVERSATION = [
  "que rollo",
  "tengo un civic 2001",
  "las de 250",
  "si",
  "instalacion",
  "si",
  "gracias"
];

async function run() {
  console.log("=== Entrenando Bot ===\n");
  for (const msg of CONVERSATION) {
    console.log("> " + msg);
    try {
      const reply = await generateBotReply({
        customerPhone: PHONE,
        customerName: NAME,
        customerMessage: msg
      });
      console.log("Bot: " + reply + "\n");
    } catch (err) {
      console.log("ERROR: " + err.message + "\n");
    }
  }

  // Clear memory after training
  console.log("> /clear");
  const reply = await generateBotReply({
    customerPhone: PHONE,
    customerName: NAME,
    customerMessage: "/clear"
  });
  console.log("Bot: " + reply);
  console.log("\n=== Fin ===");
}

run().catch(console.error);
