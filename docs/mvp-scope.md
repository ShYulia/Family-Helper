# MVP Scope

## Definition

The MVP for Family Helper is limited to a single module: the **Grocery
Shopper Agent**, operating against one specific supermarket:

- **Supermarket:** [SUPERMARKET_NAME]
- **Website:** [SUPERMARKET_URL]

The supermarket itself will be chosen in a later stage; the MVP is scoped
around supporting exactly one, whichever it turns out to be.

## In Scope for v1

- A single Grocery Shopper Agent.
- Operating against exactly one supermarket website: [SUPERMARKET_NAME]
  ([SUPERMARKET_URL]).
- Maintaining recurring grocery lists (the household's regular, repeating
  needs).
- Automatically preparing a weekly shopping cart based on those recurring
  needs.
- Presenting the prepared cart to a human for review.
- Requiring explicit human approval before any further action is taken.

## Explicitly Out of Scope for v1

- **Meal Planner module** — no meal planning, no meal-derived grocery lists.
- **Multi-supermarket support** — no support for any supermarket other than
  the one chosen for v1.
- **Automatic checkout** — the agent does not complete or submit an order.
- **Automatic payment** — the agent does not enter, store, or process any
  payment information, and never pays.
- Any other future module (Weekend Planner, Job Search Assistant, Telegram
  notifications/approval workflows) is out of scope for v1.

## Non-Negotiable Safety Rule

The agent prepares a cart and asks for human approval. It never completes a
purchase. Under no circumstances does the agent confirm an order or make a
payment — those actions are performed exclusively by a human.

## Operational Considerations

The real identity and URL of the chosen supermarket are kept out of this
repository and stored only in the local, never-committed `.env` file (see
`.env.example`). This document and the rest of the public repository refer
to it generically as [SUPERMARKET_NAME] / [SUPERMARKET_URL], and no
site-specific implementation details (selectors, DOM structure, fixtures,
screenshots) are committed either — see `CLAUDE.md` for this as a standing
rule.

Building browser automation against a live retail website introduces a
few engineering assumptions and risks worth stating explicitly:

- **Assumption:** the agent operates a single household's own account,
  using credentials the household controls, for personal, non-commercial
  use only.
- **Dependency:** the target site's markup, login flow, and cart behavior
  are external and outside this project's control, and may change without
  notice — the automation layer will need ongoing maintenance to track
  such changes.
- **Operational risk:** automated browsing patterns can be detected by a
  site's own systems (rate-limiting, bot-detection, account flagging).
  This is treated as an engineering constraint to design around — e.g.
  human-like request pacing and single-account, non-scaled operation —
  rather than a legal question to resolve here.
- **Primary mitigation:** the Non-Negotiable Safety Rule above bounds the
  impact of any of the above — the agent never completes a purchase, so
  its effect is limited to preparing a cart for human review.
