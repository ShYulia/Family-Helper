import { loadSiteSelectors, openManualLoginSession } from './automation/index.js';

const SITE_SELECTORS_PATH = 'data/site-selectors.json';
const AUTH_STATE_PATH = 'data/auth-state.json';

// One-time (or re-run-when-expired) setup: opens a real, visible browser
// at the site and waits for a human to log in by hand. The password is
// never seen, typed, or stored by this code — only the resulting
// cookies/localStorage get saved, to AUTH_STATE_PATH, for dry runs and the
// eventual unattended weekly agent to reuse. Run this yourself, in your
// own terminal, whenever data/auth-state.json is missing or stale.
async function main(): Promise<void> {
  const config = await loadSiteSelectors(SITE_SELECTORS_PATH);
  console.log(
    'Opening a browser window. Log in to your real account by hand, then ' +
      'come back here and press Enter.',
  );
  await openManualLoginSession(config.baseUrl, AUTH_STATE_PATH);
  console.log(
    `Saved your session to ${AUTH_STATE_PATH}. Dry runs (and eventually the ` +
      'weekly agent) will reuse it from now on.',
  );
}

main().catch((error: unknown) => {
  console.error('Login setup failed:', error);
  process.exitCode = 1;
});
