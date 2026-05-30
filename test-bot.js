import readline from "readline";

const SERVER = process.env.SERVER_URL || "http://localhost:10000";
const PHONE = process.env.TEST_PHONE || "5216866500526";
const NAME = process.env.TEST_NAME || "Test User";

async function sendMessage(msg) {
  try {
    const res = await fetch(SERVER + "/test/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, phone: PHONE, name: NAME }),
      signal: AbortSignal.timeout(20000)
    });
    const data = await res.json();
    return data.reply || data.error || "(no reply)";
  } catch (err) {
    return "ERROR: " + err.message;
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: ""
});

console.log("\n=== Bot Test CLI ===");
console.log("Server: " + SERVER);
console.log("Phone:  " + PHONE);
console.log("Commands: /quit, /clear, /server <url>, /phone <num>, /reset");
console.log("");

async function prompt() {
  rl.question("> ", async (line) => {
    const msg = line.trim();
    if (!msg) { prompt(); return; }

    if (msg === "/quit") { rl.close(); return; }
    if (msg === "/clear") { console.log(await sendMessage("/clear") + "\n"); prompt(); return; }
    if (msg.startsWith("/server ")) {
      console.log("Server changed to: " + msg.slice(8) + "\n");
      prompt();
      return;
    }
    if (msg.startsWith("/phone ")) {
      console.log("Phone changed to: " + msg.slice(7) + "\n");
      prompt();
      return;
    }

    const reply = await sendMessage(msg);
    console.log("Bot: " + reply + "\n");
    prompt();
  });
}

prompt();

rl.on("close", () => {
  console.log("\nBye!");
  process.exit(0);
});
