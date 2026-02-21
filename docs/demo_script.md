# Demo Script (Hackathon)

Goal: show a real Live voice agent (mic in + audio out) and real artifact streaming (SSE) with citations and trace.

## Setup (before recording)

1) Start backend + web:

```bash
npm install
GEMINI_API_KEY=... npm run dev
```

2) Open `http://localhost:3000/app/co-reading`
3) Pick a real article URL (any current event with broad coverage)

## Live demo flow

1) Paste URL, click Analyze
2) On the session page, point out:
   - Pipeline badges flipping (content/claims/evidence)
   - Evidence cards showing quotes + URLs
   - Trace panel showing retrieval queries + constraints
   - Choice set capped to 3 items with rationale
3) Click Live Audio -> Start
4) Say: “What’s missing here? Give me the strongest counter-frame and cite evidence cards.”
5) While the agent speaks, barge in:
   - “Stop. Focus only on the causal claim.”
6) End by showing:
   - Cloud Run logs (if deployed)
   - Session record persisted (if using Firestore)
