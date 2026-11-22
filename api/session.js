const { timingSafeEqual, createHmac } = require("node:crypto");
const COOKIE = "humanoid_session";
const TTL = 30 * 24 * 60 * 60;
const attempts = new Map();
function sign(payload, secret) { return createHmac("sha256", secret).update(payload).digest("base64url"); }
function cookieValue(req) {
  const part = String(req.headers.cookie || "").split(";").map(x => x.trim()).find(x => x.startsWith(COOKIE + "="));
  return part ? decodeURIComponent(part.slice(COOKIE.length + 1)) : "";
}
function valid(req, secret) {
  if (!secret) return false;
  const [payload, signature, extra] = cookieValue(req).split(".");
  if (!payload || !signature || extra) return false;
  const a = Buffer.from(sign(payload, secret)), b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try { return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > Date.now(); } catch { return false; }
}
function send(res, status, body) { return res.status(status).json(body); }
module.exports = async function handler(req, res) {
  const code = process.env.HUMANOID_ACCESS_CODE, secret = process.env.HUMANOID_SESSION_SECRET;
  if (!code || !secret) return send(res, 503, { errorCode: "SESSION_SETUP_INCOMPLETE", error: "Secure device pairing is not configured on the server yet." });
  if (req.method === "GET") return send(res, 200, { authenticated: valid(req, secret) });
  if (req.method === "DELETE") { res.setHeader("Set-Cookie", COOKIE + "=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"); return send(res, 200, { authenticated: false }); }
  if (req.method !== "POST") { res.setHeader("Allow", "GET, POST, DELETE"); return send(res, 405, { errorCode: "METHOD_NOT_ALLOWED", error: "Method not allowed." }); }
  const ip = String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim().slice(0, 80), now = Date.now(), prev = attempts.get(ip);
  if (prev && now - prev.start < 60000 && prev.count >= 5) return send(res, 429, { errorCode: "PAIR_RATE_LIMIT", error: "Too many pairing attempts. Wait one minute and try again." });
  if (!prev || now - prev.start >= 60000) attempts.set(ip, { start: now, count: 1 }); else prev.count++;
  const supplied = Buffer.from(String(req.body?.code || "")), expected = Buffer.from(code);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return send(res, 401, { errorCode: "INVALID_PAIRING_CODE", error: "That private pairing code doesn't match." });
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TTL * 1000 })).toString("base64url");
  const token = payload + "." + sign(payload, secret);
  res.setHeader("Set-Cookie", COOKIE + "=" + encodeURIComponent(token) + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=" + TTL);
  return send(res, 200, { authenticated: true, expiresInDays: 30 });
};
