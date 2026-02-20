# oryn

Live co-reading agent for the Gemini Live Agent Challenge.

- Mic audio in -> Gemini Live -> audio out
- Real-time artifacts (SSE): transcript, evidence cards, trace, and a 3-item “next reads” choice set
- Backend orchestrator designed for Cloud Run (Google Cloud)

## Hackathon compliance (Live Agents)

- Gemini Live API: used via Google GenAI SDK (`@google/genai`) in `apps/api`
- Beyond text: streaming audio input/output + live transcription
- Google Cloud service: backend deploy target is Cloud Run (script included)

## Repo structure

- `apps/web` Next.js UI
- `apps/api` Fastify orchestrator + Gemini Live proxy
- `packages/shared` shared types/protocol
- `docs/architecture.md` architecture + diagrams

## Architecture diagrams

The diagrams below are generated from Structurizr DSL in `structurizr/workspace.dsl`.

If this is your first time generating diagrams, download the Structurizr CLI:

```bash
mkdir -p structurizr/bin
curl -L -o structurizr/bin/structurizr-cli.zip https://github.com/structurizr/cli/releases/latest/download/structurizr-cli.zip
unzip -o structurizr/bin/structurizr-cli.zip -d structurizr/bin
```

You also need Graphviz installed so the `dot` command can render PNG images.
The export script also uses Python 3 + Pillow to compose the branded 16:9 PNGs.

```bash
npm run diagrams:export
```

### 1) General architecture

![oryn general architecture](structurizr/diagrams/general-architecture.png)

### 2) Live co-reading flow

![oryn live co-reading flow](structurizr/diagrams/live-co-reading-flow.png)

## Local dev

### Prereqs

- Node.js 22+
- npm

### 1) Install

```bash
npm install
```

### 2) Run web + api

Copy env templates if you want:

- `apps/api/.env.example`
- `apps/web/.env.example`

```bash
GEMINI_API_KEY=YOUR_KEY_HERE npm run dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:8787`

If you don’t set `GEMINI_API_KEY`, the UI pipeline still works (fallback evidence/choice set), but Live voice is disabled.

### 3) Use it

1) Go to `http://localhost:3000/app`
2) Paste a URL and click Analyze
3) In the session page, click Start under Live Audio and speak

## Backend tests

```bash
npm test
```

## Environment variables

Backend (`apps/api`):

- Auth (pick one)
  - Developer API: `GEMINI_API_KEY`
  - Vertex AI (recommended on Cloud Run): `GOOGLE_GENAI_USE_VERTEXAI=true`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`
- `GEMINI_LIVE_MODEL` (default: `gemini-live-2.5-flash-preview`)
- `GEMINI_MODEL` (default: `gemini-2.0-flash` for non-live calls)
- `GEMINI_VOICE_NAME` (default: `Aoede`)
- `CORS_ORIGIN` (optional; allow your deployed web origin)
- `SESSION_STORE` (default: `memory`; set to `firestore` to persist sessions)
- `FIRESTORE_SESSIONS_COLLECTION` (default: `oryn_sessions`)

Web (`apps/web`):

- `NEXT_PUBLIC_API_BASE_URL` (default: `http://localhost:8787`)

## Deploy (Cloud Run)

This repo includes a simple Cloud Run deploy script for the API.

```bash
infra/cloudrun/deploy_api.sh YOUR_GCP_PROJECT_ID us-central1
```

Deploy the web UI to Cloud Run too:

```bash
infra/cloudrun/deploy_web.sh YOUR_GCP_PROJECT_ID https://YOUR_API_RUN_URL us-central1
```

Notes:

- Cloud Run/Build/Vertex AI require **billing enabled**. Small demo usage is usually low-cost, but it is not guaranteed to be $0.
- The deploy script defaults to **Vertex AI auth** (no API key) by setting `GOOGLE_GENAI_USE_VERTEXAI=true` on the service.
- Cleanup script:

```bash
infra/cloudrun/cleanup_api.sh YOUR_GCP_PROJECT_ID us-central1
```

Cleanup everything (api + web + container repo):

```bash
infra/cloudrun/cleanup_all.sh YOUR_GCP_PROJECT_ID us-central1
```

After deploy, set your web env:

```bash
export NEXT_PUBLIC_API_BASE_URL=https://YOUR_CLOUD_RUN_URL
```

## Docs

- `docs/architecture.md`
- `docs/demo_script.md`
- `docs/threat_model.md`
