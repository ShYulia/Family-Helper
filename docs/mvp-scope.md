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

## Risk Note: Terms of Use

The real identity and URL of the chosen supermarket are kept out of this
repository and stored only in the local, never-committed `.env` file (see
`.env.example`). Findings below refer to it generically as
[SUPERMARKET_NAME] / [SUPERMARKET_URL].

A review of [SUPERMARKET_NAME]'s Terms of Use turned up the following
points relevant to a personal-use browser automation tool:

- **`robots.txt` explicitly disallows automated access** to the cart,
  checkout, and account pages — precisely the pages this agent would need
  to operate on.
- **The Terms of Use do not explicitly name bots, scraping, scripts, or
  automated tools** anywhere in the document.
- A clause prohibiting **"unauthorized penetration to servers, accounts
  and/or data"** exists, but its wording targets unauthorized access (e.g.
  breaking into someone else's account) rather than credentialed automated
  access to one's own account; the document does not clarify whether
  automated-but-credentialed use falls under this clause.
- A clause prohibiting **"testing, scanning, and/or sampling of the
  website"** exists and is the closest textual match to something like
  browser automation, though it was not clearly written with bots in mind.
- A clause limiting the site to **"private, not commercial use"** exists,
  which aligns with this project's intended use (a personal agent
  operating the household's own account).
- Net effect: the Terms of Use are silent on the specific question of
  personal browser automation — there is no clause explicitly permitting
  it, and no clause explicitly forbidding it by name. The practical risk
  is not spelled out in the document itself; it is a judgment call to be
  made explicitly before building against this site, not inferred here.

### Decision

**Proceed**, subject to the Non-Negotiable Safety Rule above (no automated
checkout, no automated payment). Reasoning:

- The intended use — a personal agent operating the household's own
  account, with no resale or redistribution — matches the site's stated
  "private, not commercial use" clause.
- The `robots.txt` disallow on cart/checkout/account pages is standard
  e-commerce boilerplate aimed at search-engine crawlers indexing
  session-specific pages; it is not treated here as a signal specifically
  targeted at personal automation tools.
- The primary identified project risk is **operational**, not addressed by
  this document as a legal conclusion: automated-looking traffic could be
  rate-limited or the account could be flagged/suspended by the
  supermarket's own systems. This should be mitigated through
  implementation choices (human-like pacing, single account, no scale),
  not treated as a reason to halt.
- This decision applies to v1 as scoped. It should be revisited if scope,
  scale, or the target supermarket changes.
