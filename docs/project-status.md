# Project Status

This document is updated at the end of sessions that produce meaningful
changes, so a future session can resume with minimal context loss. It is a
snapshot of current state, not a changelog — git history covers what
changed and when.

## Current State

- Project setup only. No Grocery Shopper Agent application code has been
  written yet — only scaffolding and one trivial placeholder function.
- Repository: https://github.com/ShYulia/Family-Helper (public — kept
  implementation-agnostic; see `CLAUDE.md` "Public Repository Discipline").
- Docs in place: `docs/product-vision.md`, `docs/mvp-scope.md`,
  `docs/project-status.md`.
- Project scaffolding in place: `README.md`, `CLAUDE.md`, `.gitignore`,
  `.env.example`.
- TypeScript/Node.js project initialized: `package.json` (ESM, Node 20+,
  `build`/`dev`/`lint`/`format`/`typecheck`/`test` scripts), `tsconfig.json`
  (strict, NodeNext), ESLint flat config (`eslint.config.js`) with Prettier
  integration (`eslint-config-prettier`), and Vitest as the test framework
  (`vitest.config.ts`). `src/index.ts` holds a trivial `add()` placeholder
  with one passing test in `src/index.test.ts`. Lint, typecheck, test, and
  build all currently pass.
- Typed environment validation added: `src/config/env.ts` uses a Zod
  schema (`zod` runtime dependency) to validate `process.env`, throwing
  one aggregated error listing every missing/invalid variable at startup.
  Currently validates only `NODE_ENV` (defaults to `development`) as a
  proven placeholder — real variables (e.g. `SUPERMARKET_NAME`,
  `SUPERMARKET_URL`) will be added to the schema once code actually
  consumes them. Covered by `src/config/env.test.ts`. Required adding
  `@types/node` (dev dependency) and an explicit `"types": ["node"]` in
  `tsconfig.json` for `process`/`NodeJS` types to resolve.
- MVP is scoped to a single Grocery Shopper Agent (see
  `docs/mvp-scope.md`). A target supermarket has been selected. Its real
  name and URL are intentionally kept out of the repository — they now
  live only in a local, never-committed `.env` file (created; keys
  `SUPERMARKET_NAME` and `SUPERMARKET_URL`). `.env.example` documents
  those key names with empty values. The repo continues to refer to the
  supermarket only as `[SUPERMARKET_NAME]` / `[SUPERMARKET_URL]`.
- Engineering assumptions and risks for automating against a live retail
  site are documented in `docs/mvp-scope.md` under "Operational
  Considerations" — target-specific config stays local-only, and
  automated-traffic detection is treated as an engineering constraint to
  design around (human-like pacing, single-account operation), bounded by
  the Non-Negotiable Safety Rule.

## Open Decisions

- None currently open. (Old git history containing the now-superseded
  robots.txt/Terms of Use wording was reviewed and deliberately left
  as-is — no real supermarket name/URL was ever in it, and rewriting
  would require a destructive force-push for marginal benefit.)

## Next Steps

- Add `SUPERMARKET_NAME`/`SUPERMARKET_URL` (and any further needed
  variables) to the `env.ts` schema once code starts consuming them.
- Begin implementing actual Grocery Shopper Agent functionality (login,
  recurring list handling, cart preparation), with human-like pacing and
  single-account use to manage the operational risk noted above.
