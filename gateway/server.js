// DNU WhatsApp local gateway — runs on the ADMIN PC only (never on Vercel).
// 1) npm install
// 2) node server.js  -> scan the QR with the union WhatsApp number (a spare number is safer)
// 3) keep it running while sending campaigns from /communication

const express = require("express");
const qrcode = require("qrcode-terminal");
const QRImage = require("qrcode");
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");

const PORT = process.env.GATEWAY_PORT || 3001;
const SECRET = process.env.GATEWAY_SECRET || ""; // must match WHATSAPP_GATEWAY_SECRET in the web app
const AUTH_DIR = path.join(process.cwd(), "auth");
const QR_PATH = path.join(process.cwd(), "whatsapp-qr.png");

let sock = null;
let connected = false;

// Ask for a phone number to link with an 8-digit code instead of scanning QR.
// Skipped automatically when a session is already saved.
async function askPairNumber() {
  if (fs.existsSync(path.join(AUTH_DIR, "creds.json"))) return null;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans = await Promise.race([
    new Promise((res) => rl.question("\nLink with phone code? Type WhatsApp number (e.g. 201012345678) - or press Enter for QR: ", res)),
    new Promise((res) => setTimeout(() => res(""), 90000)),
  ]);
  rl.close();
  const d = String(ans || "").replace(/\D/g, "");
  return d.length >= 10 ? d : null;
}

async function connect(pairNumber) {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  sock = makeWASocket({ auth: state, printQRInTerminal: false });
  sock.ev.on("creds.update", saveCreds);

  // Pairing-code mode: print an 8-digit code instead of (or beside) the QR.
  if (pairNumber && !state.creds.registered) {
    setTimeout(async () => {
      try {
        if (sock.authState.creds.registered) return;
        const code = await sock.requestPairingCode(pairNumber);
        console.log("\n==================================================");
        console.log(`   Pairing code:  ${code}`);
        console.log("   Phone: WhatsApp > Settings > Linked devices > Link a device");
        console.log("   > 'Link with phone number instead' - enter this code");
        console.log("   (valid a few minutes - restart the app if it expires)");
        console.log("==================================================\n");
      } catch (e) {
        console.log("Could not issue a code - scan the QR instead.");
      }
    }, 4000);
  }

  sock.ev.on("connection.update", (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr && !pairNumber) {
      console.log("\n=== Scan QR with WhatsApp (Linked devices) - shrink font with Ctrl+- if too big ===");
      console.log(`=== Also saved as image: ${QR_PATH} (open it and scan from your phone) ===\n`);
      qrcode.generate(qr, { small: true });
      QRImage.toFile(QR_PATH, qr, { width: 360, margin: 2 }).catch(() => {});
      console.log("\n(QR expires in ~30s and a new one appears - scan fast. After first link you never need it again.)\n");
    }
    if (connection === "open") {
      connected = true;
      try { fs.unlinkSync(QR_PATH); } catch {}
      console.log("\n*** WhatsApp linked successfully - keep this window open while sending ***\n");
    }
    if (connection === "close") {
      connected = false;
      const retry = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Connection closed. Reconnect:", retry);
      if (retry) connect(pairNumber);
      else console.log("Logged out — delete ./auth and scan again.");
    }
  });
}

const app = express();
app.use(express.json());

function guard(req, res, next) {
  if (SECRET && req.headers["x-gateway-secret"] !== SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

app.get("/status", (_req, res) => res.json({ ok: true, connected }));

app.post("/send", guard, async (req, res) => {
  try {
    if (!connected || !sock) return res.status(503).json({ error: "WhatsApp not connected. Link it first." });
    const to = String(req.body.to ?? "").replace(/\D/g, "");
    const message = String(req.body.message ?? "");
    if (!to || !message) return res.status(400).json({ error: "to + message required" });
    await sock.sendMessage(`${to}@s.whatsapp.net`, { text: message });
    return res.json({ ok: true });
  } catch (e) {
    console.error("send failed:", e?.message);
    return res.status(500).json({ error: "send failed" });
  }
});

// Send a file (e.g. Excel sheet) as a WhatsApp document.
// Body: { to, filename, data (base64), mimetype }
app.post("/send-file", guard, async (req, res) => {
  try {
    if (!connected || !sock) return res.status(503).json({ error: "WhatsApp not connected. Link it first." });
    const to = String(req.body.to ?? "").replace(/\D/g, "");
    const filename = String(req.body.filename ?? "file");
    const data = String(req.body.data ?? "");
    const mimetype = String(req.body.mimetype ?? "application/octet-stream");
    if (!to || !data) return res.status(400).json({ error: "to + data required" });
    await sock.sendMessage(`${to}@s.whatsapp.net`, {
      document: Buffer.from(data, "base64"),
      fileName: filename,
      mimetype,
    });
    return res.json({ ok: true });
  } catch (e) {
    console.error("send-file failed:", e?.message);
    return res.status(500).json({ error: "send-file failed" });
  }
});

app.listen(PORT, () => console.log(`Gateway on http://localhost:${PORT}`));
askPairNumber().then((n) => connect(n));
