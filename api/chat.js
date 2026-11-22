const { timingSafeEqual } = require("node:crypto");

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const requestsByIp = new Map();

function send(res, status, body) {
  res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Method not allowed." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const accessCode = process.env.HUMANOID_ACCESS_CODE;
  if (!apiKey || !accessCode) {
    return send(res, 503, {
      error: "AI setup is incomplete. The project owner must configure the server environment variables."
    });
  }

  const suppliedCode = req.headers["x-humanoid-access-code"] || "";
  const expected = Buffer.from(accessCode);
  const supplied = Buffer.from(String(suppliedCode));
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return send(res, 401, { error: "Access code is incorrect." });
  }

  const forwardedFor = req.headers["x-forwarded-for"] || "unknown";
  const ip = String(forwardedFor).split(",")[0].trim().slice(0, 80);
  const now = Date.now();
  const previous = requestsByIp.get(ip);
  if (previous && now - previous.startedAt < WINDOW_MS && previous.count >= MAX_REQUESTS_PER_WINDOW) {
    return send(res, 429, { error: "Too many requests. Wait one minute and try again." });
  }
  if (!previous || now - previous.startedAt >= WINDOW_MS) {
    requestsByIp.set(ip, { startedAt: now, count: 1 });
  } else {
    previous.count += 1;
  }

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const language = ["ta-IN", "en-IN", "hi-IN"].includes(req.body?.language)
    ? req.body.language
    : "ta-IN";

  if (!message) return send(res, 400, { error: "Please enter or speak a message first." });
  if (message.length > 2000) return send(res, 400, { error: "Message is too long. Keep it under 2,000 characters." });

  const languageName = language === "ta-IN" ? "Tamil" : language === "hi-IN" ? "Hindi" : "Indian English";

  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5.5",
        instructions: `You are the conversational AI for CHATGPT HUMANOID R1, a phone-first prototype. Reply in ${languageName}. Be clear, concise, and safe. Do not claim to control physical hardware, see the camera, or hear live audio unless the request actually includes those inputs. This first integration is text-only.`,
        input: message,
        max_output_tokens: 400,
        store: false
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("OpenAI API error:", upstream.status, data?.error?.type || "unknown");
      return send(res, upstream.status === 429 ? 429 : 502, {
        error: upstream.status === 429
          ? "OpenAI API quota or rate limit reached. Check API billing and limits."
          : "The AI service could not complete the request. Try again shortly."
      });
    }

    const answer = typeof data.output_text === "string" ? data.output_text.trim() : "";
    if (!answer) return send(res, 502, { error: "The AI returned an empty response. Please try again." });
    return send(res, 200, { reply: answer });
  } catch (error) {
    console.error("AI request failed:", error?.message || "unknown error");
    return send(res, 502, { error: "Could not reach the AI service. Check your connection and try again." });
  }
};
