# Project Status

This document is updated at the end of sessions that produce meaningful
changes, so a future session can resume with minimal context loss. It is a
snapshot of current state, not a changelog — git history covers what
changed and when.

## Current State

- Project setup only. No Grocery Shopper Agent application code has been
  written yet — only scaffolding and one trivial placeholder function.
- Repository: https://github.com/ShYulia/Family-Helper (private).
- Docs in place: `docs/product-vision.md`, `docs/mvp-scope.md`,
  `docs/project-status.md`.
- Project scaffolding in place: `README.md`, `CLAUDE.md`, `.gitignore`,
  `.env.example`.
- TypeScript/Node.js project initialized: `package.json` (ESM, Node 20+,
  `build`/`dev`/`lint`/`format`/`typecheck`/`test` scripts), `tsconfig.json`
  (strict, NodeNext), ESLint flat config (`eslint.config.js`) with Prettier
  integration (`eslint-config-prettier`), and Vitest as the test framework
  (`vitest.config.ts`). `src/index.ts` holds a trivial `add()` placeholder
  with one passing test in `src/index.test.ts`. Lint, typecheck, and test
  all currently pass.
- MVP is scoped to a single Grocery Shopper Agent (see
  `docs/mvp-scope.md`). A target supermarket has been selected. Its real
  name and URL are intentionally kept out of the repository — they now
  live only in a local, never-committed `.env` file (created; keys
  `SUPERMARKET_NAME` and `SUPERMARKET_URL`). `.env.example` documents
  those key names with empty values. The repo continues to refer to the
  supermarket only as `[SUPERMARKET_NAME]` / `[SUPERMARKET_URL]`.
- A Terms of Use risk review for the selected supermarket was completed
  and documented in `docs/mvp-scope.md` under "Risk Note: Terms of Use".
  Summary: `robots.txt` disallows automated access to cart/checkout/account
  pages; the Terms of Use don't name bots/scraping explicitly but contain
  ambiguous clauses on unauthorized access and site "testing/scanning".
  No final go/no-go decision has been made on this risk yet.

## Open Decisions

- Whether to accept the Terms of Use risk for the selected supermarket and
  proceed, given the `robots.txt` disallow on cart/checkout/account pages
  (see `docs/mvp-scope.md` risk note).

## Next Steps

- Decide whether to proceed given the Terms of Use risk note.
- Begin implementing actual Grocery Shopper Agent functionality (login,
  recurring list handling, cart preparation) once the above is resolved.
