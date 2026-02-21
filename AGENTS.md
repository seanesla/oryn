# AGENTS

This repository is a workspace monorepo for `oryn`.

- `apps/api` — Fastify backend, session API, Gemini Live WS proxy, SSE events, and pipeline orchestration.
- `apps/web` — Next.js client app with real-time UI and WebSocket + SSE runtime.
- `packages/tools` — `@oryn/tools` — 8 tool modules: `grounded-search`, `fetch-and-extract`, `extract-claims`, `classify-disagreement`, `build-evidence-cards`, `build-clusters`, `optimize-choice-set`, `cache`.
- `packages/agent` — `@oryn/agent` — system instruction builder and epistemic contract text.
- `packages/shared` — `@oryn/shared` — shared TypeScript types and wire protocol.
- `infra` — Cloud Run deployment scripts and cleanup helpers.

Unless explicitly changed by newer higher-priority rules, all agents should follow this file.

## Hackathon context (persistent)

- Before planning or implementing work for this project, read `docs/gemini-live-agent-hackathon-context.md`.
- Treat that document as the persistent contest brief across new agent sessions.
- If hackathon requirements change, update `docs/gemini-live-agent-hackathon-context.md` so future sessions inherit the latest constraints.

## Quick command reference

### Setup

- `npm install`
- `cp apps/api/.env.example apps/api/.env`
- `cp apps/web/.env.example apps/web/.env`

### Core workspace commands

- `npm run dev` — run API and web together.
- `npm run dev:api` — API only.
- `npm run dev:web` — web only.
- `npm run build` — root build entry (currently web build).
- `npm run start` — root start entry (web start).
- `npm run lint` — web lint + api lint.
- `npm run test` — api tests.
- `npm run typecheck` — api typecheck.

### API package commands

- `npm -w apps/api run dev`
- `npm -w apps/api run start`
- `npm -w apps/api run lint`
- `npm -w apps/api run typecheck`
- `npm -w apps/api run test`
- `npm -w apps/api run test -- src/sessions/routes.test.ts`
  - Run a single test file.
- `npm -w apps/api run test -- src/pipeline/sse.test.ts -t "SSE emits session updates during analysis"`
  - Run a single named test case.
- `npm -w apps/api run test -- --help`
  - Show vitest flags available in this repo.

### Web package commands

- `npm -w apps/web run dev`
- `npm -w apps/web run build`
- `npm -w apps/web run start`
- `npm -w apps/web run lint`

### Deployment commands

- `infra/cloudrun/deploy_api.sh YOUR_GCP_PROJECT_ID [REGION]`
- `infra/cloudrun/deploy_web.sh YOUR_GCP_PROJECT_ID NEXT_PUBLIC_API_BASE_URL [REGION]`
- `infra/cloudrun/cleanup_api.sh YOUR_GCP_PROJECT_ID [REGION]`
- `infra/cloudrun/cleanup_all.sh YOUR_GCP_PROJECT_ID [REGION]`

### Cloud Run onboarding workflow (important for new contributors)

- Prereqs before any deploy:
  - `gcloud` CLI installed and logged in (`gcloud auth login`, `gcloud auth application-default login` for local debug if needed).
  - A GCP project with Billing enabled.
  - Project permissions to create Cloud Run, Cloud Build, Artifact Registry, and service accounts.
- Deploy steps for a fresh instance:
  1. `export REGION=us-central1` (or your preferred region).
  2. `export PROJECT_ID=<gcp-project-id>`.
  3. Set auth mode in your shell:
     - Vertex AI path (recommended for Cloud Run):
       - `export GOOGLE_GENAI_USE_VERTEXAI=true`
       - `export GOOGLE_CLOUD_PROJECT=${PROJECT_ID}`
       - `export GOOGLE_CLOUD_LOCATION=${REGION}`
     - Developer API path (alternative): `export GEMINI_API_KEY=<key>`.
  4. Deploy API first, so you can capture the URL:
     - `infra/cloudrun/deploy_api.sh ${PROJECT_ID} ${REGION}`
     - `gcloud run services describe oryn-api --project ${PROJECT_ID} --region ${REGION} --format='value(status.url)'`
  5. Deploy web with the API URL and same region:
     - `infra/cloudrun/deploy_web.sh ${PROJECT_ID} https://<api-url> ${REGION}`
  6. Optional smoke checks:
     - `gcloud run services list --project ${PROJECT_ID} --region ${REGION}`
     - `gcloud run services logs read oryn-api --project ${PROJECT_ID} --region ${REGION}`
