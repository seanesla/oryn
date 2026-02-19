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
- Never store API keys in the repo.

## Live voice risks

- Audio is streamed to Gemini Live; do not encourage users to share sensitive information.
- Provide clear UI affordances for stopping the mic.
