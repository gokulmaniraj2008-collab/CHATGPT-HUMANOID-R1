# CHATGPT HUMANOID R1

A phone-first prototype for a humanoid robot interface focused on **seeing, hearing, and speaking**. No head movement or motors in this first version.

## Phase 1 — Android phone prototype
- Camera preview, started only after the user taps **Start camera**.
- Speech input, started only after the user taps **Start listening**.
- Spoken text output using the browser's speech synthesis.
- Manual text input as a fallback when speech recognition is unavailable.

## Important current limitation
This first prototype does **not** connect to ChatGPT yet. The camera preview stays on the device; it does not upload images. Speech recognition and speech output use browser capabilities where supported. A later phase will add a secure backend for AI requests.

## Run
Open `index.html` using a local development server or host the repository as a static website. Camera and microphone access generally require HTTPS (or localhost) and explicit browser permission. Android Chrome is the intended first test environment.

## Privacy and safety
- Camera and microphone start only after an explicit tap.
- Stop them when finished; use the visible stop controls.
- Never put API keys or passwords in frontend files or commit them to GitHub.
- Do not use this prototype for safety-critical decisions or surveillance.

## Roadmap
1. Phone prototype: camera, speech input, speech output.
2. Secure backend and ChatGPT API integration (API billing is separate from a ChatGPT subscription).
3. Test latency, permissions, and reliability.
4. Later, move the interface to Raspberry Pi hardware if needed.

## Project status
Phase 1 starter UI. AI integration and robot hardware are not implemented yet.
