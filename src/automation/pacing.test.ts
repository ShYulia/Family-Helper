import { describe, expect, it } from 'vitest';
import { humanPacingDelay } from './pacing.js';

describe('humanPacingDelay', () => {
  it('waits within a given [min, max] range', async () => {
    const start = Date.now();
    await humanPacingDelay({ minMs: 20, maxMs: 40 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(15);
    expect(elapsed).toBeLessThan(200);
  });

  it('defaults to a human-scale range', async () => {
    const start = Date.now();
    await humanPacingDelay();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(400);
  });
});
