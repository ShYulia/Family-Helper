# AI Decision Engine — Architecture

This document designs the module that sits between the **Intent** layer
(`RecurringItem`) and the **Catalog** layer (`ProductOffer`) described in
`docs/project-status.md`, and produces the **Decision** layer output
(`PurchaseDecision`). See `src/domain/` for the schemas referenced
throughout.

This is a design document, agreed before implementation. Nothing here is
built yet.

## 1. Responsibility

The Decision Engine's job is narrow and specific: **given one shopping
need and a set of real candidate products, decide which product (if any)
best satisfies that need, and explain why.**

It owns all business logic — matching, scoring, trade-offs between price
and preference. Everything else in the system is deliberately kept out of
its scope:

- It does not search the supermarket site or know how candidates were
  found — it only evaluates what it's given.
- It does not touch a browser, DOM, or selectors.
- It does not execute a purchase or talk to `CartAutomation` — it produces
  data, it doesn't act on it.
- It does not persist anything — reading/writing `RecurringItem`s or
  `PurchaseHistoryEntry`s is someone else's job.

A separate, not-yet-built **orchestrator** is the only component that
talks to both this engine and the browser automation layer (see §7).

## 2. Inputs and Outputs

```ts
interface DecisionEngineInput {
  item: RecurringItem; // the need being decided for
  candidates: ProductOffer[]; // real products found for item.searchTerms
  defaultWeights: DecisionWeights; // household-level fallback weights
  history?: PurchaseHistoryEntry[]; // this item's past outcomes (optional, unused today)
}

interface DecisionEngine {
  decide(input: DecisionEngineInput): Promise<DecisionResult>;
}
```

`decide` is declared `async` from day one even though the rule-based v1
below does no I/O and could run synchronously. This is intentional: an
LLM-assisted engine (§8) _will_ need to be async, and declaring the
interface that way now means swapping the implementation later never
requires touching the orchestrator or any caller.

**Output** is a result, not always a decision — the engine must be able to
say "nothing here is acceptable" instead of being forced into a bad pick:

```ts
type DecisionResult =
  | { status: 'decided'; decision: PurchaseDecision }
  | { status: 'no-match'; recurringItemId: string; reason: string };
```

This is a small addition to `src/domain/` we'll make when implementing —
`PurchaseDecision` itself is unchanged, it's just wrapped in a result type
so "no acceptable candidate" is a normal, typed outcome rather than a
thrown error or a fabricated decision.

## 3. Evaluation pipeline

Candidates are evaluated in two phases, in this order:

1. **Filter (hard constraints)** — candidates that flat-out violate a
   non-negotiable rule are removed before any scoring happens.
2. **Score (soft preferences)** — every surviving candidate gets a
   weighted score; the highest-scoring one is chosen.

Splitting these matters: preferences that must never be violated (a
dietary restriction, an excluded brand) shouldn't be "outvoted" by a great
price. Filtering removes that risk entirely instead of relying on scoring
weights to suppress it.

If filtering removes every candidate, the engine returns `no-match` with a
reason (e.g. `"all 5 candidates excluded: none are gluten-free"`) —
covered in §5.

### Quantity

Once an offer is chosen, `quantityToBuy` is derived, not guessed:

```
quantityToBuy = ceil(convert(item.quantity, chosenOffer.packageSize.unit) / chosenOffer.packageSize.amount)
```

e.g. needing 2 l of milk in 1 l bottles → buy 2. Unit conversion (g↔kg,
ml↔l) is a small, isolated helper the engine depends on — no business
logic of its own.

## 4. How preferences influence the decision (hard vs. soft)

This is the core design decision of the engine — which `ItemPreferences`
fields are absolute rules (filters) and which are trade-offs (scoring
inputs):

| Preference                  | Hard filter or soft score?                                                                                        | Why                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `excludedBrands`            | **Hard** — always removed                                                                                         | An explicit "never buy this" should never be overridden by price.                                          |
| `dietary`                   | **Hard** — candidate must have all listed tags                                                                    | Dietary tags represent things like allergies or ethics, not taste; treated as a requirement, not a nicety. |
| `maxPrice` / `maxUnitPrice` | **Hard** — candidates over the ceiling are removed                                                                | A budget ceiling is a constraint, not a preference to weigh against others.                                |
| Availability (`available`)  | **Hard** — unavailable offers are always removed                                                                  | An unavailable product can't be bought regardless of how well it scores.                                   |
| `preferredBrands`           | **Soft**, unless `substitutionAllowed === false` — then it becomes a **hard** filter (only listed brands survive) | Normally a nudge, not a rule — but the user can opt into a hard requirement per item.                      |
| `preferredPackageSize`      | **Soft** — closer to preferred size scores higher, within `tolerance`                                             | A slightly different size is rarely a dealbreaker.                                                         |
| `preferOnPromotion`         | **Soft** — increases the effective weight of the promotion factor                                                 | A nice-to-have, not a requirement.                                                                         |

This table is the first thing to revisit if real usage shows a preference
behaving the "wrong" way — e.g. if `dietary` should support both required
and merely-preferred tags. That's a schema change, not an engine rewrite,
because filtering and scoring are already separate steps.

## 5. Scoring

Every candidate that survives filtering gets a score in `[0, 1]`:

```
score = Σ(weight[factor] × normalizedFactorScore[factor]) / Σ(weight[factor])
```

