# Tecfac Forge

An AI-powered developer learning platform: import a GitHub repository, a docs
site, or a course, and get back structured lessons, projects, progress
tracking, and a context-aware AI tutor.

This is a working Next.js 15 scaffold — not a finished, deployed SaaS. It's
built to a **Phase 1+2 slice** of the original product roadmap: a polished
reading/learning experience over real content, wired for real auth/AI/DB but
currently running on an in-memory mock data layer so you can see and edit
every screen with zero setup. See "What's real vs. mocked" below before you
plug in credentials.

## Quickstart

```bash
npm install
npm run dev
```

Open http://localhost:3000. Every page renders immediately — dashboard,
course/lesson/project pages, search, the AI tutor panel, and the command
palette (⌘K) all work out of the box against `lib/mock-data.ts`, no database
or API keys required.

## What's real vs. mocked

| Piece | Status |
|---|---|
| UI, design system, layout, navigation | **Real.** Every page in the spec is built. |
| Markdown → lesson pipeline (GFM, Shiki syntax highlighting, Mermaid diagrams, heading anchors, TOC) | **Real.** See `lib/markdown.ts`, exercised on `lib/mock-data.ts`'s sample lesson. |
| Command palette, search | **Real**, searching the in-memory mock data. Swap in Meilisearch by replacing the filter logic in `components/layout/CommandPalette.tsx` and `app/(app)/search/page.tsx`. |
| AI Tutor chat | **Real wiring** to the OpenAI Responses API (`app/api/ai/chat/route.ts`). Without `OPENAI_API_KEY` set, it returns a clearly-labeled stub reply so the UI is still testable. |
| Courses, lessons, projects, notes, bookmarks, progress, streaks | **Mocked**, in `lib/mock-data.ts`. Shaped to mirror `prisma/schema.prisma` 1:1, so swapping a page from mock data to a real Prisma query is a page-by-page, not a rewrite. |
| Auth (email/password, GitHub, Google) | **Scaffolded** with Better Auth (`auth/auth.ts`, `app/api/auth/[...all]/route.ts`), not wired to the UI's session state yet. Needs `DATABASE_URL` + OAuth app credentials — see below. |
| Import engine (GitHub/ZIP/GitBook/Docusaurus parsing) | **Not built.** The Workspace page has import-source UI affordances but no backend parser yet. This is the highest-effort, highest-risk piece of the whole product — see the note at the bottom. |
| Storage (Cloudflare R2), Search (Meilisearch Cloud) | **Not wired.** No infra code assumes they exist yet. |

## Environment variables

Copy `.env.example` to `.env` and fill in what you need:

- **Nothing filled in:** the app runs fully on mock data with a stub AI tutor. Good for reviewing the UI and design system.
- **`DATABASE_URL` (PostgreSQL) + `GITHUB_CLIENT_ID`/`GOOGLE_CLIENT_ID` etc.:** needed before `/login`'s social buttons or `/api/auth/*` do anything real. Run `npx prisma db push` once you have a real Postgres instance (Supabase/Neon/Railway all work) to create the schema.
- **`OPENAI_API_KEY`:** needed before the AI Tutor gives real, lesson-grounded answers instead of the stub reply.

## A note on `prisma generate`

This scaffold was built and verified in a network-restricted sandbox that
can't reach Prisma's binary CDN (`binaries.prisma.sh`), so `npx prisma
generate` couldn't be run here, and `app/api/auth/[...all]/route.ts` (the
only file that imports the generated Prisma client) hasn't been build-tested
end to end. This is expected and not specific to your machine: run

```bash
npm install         # `prisma generate` runs automatically as a postinstall hook
npx prisma db push  # once DATABASE_URL points at a real Postgres instance
```

and it'll resolve immediately — this is standard for any Prisma project, and
it's exactly what Vercel's build step does automatically on deploy. Every
other route and page in this project (all 14 pages, the markdown pipeline,
the AI tutor route) was fully built and smoke-tested in this sandbox.

## Design system

Dark-first, Inter for UI text, JetBrains Mono for code, an indigo→violet
gradient as the one recurring accent (used deliberately sparingly — buttons,
the progress ring, active states). The signature UI element is the
gradient-stroke `ProgressRing` (`components/course/ProgressRing.tsx`), reused
across the dashboard, course cards, and the profile page as the app's
consistent way of representing mastery.

Fonts are loaded via a `<link>` tag in `app/layout.tsx` rather than
`next/font/google`, purely so this scaffold's build doesn't require
reaching `fonts.gstatic.com` in restricted environments. Swap to
`next/font/google` for the automatic self-hosting/perf benefit — see the
comment in that file.

## Known quirks

- `lib/markdown.ts` walks the markdown AST with a small hand-written
  recursive function instead of `unist-util-visit`. In this sandbox,
  `unist-util-visit@5.1.0` visited every matching node twice (confirmed in
  isolation, unrelated to this project's code), which compounded into
  runaway recursive HTML escaping and an out-of-memory crash on render. The
  hand-rolled walker sidesteps it entirely and has no such issue. Worth
  retesting `unist-util-visit` in your own environment before assuming this
  is a permanent constraint — it may well be sandbox-specific.

## Suggested next steps, in order

1. **Wire one page off mock data onto real Prisma queries** (start with
   `/dashboard` or `/course/[slug]`) once you have `DATABASE_URL` set, to
   prove out the data-fetching pattern before converting the rest.
2. **Build the GitHub import pipeline** for one real repo end to end (fetch →
   parse README/markdown files → create Course/Module/Lesson rows). This is
   the single highest-risk, highest-value piece of the product — validate it
   on 2-3 real repos with different structures before assuming the schema is
   right.
3. **Wire Better Auth into the UI's session state** (currently the sidebar/
   navbar assume a logged-in user unconditionally via `currentUser` in
   `lib/mock-data.ts`).
4. **Add `generateStaticParams`** to `course/[slug]` and `lesson/[slug]` once
   content comes from a real database, so lesson pages can be statically
   generated/revalidated instead of rendered on every request.
