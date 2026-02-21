# Threat Model (Hackathon scope)

## Prompt injection (retrieval)

- Treat all retrieved content as hostile.
- Do not allow page text to override system rules.
- Keep extraction separate from reasoning.

## Data handling

- Default local/dev store is in-memory.
- If enabling Firestore/Storage, store only what you need for the demo:
  - session artifacts (structured JSON)
  - optional cached extracted text
- GCS artifact caching (`ORYN_GCS_ENABLE`, `ORYN_GCS_BUCKET`): stores extracted article text as JSON in Cloud Storage. Best-effort and read/write failures are silently ignored.
- Never store API keys in the repo.

## Rate limiting

- IP-based rate limiting middleware is applied to the Live WebSocket endpoint (3 connections per IP per 60 seconds).
- This prevents abuse of the Gemini Live connection, which is the most expensive resource.

## Live voice risks

- Audio is streamed to Gemini Live; do not encourage users to share sensitive information.
- Provide clear UI affordances for stopping the mic.
