# Tecfac Forge

Tecfac Forge turns technical source material into a developer learning workspace. The current application combines imported Markdown lessons, source concept analysis, tutoring, and a project-based workflow.

## Current implementation

- Next.js application with Better Auth session gates and PostgreSQL/Prisma persistence paths.
- Public GitHub Markdown import, pinned to a commit with original source references for new imports.
- Source concept extraction, learning paths, and lesson progress.
- Projects with five practical milestones, per-learner submissions, evidence feedback, revisions, self-checks, and independent owner/admin review.
- Interactive learning web connecting projects, milestones, selected sources, and extracted concepts.
- Groq tutoring with server-authorized lesson and project context, teaching modes, token limits and shared daily request budgets.
- Saved private notes, lesson bookmarks, and workspace-scoped source/project/note search.

Concept assessment is AI feedback, not a calibrated certification of mastery. Reading progress and project self-checks do not award concept mastery. Imported material is limited to public GitHub Markdown, not full codebase analysis or execution.

See [production operations](docs/production.md) for deployment, verification, budgets and limitations.

## Local setup

```sh
npm install
npm run db:generate
```

Configure `.env.local` from `.env.example`, including PostgreSQL and Better Auth settings. Apply database migrations **before starting the upgraded application**. For fresh versus existing databases, follow [the migration instructions](docs/project-learning.md#database-rollout); existing databases require a verified baseline, not a blind deploy.

```sh
npm run dev
```

Sign in, import a public repository in Workspace, then open Projects to define an outcome and select source material. Roadmap opens the connected learning web. AI tutoring additionally requires `GROQ_API_KEY`.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

`npm run test:database` creates a random isolated PostgreSQL schema, migrates it, verifies import/project/review/history/library/quota behavior, and drops only that schema. It requires a configured database and permission to create schemas. Unit tests never load deployment credentials. `node scripts/check-ai.mjs` performs a small, billable Groq connection check.

See [project learning architecture, limitations, and rollout](docs/project-learning.md) for evidence states, authorization, provenance, and remaining work.
