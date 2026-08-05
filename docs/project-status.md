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
  `docs/decision-engine-architecture.md`, `docs/project-status.md`.
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
- Grocery Shopper Agent domain model added: `src/domain/` (Zod schemas,
  runtime-validated, matching the `env.ts` pattern), one file per concept,
  barrel-exported via `src/domain/index.ts`. Modeled as four layers with a
  one-way dependency — Intent → Catalog → Decision → History, plus a
  separate Execution contract:
  - **Intent** (`recurring-item.ts`) — `RecurringItem`, `ItemPreferences`,
    `DecisionWeights`, `RecurrenceRule`. Represents a shopping _need_
    (e.g. "milk, weekly, prefer organic"), not a specific product/SKU.
    Created and owned entirely by the user.
  - **Catalog** (`product-offer.ts`) — `ProductOffer`, `Promotion`. A
    snapshot of a real product on the target site (price, unit price,
    availability, promotion, brand, dietary tags). Pure observed fact,
    produced by the browser automation layer, with no opinions in it.
  - **Decision** (`purchase-decision.ts`) — `PurchaseDecision`. The AI
    decision engine's output: which offer to buy, how many, and a
    human-readable `reasoning` trail. This is the only thing the
    automation layer is allowed to consume.
  - **History** (`purchase-history.ts`) — `PurchaseHistoryEntry`. Records
    whether a human kept, swapped, or removed a past decision. Not
    consumed by anything yet — a stable shape for a future
    learned-preferences feature.
  - **Execution** (`cart-automation.ts`) — `CartAction`,
    `CartActionResult`, `CartAutomation`. The narrow interface the
    browser automation layer implements (`siteProductId` + `quantity` in,
    success/failure + observed price out). Deliberately contains no
    price/brand/preference logic, so business logic can never leak into
    the automation layer.
  - `shared.ts` holds cross-layer primitives (`Unit`, `Quantity`,
    `Priority`, `DietaryTag`).
  - Every schema/type carries a structured doc comment (What / Why /
    Layer / Who / Example) — written as learning material as well as
    documentation, per explicit request.
  - Since extended with `decision-result.ts` (`DecisionResult`, the
    `'decided' | 'no-match'` union — lets the engine say "nothing here is
    acceptable" as a typed outcome instead of a thrown error or a
    fabricated decision) and `decision-engine.ts` (`DecisionEngineInput`,
    `DecisionEngine` — the contract a future orchestrator calls; plain
    TypeScript interfaces, not Zod, matching `CartAutomation`'s
    behavioral-contract precedent).
- AI Decision Engine architecture designed and agreed:
  `docs/decision-engine-architecture.md` — a two-phase pipeline (hard
  filter, then weighted soft scoring), a hard-vs-soft table for how each
  `ItemPreferences` field is applied, the scoring formula, how
  human-readable `reasoning` is generated, and an evolution path from
  today's rule-based engine to a future hybrid/LLM-assisted one without
  changing the `DecisionEngine` interface.
