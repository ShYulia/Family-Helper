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
