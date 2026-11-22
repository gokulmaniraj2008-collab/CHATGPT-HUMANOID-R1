const { createHmac, timingSafeEqual } = require("node:crypto");

function hasDeviceSession(req, secret) {
  if (!secret) return false;
  const part = String(req.headers.cookie || "").split(";").map(x => x.trim()).find(x => x.startsWith("humanoid_session="));
  if (!part) return false;
  const [payload, signature, extra] = decodeURIComponent(part.slice("humanoid_session=".length)).split(".");
  if (!payload || !signature || extra) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(payload).digest("base64url"));
  const supplied = Buffer.from(signature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;
  try { return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > Date.now(); } catch { return false; }
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const requestsByIp = new Map();
const PRIMARY_MODEL = "gemini-3.8-flash";
const FALLBACK_MODEL = "gemini-3.6-flash";
const TRANSIENT_UPSTREAM_STATUSES = new Set([408, 500, 502, 503, 504]);
const REQUEST_TIMEOUT_MS = 12_000;

async function requestProvider(model, prompt, apiKey) {
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      }
    );
    const data = await response.json().catch(() => ({}));
    return { response, data, failure: null };
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return { response: null, data: {}, failure: timedOut ? "timeout" : "network" };
  }
}

function send(res, status, body) {
  return res.status(status).json(body);
}

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.filter(item => typeof item?.text === "string").map(item => item.text).join("\n").trim();
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { errorCode: "METHOD_NOT_ALLOWED", error: "Method not allowed." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const sessionSecret = process.env.HUMANOID_SESSION_SECRET;
  if (!apiKey || !sessionSecret) {
    return send(res, 503, {
      errorCode: "AI_SETUP_INCOMPLETE",
      error: "The AI service is not configured yet. The project owner needs to finish the server setup."
    });
  }

  if (!hasDeviceSession(req, sessionSecret)) {
    return send(res, 401, { errorCode: "DEVICE_NOT_PAIRED", error: "Connect this device once before sending messages." });
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
    "You are the conversational AI for HUMANOID R1, a phone-first prototype.",
    "Reply in " + languageName + ".",
    "Be clear, concise, helpful, and safe.",
    "Do not claim to control physical hardware, see the camera, or hear live audio unless those inputs are actually provided.",
    "This integration is text-only.",
    "",
    "User message:",
    message
  ].join("\n");

  try {
    let result = await requestProvider(PRIMARY_MODEL, prompt, apiKey);
    let usedModel = PRIMARY_MODEL;

    const shouldFallback = result.failure !== null ||
      (result.response && !result.response.ok && TRANSIENT_UPSTREAM_STATUSES.has(result.response.status));

    if (shouldFallback) {
      console.warn("Primary AI route unavailable; trying the backup model.", result.failure || result.response.status);
      result = await requestProvider(FALLBACK_MODEL, prompt, apiKey);
      usedModel = FALLBACK_MODEL;
    }

    if (result.failure) {
      console.error("AI provider connection failed:", result.failure);
      return send(res, result.failure === "timeout" ? 504 : 502, {
        errorCode: result.failure === "timeout" ? "AI_TIMEOUT" : "AI_CONNECTION_ERROR",
        error: result.failure === "timeout"
          ? "The AI service took too long to respond. Please try again."
          : "The AI service could not be reached. Please try again."
      });
    }

    const { response: upstream, data } = result;
    if (!upstream.ok) {
      console.error("AI provider returned an error:", upstream.status, data?.error?.status || "unknown", "model:", usedModel);
      if (upstream.status === 429) return send(res, 429, {
        errorCode: "AI_USAGE_LIMIT",
        error: "The AI service has reached its current usage limit. Please wait and try again later."
      });
      if (upstream.status === 401 || upstream.status === 403) return send(res, 502, {
        errorCode: "AI_KEY_OR_ACCESS",
        error: "The AI service could not authorise this request. The project owner should check the server API configuration."
      });
      return send(res, 502, {
        errorCode: "AI_PROVIDER_ERROR",
        error: "The AI service is temporarily unavailable. Please try again shortly."
      });
    }

    const answer = extractText(data);
    if (!answer) return send(res, 502, { errorCode: "EMPTY_AI_RESPONSE", error: "The AI service returned an empty answer. Please try again." });
    return send(res, 200, { reply: answer, model: usedModel });
  } catch (error) {
    console.error("AI request handler failed:", error?.message || "unknown error");
    return send(res, 502, { errorCode: "AI_CONNECTION_ERROR", error: "The AI service could not be reached. Please try again." });
  }
};