- AI Decision Engine implemented per that design, in `src/decision-engine/`
  (barrel-exported via `src/decision-engine/index.ts`), built and tested
  piece by piece:
  - `units.ts` — `convertAmount` (g↔kg, ml↔l; throws across dimensions)
    and `unitsNeededToCover` (how many packages satisfy a need).
  - `hard-filters.ts` — `applyHardFilters` implements the architecture
    doc's hard/soft table: unavailable, excluded-brand, missing-required-
    dietary-tag, and over-`maxPrice` offers are always removed;
    `maxUnitPrice` is skipped (not rejected) when an offer lacks a unit
    price; `preferredBrands` only becomes a hard filter when
    `substitutionAllowed === false`. Missing dietary data fails an offer
    closed (safety-leaning); missing unit-price data just skips that one
    check — a deliberate asymmetry, noted in code comments.
  - `scoring.ts` — `resolveWeights` (item overrides onto household
    defaults) and `scoreCandidates` (per-factor `[0,1]` scores normalized
    _within the candidate set_, combined into a weighted average). A
    preference the household never stated never penalizes or rewards a
    candidate — that factor is simply omitted from the average.
    `dietaryMatch` is implemented but currently vestigial: since `dietary`
    is a hard requirement, every surviving candidate already satisfies it
    100%, so this factor always contributes a constant 1.0 today — flagged
    as the same schema gap the architecture doc already calls out (no
    separate "soft dietary preference" field yet).
  - `reasoning.ts` — `explainDecision` turns the top (up to 4)
    positive-contributing factors into human-readable lines (e.g. "60%
    cheaper than the average of the other options"), falling back to a
    generic explanation if nothing stood out; `summarizeNoMatchReasons`
    categorizes hard-filter rejection reasons (pattern-matched on their
    text — coupled to `hard-filters.ts`'s exact wording) into one summary
    for the `no-match` case.
  - `engine.ts` — `RuleBasedDecisionEngine implements DecisionEngine`,
    composing all of the above: filter → resolve weights → score → rank
    (ties broken deterministically by `siteProductId`) → compute quantity
    → explain → validate the result through `decisionResultSchema.parse`
    before returning.
  - 97 tests passing across the whole project (up from 37); typecheck and
    lint clean throughout.
- `RecurringItem` persistence added: `src/storage/recurring-item-store.ts`
  — `loadRecurringItems`/`saveRecurringItems` read/write a local JSON file
  as UTF-8, validated through the domain schema on both load (rejects a
  corrupted file with a clear error) and save (a bug elsewhere can never
  write invalid data to disk). Returns `[]` if the file doesn't exist yet,
  rather than throwing. Household data is personal, not architecture, so
  `/data/` is gitignored; `data/recurring-items.example.json` documents
  the shape, mirroring `.env.example`. Round-trips non-Latin text
  (tested with Hebrew) since the target site's language is Hebrew and
  free-text fields are plain `z.string()` — no special handling needed.
- Orchestrator added: `src/orchestration/orchestrator.ts` —
  `runShoppingRun(items, deps)` implements the loop sketched in
  `docs/decision-engine-architecture.md` §7: for each _active_
  `RecurringItem`, search for candidates, ask
  `RuleBasedDecisionEngine.decide`, and sort the outcome into
  `cartActions` (ready for a future `CartAutomation.addToCart`) or
  `needsReview` (the `'no-match'` results, for a human). It does not call
  `addToCart` itself — that stays a separate step for whenever a real
  `CartAutomation` exists.
  - New domain contract: `src/domain/product-search.ts` —
    `ProductSearch` (`search(searchTerms) -> ProductOffer[]`), the mirror
    image of `CartAutomation`: the boundary the browser automation layer
    will implement to produce candidates, instead of just consuming
    decisions.
  - Since there's no real browser automation yet, `src/orchestration/dev-fixtures.ts`
    provides a small, realistic stand-in for development: 4
    `RecurringItem`s (milk, eggs, olive oil, gluten-free bread) covering
    promotions, package-size preference, a weighted brand preference, and
    a hard dietary filter, plus a `FakeProductSearch` returning canned
    `ProductOffer`s for them. Explicitly not production code — swapped
    for a real `ProductSearch` implementation later.
  - 109 tests passing across the whole project (up from 97).

## Open Decisions

- None currently open. (Old git history containing the now-superseded
  robots.txt/Terms of Use wording was reviewed and deliberately left
  as-is — no real supermarket name/URL was ever in it, and rewriting
  would require a destructive force-push for marginal benefit.)

## Next Steps

- Build the browser automation layer implementing both `ProductSearch`
  and `CartAutomation` against the real target site (login, search,
  add-to-cart), with human-like pacing and single-account use to manage
  the operational risk noted above. It should only ever consume/produce
  `CartAction`s and `ProductOffer`s — never preferences or scoring logic.
  Once it exists, `dev-fixtures.ts`'s `FakeProductSearch` is replaced by
  it, and something needs to call `CartAutomation.addToCart` with the
  orchestrator's `cartActions` (the orchestrator itself deliberately
  doesn't call it).
- The final recurring list should eventually be editable through user
  commands, not by hand-editing JSON — noted as a future requirement, not
  built yet. `src/storage/recurring-item-store.ts`'s `load`/`save`
  functions are the primitive a future command layer would sit on top of.
- Revisit gaps flagged so far, once they start to matter in practice: the
  `dietaryMatch` scoring factor is currently a no-op (see above),
  `summarizeNoMatchReasons` is coupled to `hard-filters.ts`'s exact reason
  text rather than a structured reason code, and Hebrew-specific matching
  concerns (final-letter forms, niqqud, locale-aware sorting) noted when
  persistence was built but not yet relevant until real site search
  exists.
