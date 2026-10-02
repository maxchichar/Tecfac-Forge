# Tecfac Forge

Tecfac Forge turns technical source material into a developer learning workspace. The current application combines imported Markdown lessons, source concept analysis, tutoring, and a project-based workflow.

## Current implementation

- Next.js application with Better Auth session gates and PostgreSQL/Prisma persistence paths.
- Public GitHub Markdown import, pinned to a commit with original source references for new imports.
- Source concept extraction, learning paths, and lesson progress.
- Projects with five practical milestones, per-learner submissions, evidence feedback, revisions, self-checks, and independent owner/admin review.
- Interactive learning web connecting projects, milestones, selected sources, and extracted concepts.
- AI tutor wiring with server-authorized lesson and optional project context.

This is not a verified production deployment. Some older surfaces—including notes, bookmarks, profile, search, and navigation course lists—still use sample data. Existing concept assessment uses heuristic scoring and should not be treated as calibrated proof of mastery. Project evidence does not automatically award concept mastery.

## Local setup

```sh
npm install
npm run db:generate
```

Configure `.env.local` from `.env.example`, including PostgreSQL and Better Auth settings. Apply database migrations **before starting the upgraded application**. For fresh versus existing databases, follow [the migration instructions](docs/project-learning.md#database-rollout); existing databases require a verified baseline, not a blind deploy.

```sh
npm run dev
```

Sign in, import a public repository in Workspace, then open Projects to define an outcome and select source material. Roadmap opens the connected learning web. AI tutoring additionally requires `OPENAI_API_KEY`.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

The existing live integration suite is opt-in and writes test records to its configured database. Run it only against a designated test database. Ordinary tests largely mock external providers and persistence; a passing suite does not establish live provider or database reliability.

See [project learning architecture, limitations, and rollout](docs/project-learning.md) for evidence states, authorization, provenance, and remaining work.
