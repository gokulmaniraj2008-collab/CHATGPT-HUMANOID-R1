const { timingSafeEqual } = require("node:crypto");

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const requestsByIp = new Map();
const GEMINI_MODEL = "gemini-3.8-flash";

function send(res, status, body) {
  res.status(status).json(body);
}

function extractText(data) {
  if (typeof data?.output_text === "string") return data.output_text.trim();
  const parts = [];
  for (const step of data?.steps || []) {
    if (step?.type !== "model_output" || !Array.isArray(step.content)) continue;
    for (const item of step.content) {
      if (item?.type === "text" && typeof item.text === "string") parts.push(item.text);
    }
  }
  return parts.join("\n").trim();
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { errorCode: "METHOD_NOT_ALLOWED", error: "Method not allowed." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const accessCode = process.env.HUMANOID_ACCESS_CODE;
  if (!apiKey || !accessCode) {
    return send(res, 503, {
      errorCode: "AI_SETUP_INCOMPLETE",
      error: "AI is not ready yet. The project owner needs to finish the server setup. Your camera, microphone, and speaker features are still available."
    });
  }

  const suppliedCode = req.headers["x-humanoid-access-code"] || "";
  const expected = Buffer.from(accessCode);
  const supplied = Buffer.from(String(suppliedCode));
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return send(res, 401, { errorCode: "INVALID_ACCESS_CODE", error: "That access code doesn't match. Check it and try again." });
  }

  const forwardedFor = req.headers["x-forwarded-for"] || "unknown";
  const ip = String(forwardedFor).split(",")[0].trim().slice(0, 80);
  const now = Date.now();
  const previous = requestsByIp.get(ip);
  if (previous && now - previous.startedAt < WINDOW_MS && previous.count >= MAX_REQUESTS_PER_WINDOW) {
    return send(res, 429, { errorCode: "TOO_MANY_REQUESTS", error: "You're sending messages too quickly. Please wait about a minute, then try again." });
  }
  if (!previous || now - previous.startedAt >= WINDOW_MS) requestsByIp.set(ip, { startedAt: now, count: 1 });
  else previous.count += 1;

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const language = ["ta-IN", "en-IN", "hi-IN"].includes(req.body?.language) ? req.body.language : "ta-IN";
  if (!message) return send(res, 400, { errorCode: "EMPTY_MESSAGE", error: "Please enter or speak a message first." });
  if (message.length > 2000) return send(res, 400, { errorCode: "MESSAGE_TOO_LONG", error: "Message is too long. Keep it under 2,000 characters." });

  const languageName = language === "ta-IN" ? "Tamil" : language === "hi-IN" ? "Hindi" : "Indian English";
  const prompt = [
    "You are the conversational AI for CHATGPT HUMANOID R1, a phone-first prototype.",
    "Reply in " + languageName + ".",
    "Be clear, concise, helpful, and safe.",
    "Do not claim to control physical hardware, see the camera, or hear live audio unless those inputs are actually provided.",
    "This integration is text-only.",
    "",
    "User message:",
    message
  ].join("\n");

  try {
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ model: GEMINI_MODEL, input: prompt, store: false })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Gemini API error:", upstream.status, data?.error?.status || "unknown");
      if (upstream.status === 429) return send(res, 429, {
        errorCode: "AI_USAGE_LIMIT",
        error: "Gemini's free-tier request or usage limit has been reached. Please wait and try again later."
      });
      if (upstream.status === 401 || upstream.status === 403) return send(res, 502, {
        errorCode: "GEMINI_KEY_OR_ACCESS",
        error: "Gemini could not authorise this request. The project owner should check the API key and Gemini API access."
      });
      return send(res, 502, { errorCode: "AI_PROVIDER_ERROR", error: "Gemini couldn't process that message right now. Please try again shortly." });
    }

    const answer = extractText(data);
    if (!answer) return send(res, 502, { errorCode: "EMPTY_AI_RESPONSE", error: "Gemini didn't return a text answer. Please send your message again." });
    return send(res, 200, { reply: answer });
  } catch (error) {
    console.error("Gemini request failed:", error?.message || "unknown error");
    return send(res, 502, { errorCode: "AI_CONNECTION_ERROR", error: "We couldn't connect to Gemini. Check your internet connection and try again." });
  }
};
