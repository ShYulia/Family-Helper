import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';

const validSource = {
  SUPERMARKET_NAME: 'Test Market',
  SUPERMARKET_URL: 'https://example.com',
};

describe('loadEnv', () => {
  it('parses a valid NODE_ENV', () => {
    const env = loadEnv({ ...validSource, NODE_ENV: 'production' });
    expect(env.NODE_ENV).toBe('production');
  });

  it('defaults NODE_ENV when missing', () => {
    const env = loadEnv(validSource);
    expect(env.NODE_ENV).toBe('development');
  });

  it('throws a clear error naming an invalid variable', () => {
    expect(() => loadEnv({ ...validSource, NODE_ENV: 'not-a-real-env' })).toThrow(/NODE_ENV/);
  });

  it('throws a clear error listing multiple missing variables', () => {
    expect(() => loadEnv({})).toThrow(/SUPERMARKET_NAME/);
    expect(() => loadEnv({})).toThrow(/SUPERMARKET_URL/);
  });
});
