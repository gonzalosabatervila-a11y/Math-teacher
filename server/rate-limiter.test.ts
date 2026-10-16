import { describe, expect, it } from 'vitest';
import { InMemoryRateLimiter } from './rate-limiter';

describe('InMemoryRateLimiter', () => {
  it('allows 20 requests per minute and resets after the window', () => {
    const limiter = new InMemoryRateLimiter({ limit: 20, windowMs: 60_000, maxBuckets: 1_000 });
    for (let count = 0; count < 20; count += 1) expect(limiter.check('ip', 0).allowed).toBe(true);
    expect(limiter.check('ip', 59_999).allowed).toBe(false);
    expect(limiter.check('ip', 60_000).allowed).toBe(true);
  });

  it('bounds unique keys and prunes expired buckets', () => {
    const limiter = new InMemoryRateLimiter({ limit: 20, windowMs: 60_000, maxBuckets: 1_000 });
    for (let index = 0; index < 1_500; index += 1) limiter.check(`ip-${index}`, 0);
    expect(limiter.size).toBe(1_000);
    expect(limiter.prune(60_000)).toBe(1_000);
    expect(limiter.size).toBe(0);
  });
});
