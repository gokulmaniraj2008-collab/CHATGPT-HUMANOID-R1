# HUMANOID R1 — Phase 2 Reliability Plan

## Guardrails
- Preserve the existing chat workspace, camera preview, speech recognition, speech synthesis, Tamil/Indian English/Hindi selection, secure device pairing, Vercel API, and Capacitor Android shell.
- Do not change `main` directly. Implement work on a feature branch and submit a pull request for review.
- Keep the phone-first workflow and prefer zero-cost, dependency-light improvements.
- The current camera preview is local-only. Do not claim camera vision or physical robot control exists until implemented and tested.

## Current codebase audit (main)
- Frontend: vanilla HTML/CSS/JavaScript; no automated test script or test dependency is defined in `package.json`.
- Backend: Vercel serverless handlers at `api/chat.js` and `api/session.js`.
- Authentication: signed HttpOnly, Secure, SameSite=Strict cookie with a 30-day expiry.
- AI: text-only Google AI provider integration; browser camera frames are not uploaded.
- Android: Capacitor 8 wrapper and GitHub Actions debug APK workflow.

## Findings to address
1. **No automated regression tests:** current package scripts contain mobile preparation/sync only; no test suite protects chat, pairing, or frontend behavior.
2. **In-memory throttling is instance-local:** both API handlers use in-memory Maps, so limits are not consistent across serverless instances and Maps can grow with unique IP values.
3. **Cookie parsing can throw:** `decodeURIComponent` in session-cookie parsing is not guarded against malformed percent-encoding.
4. **Request validation should be centralized and bounded:** validate JSON shape, message length, language, and content type consistently before provider work.
5. **Provider errors need safe observability:** preserve useful server-side diagnostics without returning provider internals or secrets to the browser.
6. **Lifecycle cleanup:** stop speech recognition and speech synthesis when leaving the page, in addition to stopping camera tracks.
7. **Accessibility and mobile regression coverage:** verify keyboard submission, visible focus, status announcements, and Android viewport behavior.

## Phase 2 implementation order
### 2.1 — Regression baseline
- Add Node built-in test coverage (avoid a paid service and avoid unnecessary dependencies).
- Test session signing/expiry/malformed cookies, pairing success/failure, method handling, chat validation, provider timeout/error handling, and language selection.
- Add a CI workflow that runs tests on pull requests and pushes without exposing secrets.

### 2.2 — Backend hardening
- Make cookie parsing fail closed instead of throwing.
- Bound and periodically prune local throttle state as a best-effort fallback; document that distributed rate limiting requires shared storage.
- Enforce request content type and payload bounds.
- Keep provider credentials server-side and keep client errors generic.
- Do not introduce an external database or paid rate-limit service without approval.

### 2.3 — Frontend reliability
- Add page lifecycle cleanup for microphone recognition and speech synthesis.
- Ensure retries do not duplicate user messages and all controls recover after errors.
- Preserve existing IDs and current UI flows; no redesign in this phase.

### 2.4 — Android validation
- Keep the existing Capacitor workflow and APK artifact.
- Add checks for required web assets and run the Android build workflow.
- Verify camera/microphone permissions and secure same-origin session behavior on Android.

## Acceptance criteria
- Existing Phase 1 features remain available.
- Automated tests pass in CI.
- No API key, pairing code, or session secret appears in frontend assets or logs.
- Invalid/malformed requests fail safely.
- Android debug APK workflow succeeds.
- A pull request is reviewed before any merge to `main`.

## Explicit non-goals for this phase
- No physical motor/robot movement.
- No camera-to-AI vision or live audio conversation.
- No replacement of the existing interface.
- No paid service requirement.
