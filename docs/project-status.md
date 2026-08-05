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
- Browser automation layer built and verified against the real target
  site, in `src/automation/` (barrel-exported via
  `src/automation/index.ts`):
  - **Library choice**: Playwright over Puppeteer, approved after a
    project-specific comparison — `storageState` session reuse and the
    trace-viewer/auto-waiting maintenance story outweighed Puppeteer's
    slightly larger stealth-plugin ecosystem, especially since the
    project's chosen bot-detection mitigation is pacing/single-account
    use, not stealth tooling. Added as a `dependencies` entry (not dev);
    `postinstall` runs `playwright install chromium` (Chromium only, not
    all three engines).
  - **`browser-session.ts`** — three purpose-built session modes, driven
    by the "unattended weekly execution" goal: `openHeadlessSession`
    (normal scheduled runs — headless, requires an existing saved
    session, throws `SessionMissingError` immediately rather than
    blocking if one is missing); `openManualLoginSession` (one-time setup
    or fallback when a session expires — headed, waits for a human to log
    in by hand, never stores/automates the password); `openHeadedSession`
    (supervised/dry-run use — headed, optionally reuses a saved session).
    `openManualLoginSession` is now wired to an entry point —
    `src/setup-login.ts` (`npm run setup-login`) — instead of sitting
    unused. Guest mode (logged out) was the original dry-run default
    because search/cart-building happened to work without logging in;
    that turned out to be the wrong call (see "Verified" below), so
    `src/dry-run.ts` now requires and reuses a real, authenticated
    `data/auth-state.json` (fails fast with `SessionMissingError`,
    pointing at `npm run setup-login`, if it's missing) — the same file
    `openHeadlessSession` will use for the eventual unattended weekly
    agent, so the dry run now exercises the actual target environment
    instead of a guest-only approximation of it.
  - **`pacing.ts`** — `humanPacingDelay`, a randomized human-scale delay
    between automated actions (the project's actual bot-detection
    mitigation, per `docs/mvp-scope.md`).
  - **`site-selectors.ts`** / **`site-config.ts`** — a generic, committed
    Zod schema describing *what kind* of selectors/URLs the automation
    layer needs, loaded from a local, gitignored `data/site-selectors.json`
    (real values) with `data/site-selectors.example.json` (placeholder
    template) committed — the same `.env`/`.env.example` pattern, applied
    to CSS selectors and DOM structure per `CLAUDE.md`'s "Public
    Repository Discipline".
  - **`site-parsing.ts`** — pure, fully unit-tested helpers: search/product
    URL building, unit-price conversion (the real site prices per 100
    g/ml; converted to this project's per-kg/l convention), and Hebrew
    package-size/brand text parsing.
  - **`product-search.ts`** / **`cart-automation.ts`** —
    `PlaywrightProductSearch`/`PlaywrightCartAutomation`, implementing the
    `ProductSearch`/`CartAutomation` domain contracts using selectors
    discovered by driving the real site interactively via `claude-in-chrome`
    (search results page structure, data attributes carrying
    `siteProductId`/name/price, a direct `/p/{code}` product-page URL that
    avoids needing to re-search by name for `addToCart`). Availability and
    the add/update-button toggle are read via element *visibility*, not
    mere DOM presence — both states appeared to always exist in the DOM
    with CSS toggling which is shown.
  - **`src/dry-run.ts`** (`npm run dry-run`) — a supervised entry point:
    loads `data/recurring-items.json`, opens a **visible** browser via
    `openHeadedSession` against the real, authenticated
    `data/auth-state.json` session, runs the real orchestrator against the
    real site, adds decided items to the real cart, saves a
    `data/dry-run-review.png` screenshot, then waits for the human to
    review and press Enter before closing. Never touches
    checkout/payment. `PlaywrightProductSearch`/the orchestrator also log
    every scraped candidate and the engine's chosen offer + reasoning to
    the console (prefixed `[dry-run debug]`) — added while diagnosing the
    bug below, left in as a standing diagnostic for supervised runs.
  - **Corrected: the earlier "full supervised dry run confirmed correct"
    claim was wrong.** A later supervised run had incorrect cart
    contents — products not on the recurring list — and that was
    root-caused this session to two compounding bugs, both now fixed and
    re-verified against the real site:
    1. `openHeadedSession`'s guest-mode session was never cleared and
       unconditionally re-saved its cookies (including cart state) to
       `data/auth-state.json` on every close. A guest cart accumulated
       leftover items across runs/manual exploration completely
       invisibly, since it's a different cart than the household's real
       account cart. Fixed by switching `dry-run.ts` to a real
       authenticated session (see `browser-session.ts` above) instead of
       trying to keep guest mode clean.
    2. `PlaywrightCartAutomation` used page-wide `.first()` for the
       quantity input and add/update buttons. On the real site, a
       mini-cart/cart-summary widget elsewhere on the page reuses the
       exact same CSS classes for its own per-line-item controls
       (belonging to whatever product is already in the cart) — `.first()`
       could silently resolve to that widget's control instead of the
       intended product's own buy-box, mutating the wrong cart line.
       Fixed with two new required `SiteSelectors` fields —
       `buyBoxSelector` (scopes every product-page lookup to the real
       buy-box container) and `productPageTitleSelector` (the on-page
       product title) — plus: all quantity/add/update lookups are now
       scoped inside the buy box; an explicit assertion that exactly one
       visible match exists for the quantity input and exactly one
       visible match exists across the add+update selectors combined,
       failing loudly (clear error + a `data/cart-automation-error-*.png`
       screenshot) if not; and a new optional `CartAction.expectedName`
       (carried from the decision engine's chosen offer name, identity
       verification only — no scoring/preference logic crosses this
       boundary) checked against `productPageTitleSelector`'s text both
       before and after clicking.
    - Re-verified live: a single-item (milk) dry run, then the full
      three-item dry run, both against the real authenticated session —
      correct product decided, buy-box assertions and identity checks
      passed silently (no mismatches), cart ended up with exactly the
      decided item(s) and nothing else.
  - **Eggs (`ביצים`) search returning 0 tiles was root-caused and fixed.**
    Searching an exact category name ("ביצים") makes the site redirect to
    a category *browse* page instead of a search-results page, and that
    template uses a different tile class than the search-results page's
    configured `productTileSelector`. Confirmed the search-results
    template's tiles carry both classes (so nothing was lost), and
    switched `data/site-selectors.json`'s `productTileSelector` to the
    broader class (real value stays local-only, per `CLAUDE.md`'s
    "Public Repository Discipline"). Live-verified: 9 real egg products
    found (up from 0), correctly parsed.
  - **Still not verified / open, so the end-to-end flow is still not
    marked verified overall**:
    - No relevance check exists between a `RecurringItem`'s `searchTerms`
      and what the site's search actually returns for the general case —
      a cookie snack pack turned up in real search results for "חלב"
      (milk) this session; it lost only because it wasn't the cheapest
      candidate, not because anything filters non-matching products.
      `requiredNameKeywords` (below) gives individual items an escape
      hatch, but nothing requires an item to set it, and nothing warns
      when one probably should.
    - Bread's tile-extraction success rate varied a lot between runs (1
      of 20 tiles parsed vs. 12 of 20, same selectors) for reasons not
      yet understood.
    - Unchanged from before: an actually-out-of-stock product was never
      observed live, so the negative case of the visibility-based
      availability check is unconfirmed; promotion `kind` is always
      labeled `'percent-off'` since the site's promotion badge doesn't
      distinguish discount types in what was inspected.
- Preference system extended well past "brand + package size" — driven by
  real household requirements (Tnuva carton 3% milk, Green free-range
  M-grade eggs, Alpro sugar-free almond milk), each live-verified against
  the real site:
  - **New `ProductOffer` facts**: `fatPercentage`, `containerType`
    (carton/bag/bottle/jar/other), `sizeGrade` (S/M/L/XL) — all parsed
    from the product name in `site-parsing.ts` (`parseFatPercentage`,
    `parseContainerType`, `parseSizeGrade`), since the site doesn't expose
    them as separate fields. Matching `ItemPreferences` fields
    (`preferredFatPercentage`/`preferredContainerType`/
    `preferredSizeGrade`) plus three new `DecisionWeights` factors
    (`fatPercentageMatch`/`containerTypeMatch`/`sizeGradeMatch`), scored
    like `brandMatch` — exact match or nothing, no partial credit.
  - **`dietaryTagSchema` gained `'free-range'` and `'sugar-free'`.**
    Deliberately reuses the *existing* hard-filter machinery (`dietary`
    was already always-hard) rather than adding new hard-filter code —
    but this only works because `ProductOffer.dietaryTags` is now
    actually populated from real scraping for the first time:
    `parseDietaryTags` in `site-parsing.ts` detects `organic` (`אורגני`),
    `free-range` (`חופש`), and `sugar-free` (`ללא (תוספת) סוכר` or the
    abbreviated `לל"ס`/`ללת"ס`) from the product name. Deliberately
    narrow — the other `DietaryTag` values still aren't parsed from real
    pages; a false negative here fails a hard filter closed (safe
    direction), but claiming a tag needs a real signal per tag, not a
    guessed keyword. (This also means bread's gluten-free requirement
    still correctly has no real signal to check against — its no-match
    outcome is honest, not a bug.)
  - **New hard filter: `ItemPreferences.requiredNameKeywords`** (string
    array, AND semantics, case-insensitive substring match against
    `offer.name`, in `hard-filters.ts`). Built for a real, demonstrated
    gap: searching a brand name alone (e.g. "אלפרו") returns that brand's
    *entire* product line, and `dietary`/`preferredBrands` alone can't
    tell "almond" apart from "soy" when both happen to be sugar-free and
    the same brand. A first, minimal, reusable step toward the
    longstanding "no relevance check" gap above — not a one-off hack.
  - **Bug found and fixed while live-testing the almond-milk item**:
    `PlaywrightCartAutomation`'s product-identity check (added earlier
    this session) compared page title to the decided offer's name with
    *exact* string equality. The real site abbreviates "sugar-free" as
    `לל"ס` on search tiles but spells it out as `ללא סוכר` on the product
    page — same product, different rendering — so the exact check
    false-positived a mismatch and blocked a correct add. Replaced with
    a word-overlap check (`namesRoughlyMatch` in `cart-automation.ts`):
    tolerant of phrasing differences, still catches an actually different
    product (which would share few or no words at all).
  - **Real households items now configured in `data/recurring-items.json`**
    (each live-verified to decide and add correctly): milk (Tnuva,
    carton, 3% — soft preferences, substitutable), eggs (Green, size M —
    soft; free-range — hard), bread (gluten-free — hard, currently always
    no-match since nothing on-site is detected as gluten-free yet), Alpro
    sugar-free almond milk (sugar-free — hard; "שקדים"/almond keyword —
    hard, to rule out Alpro's own sugar-free soy drink; brand — soft).
  - 177 tests passing across the whole project (up from 131).

## Open Decisions

- None currently open. (Old git history containing the now-superseded
  robots.txt/Terms of Use wording was reviewed and deliberately left
  as-is — no real supermarket name/URL was ever in it, and rewriting
  would require a destructive force-push for marginal benefit.)
- Decided this session: dry runs (and eventually the unattended weekly
  agent) use a real, authenticated session (`data/auth-state.json`, set
  up via `npm run setup-login`), not a guest-mode session — guest mode's
  lack of a saved account/delivery location caused repeated
  city-selection/delivery-method interruptions and, combined with the
  `.first()` bug above, was how wrong cart contents happened. A guest
  cart was also explicitly called out as not being useful as the final
  shopping cart regardless of these bugs.

## Next Steps

- Investigate bread's inconsistent tile-extraction rate (1/20 vs 12/20
  across otherwise-identical runs) before trusting it.
