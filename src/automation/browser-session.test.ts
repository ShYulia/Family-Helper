import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  openHeadedSession,
  openHeadlessSession,
  openManualLoginSession,
  SessionMissingError,
} from './browser-session.js';

let dir: string;
let storageStatePath: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'family-helper-test-'));
  storageStatePath = join(dir, 'auth-state.json');
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('openHeadlessSession', () => {
  it('throws SessionMissingError when no saved session exists, without opening a browser', async () => {
    await expect(openHeadlessSession(storageStatePath)).rejects.toBeInstanceOf(
      SessionMissingError,
    );
  }, 30000);

  it('reuses a session saved by openManualLoginSession, headlessly', async () => {
    await openManualLoginSession(
      'about:blank',
      storageStatePath,
      async () => {},
    );

    const session = await openHeadlessSession(storageStatePath);
    await session.page.goto('about:blank');
    expect(session.page.url()).toBe('about:blank');
    await session.close();
  }, 30000);
});

describe('openHeadedSession', () => {
  it('opens a usable page with no storage state path given', async () => {
    const session = await openHeadedSession();
    await session.page.goto('about:blank');
    expect(session.page.url()).toBe('about:blank');
    await session.close();
  }, 30000);

  it("doesn't throw when the given storage state path doesn't exist yet", async () => {
    const session = await openHeadedSession(storageStatePath);
    await session.page.goto('about:blank');
    await session.close();
  }, 30000);

  it('reuses a session saved by openManualLoginSession', async () => {
    await openManualLoginSession(
      'about:blank',
      storageStatePath,
      async () => {},
    );

    const session = await openHeadedSession(storageStatePath);
    await session.page.goto('about:blank');
    expect(session.page.url()).toBe('about:blank');
    await session.close();
  }, 30000);
});

describe('openManualLoginSession', () => {
  it('waits for the human signal before saving the session', async () => {
    let resolved = false;
    const waitForHuman = () =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          resolved = true;
          resolve();
        }, 10);
      });

    await openManualLoginSession('about:blank', storageStatePath, waitForHuman);

    expect(resolved).toBe(true);
    const saved = await readFile(storageStatePath, 'utf8');
    expect(saved.length).toBeGreaterThan(0);
  }, 30000);
});