Factors (each normalized to `[0, 1]`, higher is always better):

- **price** — inverse-normalized relative to the candidate set (cheapest
  candidate scores 1, most expensive scores 0).
- **unitPrice** — same, but per kg/l, so different package sizes are
  comparable on equal footing.
- **promotion** — 1 if an active promotion exists, 0 otherwise (boosted
  further if `preferOnPromotion` is set).
- **brandMatch** — 1 if brand is in `preferredBrands`, 0 otherwise.
- **packageSizeFit** — 1 at an exact match to `preferredPackageSize`,
  decaying to 0 at the edge of `tolerance`.
- **dietaryMatch** — fraction of _preferred_ (non-required) dietary tags
  the candidate also has.

Weights come from `item.preferences.weights`, falling back field-by-field
to `defaultWeights` (a household-level default, e.g. weighted toward
price and unit price unless a household says otherwise). Normalizing
_within the candidate set_ — rather than against some absolute scale —
means the weights stay meaningful regardless of whether we're comparing
€1 spice jars or €80 meat boxes.

Ties are broken deterministically (e.g. stable sort, first-by-`siteProductId`)
— same inputs must always produce the same decision. That determinism is
worth protecting deliberately: a system nudging real spending needs to be
predictable and debuggable, not "usually" reproducible.

## 6. Reasoning generation

`PurchaseDecision.reasoning` (already in the schema) must be prose a
person can read in two seconds, not a score dump. It's built from the same
per-factor scores used in §5:

1. For the chosen offer, take the factors that contributed positively
   (`weight × normalizedFactorScore` above some small threshold).
2. Rank them by contribution, descending.
3. Render the top 3–4 through small factor-specific templates, e.g.:
   - price → `"12% cheaper per liter than the other options"`
   - promotion → `"currently 20% off"`
   - brandMatch → `"matches your preferred brand"`
   - packageSizeFit → `"closest match to your preferred 1 l size"`

Raw scores and weights are not exposed in `reasoning` itself — that field
is for a human, not a debug log. If we later want the numeric detail too
(for tuning weights, say), that's a separate, additional field — not a
reason to make `reasoning` less readable.

The `no-match` reason (§2) is built the same way, but from _why_ filtering
removed everything, e.g. `"3 candidates found; all excluded — none are
gluten-free"`.

## 7. Keeping browser automation separate

The engine's only contact with the outside world is its typed input and
output (§2) — it never imports anything automation-related, and
`src/domain/cart-automation.ts` never imports anything decision-related.

A future **orchestrator** (not yet built, likely `src/orchestration/` or
similar) is the only piece that knows about both sides:

```
for each active RecurringItem:
  candidates := automation.search(item.searchTerms)      # Catalog, from automation layer
  result := decisionEngine.decide({ item, candidates, defaultWeights })  # Decision
  if result.status == 'decided':
    cartActions.push({ siteProductId: result.decision.chosenOffer.siteProductId,
                        quantity: result.decision.quantityToBuy })
  else:
    flag result for human review (no automatic action)

automation.addToCart(cartActions)                          # Execution
```

Neither layer needs to change if the other one does — the automation
layer could be rewritten from Puppeteer to Playwright, or the decision
engine swapped for an LLM-based one (§8), without touching the other
side, because both only ever speak through `src/domain/` types.

## 8. Evolution path: rule-based → hybrid → LLM/ML-assisted

Because `DecisionEngine` is an interface, not a class, every stage below
is a _new implementation of the same contract_ — nothing upstream or
downstream ever needs to change.

- **v1 — Rule-based (this design).** Deterministic weighted scoring, as
  described above. Fast, free, fully explainable, no external calls. This
  is what we implement next.
- **v2 — Hybrid.** Keep rule-based filtering and scoring for anything
  exact and cheap to compute (price, unit price, promotion, dietary
  filters) — there's no reason to pay LLM latency/cost for arithmetic.
  Add an LLM call only for genuinely fuzzy judgment the rules struggle
  with: e.g. re-ranking the top few survivors by "which of these actually
  matches what the household meant", disambiguating noisy search results
  ("oat milk" vs. "oat milk chocolate drink"), or writing richer natural-
  language `reasoning` text from the same factor data §6 already computes.
- **v3 — Learned weights.** `PurchaseHistoryEntry` (already modeled, unused
  today) records whether a human kept, swapped, or removed each decision.
  A separate component — not the engine itself — could read that history
  and adjust `DecisionWeights` or `preferredBrands` over time (e.g. "this
  household keeps swapping brand A for brand B — raise B's effective
  brand-match weight"). This stays decoupled: the engine keeps consuming
  `DecisionWeights`, it just stops being the only thing that produces
  them.

One requirement should hold across every stage, not just v1: **a decision
without a human-readable reason is not acceptable output.** Rule-based
scoring makes that easy; an LLM- or ML-based engine has to be held to the
same bar deliberately, since it's the one thing that keeps this system
trustworthy for something spending-adjacent.

## 9. Explicitly out of scope for this design

- The orchestrator itself (§7 sketches its shape, doesn't build it).
- The LLM-assisted and learned-weight engines (§8) — interface is designed
  to allow them, neither is implemented now.
- Persistence of `RecurringItem`s or `PurchaseHistoryEntry`s.
- The browser automation layer / `CartAutomation` implementation.
