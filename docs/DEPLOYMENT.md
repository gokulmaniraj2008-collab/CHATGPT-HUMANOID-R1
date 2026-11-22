# Vercel deployment guide

## 1. Create a Gemini API key

1. Open [Google AI Studio API keys](https://aistudio.google.com/apikey).
2. Create an API key for your Google AI Studio project.
3. Keep the key private. Do not paste it into GitHub, frontend code, screenshots, or chat.

Gemini API free-tier access is subject to Google's current model availability, rate limits, and terms. It is not unlimited.

## 2. Configure Vercel

In the Vercel dashboard, open the `chatgpt-humanoid-r1` project:

1. Open **Settings → Environment Variables**.
2. Add `GEMINI_API_KEY` with the API key from Google AI Studio.
3. Select **Production** (also add Preview/Development only if you intend to use those environments).
4. Keep the existing `HUMANOID_ACCESS_CODE` value. The website asks for this separate private code; it is not the Gemini API key.
5. Save the variables.

The current backend reads `GEMINI_API_KEY` and `HUMANOID_ACCESS_CODE`. It no longer reads `OPENAI_API_KEY`.

## 3. Redeploy

After saving the environment variables, redeploy the latest production deployment so the function receives the new settings. A new deployment is required for environment-variable changes to take effect.

## 4. Test safely

1. Open the deployed website over HTTPS.
2. Enter the existing private access code in the AI panel.
3. Type a short, non-sensitive test message into the recognized-speech text area (or use browser speech recognition).
4. Send it to AI and confirm a text reply appears.
5. Use **Speak aloud** to test the device's browser speech synthesis.

The camera preview is local to the page in this phase; camera frames are not sent to Gemini.

## Troubleshooting

| UI message / symptom | What to check |
| --- | --- |
| AI setup is incomplete | Confirm both Vercel variables exist and have non-empty values in the Production environment, then redeploy. |
| Access code does not match | Confirm the website access code matches the value of `HUMANOID_ACCESS_CODE`. Do not use the Gemini API key in this field. |
| Gemini usage limit reached | Check Google AI Studio usage/rate limits and the selected model's availability. Wait for quota reset if applicable. |
| Gemini authorization failed | Check that the key belongs to the intended Google AI Studio project and that Gemini API access is enabled. Never reveal the key while troubleshooting. |
| Network or provider error | Check Vercel function logs and Google AI Studio status/usage. Retry later if the provider is temporarily unavailable. |

## Security notes

- `GEMINI_API_KEY` must remain a Vercel server environment variable and must never be exposed to browser JavaScript.
- Do not commit `.env` files or real secrets.
- The current access-code check and in-memory per-IP throttle are lightweight prototype protections. Do not treat them as production-grade authentication or DDoS protection.
- Avoid sending personal, confidential, or sensitive content unless you have reviewed Google's current API data-use and privacy terms.
