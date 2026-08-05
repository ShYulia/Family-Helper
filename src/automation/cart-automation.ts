import type { Locator, Page } from 'playwright';
import type {
  CartAction,
  CartActionResult,
  CartAutomation,
} from '../domain/index.js';
import { humanPacingDelay } from './pacing.js';
import { buildProductUrl } from './site-parsing.js';
import type { SiteSelectors } from './site-selectors.js';

const normalizeText = (text: string): string => text.trim().replace(/\s+/g, ' ');

// The same product's name isn't always rendered identically in different
// places on the site — e.g. a search-result tile abbreviated "sugar-free"
// as "לל\"ס" while the product page spelled it out as "ללא סוכר". Exact
// string equality would treat that as a different product; comparing word
// overlap instead tolerates phrasing differences while still catching an
// actually different product, which shares few or no words at all.
const NAME_MATCH_MIN_OVERLAP = 0.5;

function namesRoughlyMatch(a: string, b: string): boolean {
  const wordsOf = (text: string) =>
    new Set(normalizeText(text).split(' ').filter((word) => word.length > 0));
  const wordsA = wordsOf(a);
  const wordsB = wordsOf(b);
  if (wordsA.size === 0 || wordsB.size === 0) {
    return false;
  }
  const overlap = [...wordsA].filter((word) => wordsB.has(word)).length;
  return overlap / Math.min(wordsA.size, wordsB.size) >= NAME_MATCH_MIN_OVERLAP;
}

export class PlaywrightCartAutomation implements CartAutomation {
  constructor(
    private readonly page: Page,
    private readonly config: SiteSelectors,
  ) {}

  async addToCart(actions: CartAction[]): Promise<CartActionResult[]> {
    const results: CartActionResult[] = [];

    for (const action of actions) {
      results.push(await this.addOne(action));
      await humanPacingDelay();
    }

    return results;
  }

  private async addOne(action: CartAction): Promise<CartActionResult> {
    try {
      await this.page.goto(buildProductUrl(this.config, action.siteProductId));
      await this.assertProductIdentity(action, 'before acting');

      const buyBoxCount = await this.page
        .locator(this.config.buyBoxSelector)
        .count();
      if (buyBoxCount !== 1) {
        await this.failWithDiagnostics(
          action,
          `expected exactly one buy-box container (${this.config.buyBoxSelector}), found ${buyBoxCount}`,
        );
      }
      const buyBox = this.page.locator(this.config.buyBoxSelector).first();

      // Scoped to the buy box, not page-wide: on the real target site,
      // a mini-cart/cart-summary widget elsewhere on the page reuses the
      // same CSS classes for its own per-line-item controls (belonging to
      // whatever products are already in the cart). An unscoped `.first()`
      // can silently land on that widget instead of this product's own
      // controls — see docs/project-status.md for how that was found.
      const quantityInput = await this.findExactlyOneVisible(
        buyBox.locator(this.config.quantityInputSelector),
        'quantity input',
        action,
      );
      await quantityInput.fill(String(action.quantity));

      // The site keeps both an "add" and an "update" button in the DOM,
      // toggling which one is visible depending on whether this product is
      // already in the cart. Exactly one of the two (across both
      // selectors, scoped to the buy box) should be visible; anything else
      // means we can't safely tell which control is the real one.
      const button = await this.findExactlyOneAddOrUpdateButton(buyBox, action);
      await button.click();

      await this.assertProductIdentity(action, 'after acting');

      const priceText = await buyBox
        .locator(this.config.priceSelector)
        .first()
        .textContent()
        .catch(() => null);
      const observedPrice = priceText
        ? Number(priceText.match(/(\d+(?:\.\d+)?)/)?.[1])
        : undefined;

      return {
        siteProductId: action.siteProductId,
        success: true,
        observedPrice:
          observedPrice !== undefined && Number.isFinite(observedPrice)
            ? observedPrice
            : undefined,
      };
    } catch (error) {
      return {
        siteProductId: action.siteProductId,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Confirms the product page actually displays the name of the offer the
  // decision engine chose, both before touching anything and again after
  // clicking add/update — closing the loop between "the ProductOffer that
  // was decided on" and "the product the click actually landed on".
  private async assertProductIdentity(
    action: CartAction,
    when: string,
  ): Promise<void> {
    if (!action.expectedName) {
      return;
    }
    const pageTitle = await this.page
      .locator(this.config.productPageTitleSelector)
      .first()
      .textContent()
      .catch(() => null);
    if (!pageTitle || !namesRoughlyMatch(pageTitle, action.expectedName)) {
      await this.failWithDiagnostics(
        action,
        `product identity mismatch ${when}: page shows "${pageTitle ? normalizeText(pageTitle) : '(none)'}", expected "${action.expectedName}"`,
      );
    }
  }

  private async visibleMatches(locator: Locator): Promise<Locator[]> {
    const count = await locator.count();
    const visible: Locator[] = [];
    for (let i = 0; i < count; i++) {
      if (await locator.nth(i).isVisible().catch(() => false)) {
        visible.push(locator.nth(i));
      }
    }
    return visible;
  }

  private async findExactlyOneVisible(
    locator: Locator,
    label: string,
    action: CartAction,
  ): Promise<Locator> {
    const matches = await this.visibleMatches(locator);
    if (matches.length === 1) {
      return matches[0];
    }
    return this.failWithDiagnostics(
      action,
      `expected exactly one visible ${label} in the buy box, found ${matches.length}`,
    );
  }

  private async findExactlyOneAddOrUpdateButton(
    buyBox: Locator,
    action: CartAction,
  ): Promise<Locator> {
    const addMatches = await this.visibleMatches(
      buyBox.locator(this.config.addToCartButtonSelector),
    );
    const updateMatches = await this.visibleMatches(
      buyBox.locator(this.config.updateCartButtonSelector),
    );
    if (addMatches.length + updateMatches.length === 1) {
      return addMatches[0] ?? updateMatches[0];
    }
    return this.failWithDiagnostics(
      action,
      `expected exactly one visible add/update control in the buy box, found ` +
        `${addMatches.length} add + ${updateMatches.length} update`,
    );
  }

  // Never actually returns — always throws — but is typed to return
  // Promise<never> so call sites can `return this.failWithDiagnostics(...)`
  // directly regardless of what they need to return on the success path.
  private async failWithDiagnostics(
    action: CartAction,
    message: string,
  ): Promise<never> {
    const screenshotPath = `data/cart-automation-error-${action.siteProductId}-${Date.now()}.png`;
    await this.page.screenshot({ path: screenshotPath }).catch(() => undefined);
    throw new Error(`${message} (screenshot: ${screenshotPath})`);
  }
}
