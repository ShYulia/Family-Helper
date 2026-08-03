# CLAUDE.md — Project Ground Rules

Ground rules for Claude Code to follow in every future session in this repo.
This is a living document; it will be extended later.

## Language & Stack

- This project is **TypeScript/Node.js only**. Do not introduce Python, Go,
  or any other backend language without an explicit ask.

## Hard Safety Rule

- The agent being built must **NEVER** complete a checkout or process a
  payment automatically, under any circumstance. This is a hard safety
  rule, not a preference.

## Public Repository Discipline

This repository is public. Treat it as implementation-agnostic:

- Never commit the real supermarket name, URLs, CSS selectors, DOM
  structure, screenshots, fixtures, or any other implementation detail
  that identifies a specific target supermarket.
- Keep all supermarket-specific configuration local only, via `.env` or
  other gitignored local files.
- Public docs and code should read as architecture, engineering, and
  browser-automation technique — not as a discussion of a specific
  retailer or its policies.

## Before Making Changes

- Read the relevant files under `docs/` first, including
  `docs/project-status.md` for the current state, open decisions, and next
  steps.
- When a task touches more than one file, summarize the plan before editing.
- Reference `docs/mvp-scope.md` as the current scope boundary.

## End of Session

- After a session that produces meaningful changes, update
  `docs/project-status.md` to reflect current state, open decisions, and
  next steps. Keep it a snapshot, not a changelog — git history already
  covers what changed.

## How to Make Changes

- Prefer small, reviewable diffs.
- Do not perform unrelated refactors while completing a requested task.
- Ask before adding a new npm dependency; state why it's needed.
