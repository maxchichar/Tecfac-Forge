# Production operations

## Release scope

The launch workflow is sign up → import public GitHub Markdown → select sources and define a project outcome → investigate/build/verify through five milestones → save evidence and revise → request workspace-owner/admin review. The learning web shows those actual records and their links. Per-account reading progress, private notes, bookmarks and search persist in PostgreSQL.

Groq supplies contextual tutoring, optional concept enrichment, practice feedback and assessment. Defaults verified against Groq's model-list API on 2026-10-02: `openai/gpt-oss-120b` for guided tutoring/debug/review and `openai/gpt-oss-20b` for explicitly selected hints/explanations/challenges. Model IDs can be overridden with `GROQ_MODEL` and `GROQ_FAST_MODEL`. There is no Jev or AI Gateway dependency.

This release does not execute learner code, import private repositories, crawl documentation sites, ingest ZIPs, certify mastery, send password-reset emails or manage workspace invitations. A self-check remains a learner claim. AI assessment is an estimate based on the supplied source and rubric; it is not independent verification. Existing legacy source records may lack a commit-pinned reference.

## Cost and data boundaries

- Database-backed limits: 8 AI requests/minute/user, 60/day/user, 1,000/day/application; daily limits are configurable. Rejected multi-limit requests roll back all counters.
- Groq: one request, no automatic paid retry; 25-second timeout, 36,000 input characters, at most 2,400 generated tokens. Chat uses the latest bounded turns and at most 900 generated tokens, including model reasoning.
- Source analysis is reused unless explicitly refreshed. Local extraction survives provider failure. Source citations from AI enrichment are checked against imported paths and verbatim text.
- Formal assessment fails without recording a grade when the AI is unavailable or returns invalid output. Local practice feedback is explicitly a text check.
- PostgreSQL enforces shared budgets across Vercel instances; quota failure closes AI access. Request counts are spending bounds, not dollar-denominated billing caps. Configure Groq's account spend limit separately.
- Tutor history lives in the browser for the current page; the server loads authorized lesson/project evidence. No raw prompts or model responses are logged. Logs include timing, model and available token counts.
- Source excerpts and learner questions are sent to Groq. Groq keys, database credentials and auth secrets stay server-side.

## Deployment

Use `.env.example` for names only. Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GROQ_API_KEY`, and canonical `BETTER_AUTH_URL` in Vercel production. The first three are secrets. Only enable GitHub/Google sign-in when both provider credentials and correct callback URLs exist; otherwise email sign-in is shown.

`postinstall` generates Prisma Client. The build does not mutate the database. Apply migrations as a deliberate release step before deploying dependent code. For an existing untracked schema, first verify an exact baseline match and take a private snapshot; never blindly mark a mismatched baseline as applied. See `project-learning.md` for migration commands. Keep snapshots outside Git and deployment uploads. Restore testing and database-provider retention policies are operator responsibilities.

`/api/health` returns an opaque 200/503, checks configuration and the quota table, and never exposes keys or account data. It does not call Groq and cannot guarantee provider availability. Vercel runtime logs contain structured application events. Test an authenticated user journey after every release, not just this health check.

Authentication mutations use shared HMAC-hashed IP quotas. The IP header is trusted only on Vercel, which overwrites `x-forwarded-for`; direct local hosting shares a local bucket. Configure an equivalent trusted proxy boundary before moving hosts. Vercel supplies TLS; the application adds anti-framing, content-type, referrer and permissions headers. The CSP sets framing/object/base restrictions, not a complete script allowlist.

CI runs lint, type checking, unit checks and a production build on pushes and pull requests. `npm run test:database` is a separate integration verification requiring a real PostgreSQL connection; it must finish successfully before schema changes are promoted.

## Monitoring and rollback

Watch health failures, provider errors, quota-unavailable events, source import failures and assessment-unavailable responses. Check daily Groq usage against the configured budget. Expired quota records can be pruned periodically with a controlled operator task; never delete active records to reset live budgets unintentionally.

Keep the last known-good Vercel deployment for rollback. These migrations are additive, so rolling application code back is safer than dropping evidence tables. Do not run `prisma db push`, reset the database, or remove migration history in production. Use a forward migration for schema corrections.

## Verification boundaries

The automated PostgreSQL workflow covers immutable source references, project creation, milestone gates, per-learner isolation, independent reviews, private notes/bookmarks/search, history retention on re-analysis and concurrent quota enforcement. Provider unit checks cover invalid/oversized responses, bounded context, and no retry. A successful Groq smoke call verifies current key/model access, not educational quality; tutor feedback should continue to be evaluated against realistic learner work.
