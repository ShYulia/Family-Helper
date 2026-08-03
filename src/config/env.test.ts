import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';

describe('loadEnv', () => {
  it('parses a valid NODE_ENV', () => {
    const env = loadEnv({ NODE_ENV: 'production' });
    expect(env.NODE_ENV).toBe('production');
  });

  it('defaults NODE_ENV when missing', () => {
    const env = loadEnv({});
    expect(env.NODE_ENV).toBe('development');
  });

  it('throws a clear error naming the invalid variable', () => {
    expect(() => loadEnv({ NODE_ENV: 'not-a-real-env' })).toThrow(/NODE_ENV/);
  });
});