- Service/account assumptions created by scripts:
  - Service name: `oryn-api`, `oryn-web`.
  - Service account: `oryn-cloudrun@<project>.iam.gserviceaccount.com`.
  - Region default is `us-central1` unless passed.
  - Script creates Artifact Registry repo `oryn` in your region and writes image tags as `${REGION}-docker.pkg.dev/<project>/oryn/<service>`.
- Notes from real deployments:
  - For `SESSION_STORE=firestore`, ensure the runtime service account has Firestore permissions (`roles/datastore.user` or equivalent).
  - For CORS in cloud web, align `CORS_ORIGIN` on API with web origin URL.
  - `cleanup_all.sh` deletes services, repo, and optional service account; it does not clean up unrelated IAM bindings.
- `cleanup_api.sh` only removes API service + service account; `cleanup_all.sh` removes both services, repo, and optional service account.

When touching shell scripts, validate quickly with `bash -n` and keep executable flags.

### Cloud Build CI/CD (live)

A Cloud Build trigger `deploy-on-push-main` is configured on GCP. It fires on every push to `main` in `seanesla/oryn` and uses the `oryn-cloudrun` service account. Build status appears as commit checks on GitHub.

**How it works (canary rollback flow):**

1. Builds both Docker images from `apps/api/Dockerfile` and `apps/web/Dockerfile`.
2. Deploys both to Cloud Run with `--no-traffic` (new revision receives zero users).
3. Health-checks the new revision at its canary URL.
4. If checks pass, shifts 100% traffic to the new revision.
5. If checks fail, the build step exits non-zero, Cloud Build marks it failed, and the previous revision keeps serving — automatic rollback with zero downtime.

**Required file:** `cloudbuild.yaml` at the repo root. Before committing, verify these substitution variables match your Cloud Run setup:

- `_REGION` — your Cloud Run region (e.g. `us-central1`).
- `_WEB_SERVICE` / `_API_SERVICE` — your Cloud Run service names (default `oryn-web` / `oryn-api`).

**IAM prerequisite:** The `oryn-cloudrun` service account must have the **Cloud Run Developer** role. Verify in IAM & Admin > IAM; add if missing.

## Style and conventions

### TypeScript conventions

- Use strict TypeScript and keep `tsconfig` compile clean.
- Keep file-level formatting with 2-space indentation and semicolons.
- Use double quotes for strings to match the project baseline.
- Use `type` imports when importing only types.
- Prefer explicit return types on exported functions.
- Keep `async` function names verb-first and descriptive (`runSessionAnalysis`, `fetchAndExtract`).

### Import ordering

Use this order in each file:

1. third-party packages
2. workspace package imports (`@oryn/tools`, `@oryn/agent`, `@oryn/shared`)
3. local project imports

Split groups with one blank line.

### Naming

- Components/React props interfaces: `PascalCase`.
- Functions, variables, hooks, and route handlers: `camelCase`.
- Interfaces and type aliases: descriptive `PascalCase`.
- Booleans should read like predicates (`isConnected`, `hasEvidence`).
- Avoid one-letter names outside of tightly scoped loops.

### Error handling rules

- Validate inputs with Zod before processing route logic.
- Map errors to API semantics:
  - `400` for validation failures.
  - `404` for missing session/resource.
  - `202` for accepted async operations.
