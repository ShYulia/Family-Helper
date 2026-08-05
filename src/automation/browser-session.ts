import { access } from 'node:fs/promises';
import {
  type Browser,
  type BrowserContext,
  chromium,
  type Page,
} from 'playwright';

export interface BrowserSession {
  context: BrowserContext;
  page: Page;
  close(): Promise<void>;
}

// Thrown by openHeadlessSession when there's no saved login to reuse.
// Unattended runs must fail fast and loud on this, not block waiting for
// a human who isn't there to provide one.
export class SessionMissingError extends Error {
  constructor(storageStatePath: string) {
    super(
      `No saved session found at ${storageStatePath}. Run "npm run setup-login" first.`,
    );
    this.name = 'SessionMissingError';
  }
}

// For scheduled, unattended runs (the normal weekly case). Never opens a
// visible browser and never waits for input — if no saved session exists,
// it fails immediately with a clear, typed error instead of silently
// proceeding unauthenticated or blocking. The caller is expected to turn
// that error into a clear failure signal (log, exit code, and eventually
// a notification) rather than retry indefinitely.
export async function openHeadlessSession(
  storageStatePath: string,
): Promise<BrowserSession> {
  if (!(await fileExists(storageStatePath))) {
    throw new SessionMissingError(storageStatePath);
  }

  const browser: Browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext({
    storageState: storageStatePath,
  });
  const page = await context.newPage();

  return {
    context,
    page,
    async close() {
      await context.storageState({ path: storageStatePath });
      await context.close();
      await browser.close();
    },
  };
}

// For one-time setup, or as a fallback once a saved session has expired.
// Opens a real, visible browser at the login page and waits for a human
// to log in by hand — the password is never stored, entered, or
// automated by this code. Once the human signals they're done, the
// resulting session is saved to storageStatePath for openHeadlessSession
// to reuse on every subsequent scheduled run.
export async function openManualLoginSession(
  loginUrl: string,
  storageStatePath: string,
  waitForHuman: () => Promise<void> = waitForEnterKey,
): Promise<void> {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(loginUrl);

  await waitForHuman();

  await context.storageState({ path: storageStatePath });
  await context.close();
  await browser.close();
}

// For supervised/manual runs where a human is watching — e.g. a dry run
// before trusting the unattended path. Headed so the browser is visible.
// Reuses a saved session if one exists, but unlike openHeadlessSession
// doesn't require one: this site's search and cart-building work fine
// without being logged in, so a dry run shouldn't be blocked on it.
export async function openHeadedSession(
  storageStatePath?: string,
): Promise<BrowserSession> {
  const browser = await chromium.launch({ headless: false });
  const storageState =
    storageStatePath && (await fileExists(storageStatePath))
      ? storageStatePath
      : undefined;
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();

  return {
    context,
    page,
    async close() {
      if (storageStatePath) {
        await context.storageState({ path: storageStatePath });
      }
      await context.close();
      await browser.close();
    },
  };
}

async function waitForEnterKey(): Promise<void> {
  process.stdout.write(
    'Log in in the opened browser window, then press Enter here to continue...\n',
  );
  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => resolve());
  });
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
