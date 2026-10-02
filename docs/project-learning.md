# Project-based learning and the learning web

## Implemented scope

A signed-in learner chooses an imported course, writes a project outcome, and selects 1–6 source lessons. Forge persists a shared project definition with five authored milestones: investigate, design, build, verify, and hand off. This is a reusable workflow, not an AI-generated or independently validated implementation plan.

`/projects` lists workspace projects and offers creation. `/project/<project-id>` contains the milestone workspace. `/roadmap` displays an interactive network with search, project filtering, pan/zoom, a next-step control, keyboard-accessible nodes, and an equivalent list view. The former mock-only project page now uses authorized database records and stable IDs. Existing callers must use project IDs rather than course-local slugs.

Project definitions belong to the course workspace. Submissions belong to the authenticated learner. The project’s legacy shared `status` and checklist fields do not determine learner progress.

## Evidence and review

Each attempt records an artifact, explanation, verification evidence, and evidence for every acceptance criterion. Plain text is rendered as text and never executed. Revisions append new attempts. The UI displays the five most recent attempts, while older attempts remain stored.

The automatic check verifies only whether required evidence is present. It does not evaluate technical truth or award a score:

- `needs_revision`: evidence is missing, or an independent reviewer requests changes.
- `submitted`: evidence is present and awaits inspection.
- `self_checked`: the learner explicitly acknowledges inspecting the criteria; the next milestone can unlock.
- `accepted`: a different workspace owner/admin reviewed the latest attempt.

All earlier milestones must be self-checked or accepted before the next submission. A reopened earlier milestone blocks further submissions, while later evidence stays visible. A new revision supersedes the prior decision and requires another self-check/review. Serializable transactions with bounded retries protect concurrent submission/review decisions.

An owner/admin can use the review queue on `/projects` to inspect another learner’s work, record feedback, and accept or request revision. Existing workspace membership is required; this change does not add invitations or role administration. Self-review is refused, including for owners. Self-checks remain available for individual learning. No project operation changes `ConceptMastery`.

## What graph edges mean

- Project → milestone: contains an authored milestone.
- Milestone → next milestone: workflow order, enforced when submitting.
- Source → milestone: learner-selected supporting reference, not a claim that the source fully supports every task.
- Concept → source: stored concept-extraction evidence, not a verified prerequisite.

Shared sources and concepts are deduplicated across displayed projects. No visual edge is fabricated merely to make the network denser. The overview is capped at six projects; individual filters cover the 50 most recent authorized projects. Concept display is capped at 16 per project and eight evidence links per source. Full prerequisite inference and arbitrary graph authoring are not included.

## Source provenance and tutoring

New GitHub imports resolve the default branch to a commit SHA, then fetch the tree and Markdown at that revision. Lessons persist `sourcePath`, `sourceUrl`, and `sourceRevision`. Analysis uses that recorded path. Legacy lessons without provenance are labeled accordingly; filenames are not reconstructed as if they were original repository paths. Existing imports are not silently re-fetched or overwritten.

The tutor accepts optional project/milestone identifiers. The server checks workspace access, milestone ownership, and lesson membership before providing the brief, acceptance criteria, selected source excerpts, and the learner’s latest saved attempt. Project/source/submission content is treated as untrusted reference data. The tutor gives guidance; it neither executes submissions nor independently certifies correctness. Unsaved form text is not sent to the tutor.

GitHub ingestion is still Markdown-only. Code parsing, symbol understanding, arbitrary project generation, sandboxed execution, and calibrated assessment remain future work. The older concept assessment system still has heuristic scoring; project progress deliberately does not depend on it.

## Database rollout

The repository previously used `db push` without migration history. Two migrations are now included:

1. `202610020001_baseline`: the schema before project learning.
2. `202610020002_project_learning`: additive provenance fields, project timestamps, milestones, submissions, and source associations.

Both run transactionally. Existing lesson provenance is nullable; no source facts or learner evidence are backfilled. The upgrade does not remove existing data.

For a **new, empty database**, set `DATABASE_URL`, then run:

```sh
npm run db:migrate
npm run db:generate
```

For an **existing database created with db push**, first back up and compare its schema with the baseline. Only if it matches, mark the baseline applied, then deploy the additive migration:

```sh
npx prisma migrate resolve --applied 202610020001_baseline
npm run db:migrate
npm run db:generate
```

Never mark a baseline applied to an empty or mismatched database. Resolve drift first. Prisma CLI does not automatically read `.env.local`; export `DATABASE_URL` securely or, on Node 20.6+, use `node --env-file=.env.local node_modules/prisma/build/index.js` in place of `npx prisma`. Deploy the migration before running application code that selects the new columns.

No hosted database is automatically altered by this change. Reverting the application does not require dropping these additive tables; avoid dropping evidence tables during rollback.

## Verification and boundaries

Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`. Project tests cover input validation, byte limits, evidence states, graph integrity, access-filter construction, prerequisite gates, self-review refusal, superseded reviews, safe HTTP errors, and tutor authorization. Unit service tests use mocked Prisma calls. `npm run test:database` separately verifies these flows against an isolated PostgreSQL schema, including concurrent quotas and re-analysis history preservation.

The new project integration suite requires `PROJECT_TEST_DATABASE_URL` pointing to an explicitly named local test database (hostname localhost/127.0.0.1 and a database name containing `test`). After migrating it, run `npm run test:projects:integration`. It creates and cleans only its own fixture records and never defaults to the hosted `.env.local` database.

Before rollout, verify fresh migration and baseline upgrade against an isolated PostgreSQL database, then exercise the authenticated create → submit → review → revise flow with two workspace members and an outsider. Check that a rejected milestone blocks the next submission, reload restores attempts, and the network follows saved state.

Rate limiting is per process and is not a distributed quota. Lists are bounded. Submission bodies are streamed with a byte limit before JSON parsing. User-submitted links are not fetched by the server. Submissions may contain sensitive code; users should omit secrets and share only within authorized workspaces.
