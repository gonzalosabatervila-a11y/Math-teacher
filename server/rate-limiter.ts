export interface RateDecision { allowed: boolean; remaining: number; retryAfterMs: number }
interface Bucket { start: number; count: number }

export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  constructor(private readonly options: { limit: number; windowMs: number; maxBuckets: number }) {}

  get size(): number { return this.buckets.size; }

  check(key: string, now: number): RateDecision {
    this.prune(now);
    let bucket = this.buckets.get(key);
    if (!bucket) {
      if (this.buckets.size >= this.options.maxBuckets) this.buckets.delete(this.buckets.keys().next().value as string);
      bucket = { start: now, count: 0 };
      this.buckets.set(key, bucket);
    }
    if (bucket.count >= this.options.limit) return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, bucket.start + this.options.windowMs - now) };
    bucket.count += 1;
    return { allowed: true, remaining: this.options.limit - bucket.count, retryAfterMs: 0 };
  }

  prune(now: number): number {
    let removed = 0;
    this.buckets.forEach((bucket, key) => {
      if (now - bucket.start >= this.options.windowMs) { this.buckets.delete(key); removed += 1; }
    });
    return removed;
  }
}
