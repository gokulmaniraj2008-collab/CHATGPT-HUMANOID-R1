# Vercel deployment guide

## Required environment variables

In Vercel, open `chatgpt-humanoid-r1` → **Settings → Environment Variables**.

| Variable | Purpose | Target |
| --- | --- | --- |
| `GEMINI_API_KEY` | Google AI Studio API key; server-side only | Production |
| `HUMANOID_ACCESS_CODE` | Existing private code used once to pair a device | Production |
| `HUMANOID_SESSION_SECRET` | Long random secret (at least 32 bytes entropy) used to sign device sessions | Production |

Keep all three values secret. Do not put them in frontend code, GitHub, screenshots, or chat. Do not reuse the Gemini API key or pairing code as the session secret.

## Pair a device once

1. Deploy the current `main` branch to Vercel Production.
2. Open the deployed site over HTTPS.
3. Enter the existing private pairing code once and tap **Connect this device**.
4. The server sets a signed HttpOnly, Secure, SameSite=Strict cookie valid for 30 days.
5. Future AI requests authenticate automatically without entering the code again.

Clear the site's cookies to disconnect. Rotating `HUMANOID_SESSION_SECRET` invalidates all existing sessions.

## Create a Gemini API key

1. Open [Google AI Studio API keys](https://aistudio.google.com/apikey).
2. Create an API key and keep it private. Gemini free-tier availability and limits are not unlimited or guaranteed.

## Redeploy and test

Redeploy after changing environment variables. Test with a short, non-sensitive message. The camera preview remains local; camera frames are not sent to Gemini.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Secure pairing not configured | Confirm `HUMANOID_ACCESS_CODE` and `HUMANOID_SESSION_SECRET` exist in Production. |
| Pairing code not recognised | Check `HUMANOID_ACCESS_CODE`; do not use the Gemini API key. |
| Device asks to pair again | Session expired, cookies were cleared, or session secret changed. Pair again. |
| Gemini usage limit reached | Check Google AI Studio usage and model limits. |

## Security notes

The pairing code is not stored in browser storage. The cookie is not readable by frontend JavaScript. This is convenient device pairing, not full user-account authentication. In-memory per-IP throttles are lightweight prototype safeguards, not production-grade abuse prevention. Keep the website private and do not share the pairing code.
