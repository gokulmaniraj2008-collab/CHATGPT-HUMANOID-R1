# CHATGPT HUMANOID R1

A phone-first humanoid robot interface prototype for **camera vision, speech input, AI conversation, and spoken output**. This is software for a phone prototype; it does not currently control motors or physical robot movement.

## Current features

- **Camera:** Android/browser camera preview starts only after the user taps **Start camera**.
- **Speech input:** browser speech recognition starts only after the user taps **Start listening**. Typed text is also supported.
- **AI brain:** text-only requests are sent from the browser to the protected Vercel endpoint at `/api/chat`, which calls Google's Gemini Interactions API.
- **Speech output:** browser speech synthesis reads the AI reply aloud.
- **Languages:** Tamil (`ta-IN`), Indian English (`en-IN`), and Hindi (`hi-IN`).

## Architecture

```text
Android phone / browser
  Camera preview (device UI)
  Microphone -> browser speech recognition -> recognized text
  Text input -> app.js
                |
                | POST /api/chat + private access-code header
                v
          Vercel serverless API
          api/chat.js
                |
                | GEMINI_API_KEY (server-side only)
                v
          Google Gemini Interactions API
                |
                v
          Text reply -> browser speech synthesis
```

**Important:** The current AI integration is text-only. Camera frames are not sent to Gemini. The browser microphone/speech-recognition implementation is separate from the Gemini request; only the recognized text is sent to the backend.

## Setup and deployment

See [Vercel deployment guide](docs/DEPLOYMENT.md) for the environment variables and deployment steps.

Required Vercel environment variables:

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Secret API key created in Google AI Studio. Read only by the Vercel serverless function. |
| `HUMANOID_ACCESS_CODE` | Private access code entered in the website's AI panel. Keep the existing value when migrating providers. |

Do not put either value in `app.js`, `index.html`, other frontend files, or Git commits. Do not share secrets in screenshots or chat. The previous `OPENAI_API_KEY` is no longer read by the Gemini backend.

## Local use

Serve the repository using a local development server, or deploy it to Vercel. Camera and microphone access generally require HTTPS (or localhost) and explicit browser permission. Android Chrome is the intended first test environment.

The project uses browser APIs and a Vercel serverless function. Opening `index.html` directly as a `file://` URL will not provide the deployed `/api/chat` endpoint.

## Limits and costs

- Gemini API free-tier availability, models, and request limits depend on the Google AI Studio project and Google's current terms. Free use is not unlimited or guaranteed.
- ChatGPT subscription access does not include OpenAI API credits; this project currently uses Gemini instead.
- Check the applicable Google AI Studio data-use and privacy terms before sending personal or sensitive information.
- The app includes a simple in-memory per-IP request throttle and access-code check. These are prototype safeguards, not production-grade authentication or abuse prevention. Serverless instances may not share in-memory counters.

## Privacy and safety

- Camera and microphone features start only after explicit user action; stop them when finished.
- Camera frames are not uploaded to the AI backend in this phase.
- Speech recognition is provided by the browser and may depend on browser/device services. Review your browser's privacy behavior.
- Never expose API keys or access codes in frontend code, public repositories, logs, or screenshots.
- Do not use this prototype for safety-critical decisions, surveillance, or autonomous physical movement.

## Roadmap

1. Phone prototype: camera preview, speech input, text AI, and spoken output.
2. Validate Gemini connectivity, usage limits, latency, and browser permissions.
3. Improve secure session handling and production-grade abuse protection.
4. Explore Raspberry Pi or other standalone hardware after the phone prototype is reliable.

## Project status

**Phase 1 phone prototype.** Camera preview, browser speech input/output, and a text-only Gemini backend are implemented in the codebase. Hardware movement, camera-to-AI vision, and live audio conversation are not implemented.
