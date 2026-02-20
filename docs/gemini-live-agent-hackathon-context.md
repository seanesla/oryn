# Gemini Live Agent Challenge Context (Devpost)

Source of truth: <https://geminiliveagentchallenge.devpost.com/rules>

This document is a concise implementation-focused summary for coding agents working in this repo. The official rules page controls if anything conflicts.

## Core Goal

- Build a **new** next-generation multimodal AI agent that goes beyond text-in/text-out chat.
- Use a **Gemini model**.
- Build agents with **Google GenAI SDK or ADK**.
- Use at least **one Google Cloud service** and host the agent on Google Cloud.

## Allowed Categories (choose one per submission)

1. **Live Agents**
   - Focus: real-time audio/vision interaction.
   - Must support natural conversation and interruption handling (barge-in).
   - Mandatory tech: Gemini Live API or ADK, hosted on Google Cloud.
2. **Creative Storyteller**
   - Focus: interleaved multimodal output (text/image/audio/video) in one cohesive flow.
   - Mandatory tech: Gemini mixed/interleaved output, hosted on Google Cloud.
3. **UI Navigator**
   - Focus: visual understanding of UI and action execution.
   - Mandatory tech: Gemini multimodal on screenshots/screen recordings + executable actions, hosted on Google Cloud.

## Submission Must-Haves

- Project is original and created during the contest period.
- Public code repository URL.
- English submission materials (or English translation/subtitles).
- Clear project description: features, tech used, data sources, learnings.
- `README.md` with reproducible spin-up/deploy instructions.
- Proof of Google Cloud deployment (short recording OR code evidence of Google Cloud/Vertex usage).
- Architecture diagram showing major components and data flow.
- Demo video (YouTube/Vimeo) showing real working software, with pitch, up to 4 minutes scored.
- Third-party integrations are allowed but must be properly licensed and explicitly disclosed.

## Judging Weights

- **Innovation & Multimodal User Experience (40%)**
  - Beyond-text interaction quality, category-specific execution, and live fluidity.
- **Technical Implementation & Agent Architecture (30%)**
  - Cloud-native implementation quality, system design, robustness, and edge-case handling.
- **Demo & Presentation (30%)**
  - Problem/solution clarity, architecture/proof quality, and real-live demo evidence.

### Optional Bonus Contributions

- Public content about your build (blog/podcast/video): up to **+0.6**.
- Automated cloud deployment in public repo: up to **+0.2**.
- Active GDG membership proof: up to **+0.2**.

## Important Dates Mentioned in Rules

- Google Cloud credit request form deadline: **Mar 13, 2026 at 12:00 PM PT** (if needed).
- Judging period: **Mar 17 - Apr 3, 2026**.
- Potential winner notice: around **Apr 8, 2026** (fast response window).
- Public winner announcement: around **Apr 22 - Apr 24, 2026** at Google Cloud Next.

## Practical Build Guidance for This Repo

- Current architecture (`apps/api` + `apps/web`) naturally fits a **Live Agent** direction; keep real-time UX central.
- Prioritize low-latency streaming, interruption handling, and multimodal behavior over basic chat flows.
- Keep Cloud Run deployment scripts (`infra/cloudrun/`) working and reproducible.
- Keep architecture docs and demo artifacts up to date as features change.
- Track required submission evidence early (demo footage, cloud proof, diagram, README clarity).

## Compliance Reminder

- Respect Google Cloud Acceptable Use Policy and all contest eligibility/rules.
- Do not rely on this summary alone for legal/eligibility decisions; verify on the official rules page.