- Add a real, general relevance check between a `RecurringItem`'s
  `searchTerms`/`label` and candidate `ProductOffer`s — `requiredNameKeywords`
  now gives individual items a way to opt in, but nothing stops a new item
  from being added without one, and nothing warns when a search term is
  broad enough (a brand search, a category-name search) that it probably
  needs one.
- Add real parsing signals for the remaining `DietaryTag` values
  (`gluten-free`, `vegan`, `vegetarian`, `dairy-free`, `nut-free`,
  `kosher`, `halal`) in `site-parsing.ts` — only `organic`, `free-range`,
  and `sugar-free` are actually detected from real pages today; bread's
  `gluten-free` requirement has no signal to check against yet, so it
  will keep resulting in `no-match` even when a real gluten-free option
  exists on-site.
- Wire up actual unattended scheduling (e.g. Windows Task Scheduler) for
  the weekly run. This needs a headless counterpart to `src/dry-run.ts`
  using `openHeadlessSession` instead of `openHeadedSession`, and a real
  decision on what happens with a thrown `SessionMissingError` — today
  that's just an uncaught rejection; turning it into a clear, non-blocking
  failure signal (log + non-zero exit, since Telegram notifications are
  out of scope for v1 per `docs/mvp-scope.md`) is not yet built.
- Detecting an *expired* (as opposed to *missing*) saved session is still
  unbuilt — it needs a site-specific "am I actually logged in" check. Now
  more relevant than before: `dry-run.ts` hard-requires a valid session,
  so an expired one would currently fail confusingly rather than with a
  clear "please re-run npm run setup-login" signal.
- The final recurring list should eventually be editable through user
  commands (Telegram, eventually), not by hand-editing JSON — noted as a
  future requirement, not built yet. `src/storage/recurring-item-store.ts`'s
  `load`/`save` functions are the primitive a future command layer would
  sit on top of.
- Revisit gaps flagged so far, once they start to matter in practice: the
  `dietaryMatch` scoring factor is currently a no-op, `summarizeNoMatchReasons`
  is coupled to `hard-filters.ts`'s exact reason text rather than a
  structured reason code, Hebrew-specific matching concerns (final-letter
  forms, niqqud, locale-aware sorting) for real site search, the
  unconfirmed out-of-stock detection case, and the guessed-always
  `'percent-off'` promotion kind.
