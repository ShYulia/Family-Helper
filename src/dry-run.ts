import { access } from 'node:fs/promises';
import { RuleBasedDecisionEngine } from './decision-engine/index.js';
import type { DecisionWeights } from './domain/index.js';
import {
  loadSiteSelectors,
  openHeadedSession,
  PlaywrightCartAutomation,
  PlaywrightProductSearch,
  SessionMissingError,
} from './automation/index.js';
import { runShoppingRun } from './orchestration/index.js';
import { loadRecurringItems } from './storage/recurring-item-store.js';

const RECURRING_ITEMS_PATH = 'data/recurring-items.json';
const SITE_SELECTORS_PATH = 'data/site-selectors.json';
const AUTH_STATE_PATH = 'data/auth-state.json';

// Household-level default weights. Not meant to be the final tuned
// values — a reasonable starting point for a supervised dry run.
const defaultWeights: DecisionWeights = {
  price: 1,
  unitPrice: 1,
  promotion: 0.5,
  brandMatch: 1,
  packageSizeFit: 0.5,
  dietaryMatch: 1,
  fatPercentageMatch: 1,
  containerTypeMatch: 1,
  sizeGradeMatch: 1,
};

async function main(): Promise<void> {
  const items = await loadRecurringItems(RECURRING_ITEMS_PATH);
  if (items.length === 0) {
    console.log(
      `No recurring items found in ${RECURRING_ITEMS_PATH}. Nothing to do.`,
    );
    return;
  }

  const siteConfig = await loadSiteSelectors(SITE_SELECTORS_PATH);

  // Deliberately requires a real, pre-authenticated session rather than
  // silently falling back to a fresh guest one: guest mode has no saved
  // account, delivery location, or preferences, so the site repeatedly
  // interrupts with city-selection/delivery-method dialogs a real logged-in
  // session never sees. The dry run must exercise the same environment the
  // eventual unattended weekly agent will use, which also depends on this
  // file (see openHeadlessSession). Run `npm run setup-login` once (or
  // again, if this session has expired) to create/refresh it.
  if (!(await fileExists(AUTH_STATE_PATH))) {
    throw new SessionMissingError(AUTH_STATE_PATH);
  }
  const session = await openHeadedSession(AUTH_STATE_PATH);

  try {
    const productSearch = new PlaywrightProductSearch(session.page, siteConfig);
    const cartAutomation = new PlaywrightCartAutomation(
      session.page,
      siteConfig,
    );
    const decisionEngine = new RuleBasedDecisionEngine();

    console.log(
      `Searching and deciding for ${items.length} recurring item(s)...`,
    );
    const result = await runShoppingRun(items, {
      productSearch,
      decisionEngine,
      defaultWeights,
    });

    console.log(
      `\nDecided: ${result.cartActions.length}, needs review: ${result.needsReview.length}`,
    );
    for (const review of result.needsReview) {
      if (review.status === 'no-match') {
        console.log(
          `  [needs review] ${review.recurringItemId}: ${review.reason}`,
        );
      }
    }

    if (result.cartActions.length > 0) {
      console.log(
        `\nAdding ${result.cartActions.length} item(s) to the cart...`,
      );
      const cartResults = await cartAutomation.addToCart(result.cartActions);
      for (const cartResult of cartResults) {
        console.log(
          cartResult.success
            ? `  [added] ${cartResult.siteProductId}` +
                (cartResult.observedPrice !== undefined
                  ? ` at ${cartResult.observedPrice}`
                  : '')
            : `  [FAILED] ${cartResult.siteProductId}: ${cartResult.error}`,
        );
      }
    }

    const reviewScreenshotPath = 'data/dry-run-review.png';
    await session.page
      .screenshot({ path: reviewScreenshotPath })
      .catch(() => undefined);
    console.log(`\nReview screenshot saved to ${reviewScreenshotPath}.`);

    console.log(
      'Dry run complete. Review the cart in the browser window — this never checks out ' +
        `or pays, that stays your call. Press Enter here to close now, or it closes ` +
        `automatically in ${KEEP_OPEN_MS / 1000}s.`,
    );
    await waitForEnterKeyOrTimeout(KEEP_OPEN_MS);
  } finally {
    await session.close();
  }
}

// Bounded rather than indefinite: this script needs to work both when a
// human runs it interactively (can press Enter early) and when it's run
// non-interactively with no one able to send input at all.
const KEEP_OPEN_MS = 60_000;

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function waitForEnterKeyOrTimeout(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const onData = () => {
      clearTimeout(timer);
      resolve();
    };
    process.stdin.once('data', onData);
    const timer = setTimeout(() => {
      process.stdin.off('data', onData);
      resolve();
    }, timeoutMs);
  });
}

main().catch((error: unknown) => {
  console.error('Dry run failed:', error);
  process.exitCode = 1;
});