- Do not leak raw stack traces to clients; keep payloads user-safe.
- For background async flows, do not block the request; catch + log the promise.
- For external calls (fetch / Gemini), wrap in `try/catch` and degrade gracefully.
- For stream handlers (SSE / WS), send a clear error and close when startup fails.

### Data types and schema

- Use shared protocol types from `@oryn/shared` for messages and session artifacts.
- Use `zod` + `satisfies z.ZodType<...>` for typed input schemas.
- Use discriminated unions for protocol envelopes.
- Avoid creating duplicate shapes that diverge from shared contracts.

### API architecture rules

- `apps/api/src/server.ts` is the composition root; keep plugin and route registration there.
- Route modules should accept injected `SessionStore` and `SessionEventBus` when possible.
- Mutations should persist state then publish once via event bus.
- SSE endpoints must set required headers before writing stream bytes.
- Keep request handlers short and delegate heavy logic to pipeline/services.
- `apps/api/src/pipeline/analyze.ts` is a thin orchestrator — it imports tool functions from `@oryn/tools` and wires them together. Do not add tool logic inline.
- `apps/api/src/live/tooling.ts` declares all 7 Gemini function declarations and dispatches to `@oryn/tools` modules. System instruction comes from `@oryn/agent`.
- `apps/api/src/middleware/rate-limit.ts` provides IP/session-based rate limiting. Apply via Fastify `onRequest` hooks.
- `apps/api/src/core/storageCache.ts` provides optional GCS L2 caching (enabled via `ORYN_GCS_ENABLE` + `ORYN_GCS_BUCKET` env vars).

### Streaming behavior

- SSE writes should include:
  - `text/event-stream`
  - `no-cache, no-transform`
  - `keep-alive`
  - `X-Accel-Buffering: no`
- Send initial session snapshot immediately after subscribe/connect.
- WS route should always send initial state right after socket opens.
- Use message `type` tags consistently (`session.state`, `transcript.chunk`, `audio.chunk`, `error`, `debug`).

### Front-end conventions

- Add `"use client"` to files using hooks, browser APIs, or mutable state.
- Keep state ownership clear: session state flows through `useSessionRuntime` and shared `runtime` contracts.
- Keep API calls in `apps/web/src/lib/` service modules (e.g. `sessions.ts`, `api.ts`).
- Components should remain mostly presentational; move orchestration into hooks/modules.
- Prefer `useMemo`, `useCallback`, and clear dependency arrays for heavy UI computations.
- Cleanup resources in effect returns (event listeners, sockets, audio contexts, timers).

### Package rules

- `packages/shared` — only serializable types, protocol unions, and shared constants. Export through `src/index.ts`.
- `packages/tools` — stateless tool functions with typed inputs/outputs. Each tool accepts an optional `GoogleGenAI` client so tests run without credentials. Export through `src/index.ts`.
- `packages/agent` — system instruction builder and epistemic contract. No app-specific logic; it takes a `SessionArtifacts` and returns a string.
- Do not place app-only logic (Fastify routes, store implementations) in any `packages/` module.

### Tests and test authoring

- Add or update tests for any API behavior change.
- Keep tests in `apps/api/src/**/*.test.ts`.
- For new async endpoints, include status assertions and at least one payload shape assertion.
- For SSE/WS behavior, use helper utilities in `apps/api/src/__tests__/helpers.ts`.
- Prefer deterministic expectations over arbitrary long waits.
- If test uses real timers, keep default test timeout in mind (`20_000` in vitest config).

### Repository boundaries and risk controls

- Avoid editing unrelated files unless the change directly depends on them.
- If changing deployment scripts, verify service account and IAM assumptions remain consistent.
- Do not remove or weaken auth, CORS, or streaming header behavior without updating tests.
- Avoid changing `package-lock.json` without first checking whether all package manifests are updated.

## Commit hygiene notes

- Keep changes scoped.
- If lockfile updates happen, explain dependency impact in your final note.
- Mention any behavior or environment assumptions introduced by the change.
