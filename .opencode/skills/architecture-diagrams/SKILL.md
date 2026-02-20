---
name: architecture-diagrams
description: Create polished Structurizr architecture diagrams (modeling, export, and README embedding) for any project.
license: MIT
compatibility: opencode
metadata:
  domain: architecture
  format: structurizr
  output: png
---

## Purpose

Use this skill to create architecture diagrams for any codebase using Structurizr DSL, with a repeatable workflow:

1. model real system boundaries and dependencies from code
2. generate diagram views from DSL
3. export shareable 16:9 PNGs
4. embed outputs in `README.md`

## When To Use

- User asks for architecture diagrams, system diagrams, C4-style diagrams, or flow diagrams.
- Repo has multiple services/routes and needs a high-level visual explanation.
- User wants diagram images in docs/README.

## Rules

- Do not invent architecture. Model only what can be verified from repo code/docs.
- Prefer explicit technology names for stack visibility (for example: `MongoDB`, `Redis`, `PostgreSQL`).
- Keep views readable: fewer nodes and short labels beat exhaustive clutter.
- Keep dark theme + minimal accent colors unless user asks otherwise.
- Default image output: 16:9.

## Workflow

### 1) Discover real architecture

- Read top-level docs first (`README.md`, `architecture.md`, ADRs).
- Inspect entry points and integrations:
  - API routes/endpoints
  - frontend API callers
  - persistence/cache adapters
  - external API clients
- Identify:
  - actors/users
  - core app containers/services
  - storage/cache
  - external dependencies
  - optional integrations/fallbacks

### 2) Write Structurizr DSL

- Create/update `structurizr/workspace.dsl`.
- Define model with clear element names and optional tags.
- Create two views by default:
  - **General architecture** (all core components)
  - **Main feature** (primary user flow)
- Use concise relationship text; avoid long protocol-heavy labels.
- If readability suffers, aggregate related externals into grouped nodes.

### 3) Style for readability

- Use a restrained palette:
  - dark background
  - one core accent for primary components
  - one optional accent for optional integrations
- Increase node text and line thickness enough for README viewing.
- Remove unnecessary boundary/group boxes if they create visual noise.

### 4) Validate and export

- Validate/export static site with Structurizr CLI:

```bash
bash structurizr/bin/structurizr-cli/structurizr.sh validate -w structurizr/workspace.dsl
bash structurizr/bin/structurizr-cli/structurizr.sh export -w structurizr/workspace.dsl -f static -o structurizr/out
```

- Export final PNGs with repo exporter script if available:

```bash
npm run diagrams:export
```

- If no exporter exists, create one that:
  - renders 16:9 outputs
  - applies branded header/logo
  - avoids text overlap
  - outputs to `structurizr/diagrams/*.png`

### 5) Embed in README

- Add a focused `Architecture Diagrams` section in `README.md`.
- Embed final image paths.
- Keep surrounding copy concise and factual.

## Quality Checklist

- Diagrams generated and committed paths exist.
- No overlapping node labels.
- Arrows are readable and not unnecessarily tangled.
- Tech stack names are explicit (not vague placeholders).
- `main-feature` view only includes nodes needed for the story.
- README references correct image files.

## Common Fixes

- **Too cluttered:** reduce node count, shorten labels, switch to container view for main flow.
- **Tiny nodes:** reduce total elements in view or tighten layout spacing.
- **Weird connectors:** adjust layout direction and routing (`Direct` vs `Orthogonal`).
- **Unclear storage stack:** rename nodes to explicit products (for example `MongoDB`, `Upstash Redis`).
