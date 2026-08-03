# Project Status

This document is updated at the end of sessions that produce meaningful
changes, so a future session can resume with minimal context loss. It is a
snapshot of current state, not a changelog — git history covers what
changed and when.

## Current State

- Project setup only. No application code has been written yet.
- Repository: https://github.com/ShYulia/Family-Helper (private).
- Docs in place: `docs/product-vision.md`, `docs/mvp-scope.md`,
  `docs/project-status.md`.
- Project scaffolding in place: `README.md`, `CLAUDE.md`, `.gitignore`,
  `.env.example`.
- MVP is scoped to a single Grocery Shopper Agent (see
  `docs/mvp-scope.md`). A target supermarket has been selected, but its
  real name and URL are intentionally kept out of the repository — they
  will live only in a local, never-committed `.env` file (not yet
  created). The repo continues to refer to it only as
  `[SUPERMARKET_NAME]` / `[SUPERMARKET_URL]`.
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
- Create the local `.env` file with the real supermarket name/URL (not
  committed).
- Begin scaffolding the TypeScript/Node.js project once the above is
  resolved.
