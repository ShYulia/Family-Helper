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

## Before Making Changes

- Read the relevant files under `docs/` first.
- When a task touches more than one file, summarize the plan before editing.
- Reference `docs/mvp-scope.md` as the current scope boundary.

## How to Make Changes

- Prefer small, reviewable diffs.
- Do not perform unrelated refactors while completing a requested task.
- Ask before adding a new npm dependency; state why it's needed.
