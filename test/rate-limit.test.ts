import assert from "node:assert/strict";
import { test } from "node:test";
import { createRateLimiter } from "../src/rate-limit.js";

/** A clock the test advances by hand. */
function clock(start = 0) {
  let t = start;
  return { now: () => t, tick: (ms: number) => (t += ms) };
}

test("allows up to the limit, then rejects", () => {
  const c = clock();
  const limiter = createRateLimiter({ limit: 3, windowMs: 1000, now: c.now });
  assert.deepEqual(limiter.check("a"), { allowed: true, remaining: 2 });
  assert.deepEqual(limiter.check("a"), { allowed: true, remaining: 1 });
  assert.deepEqual(limiter.check("a"), { allowed: true, remaining: 0 });
  assert.deepEqual(limiter.check("a"), { allowed: false, retryAfterMs: 1000 });
});

test("rejected requests do not extend the penalty", () => {
  const c = clock();
  const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: c.now });
  limiter.check("a");
  c.tick(400);
  assert.deepEqual(limiter.check("a"), { allowed: false, retryAfterMs: 600 });
  c.tick(300);
  assert.deepEqual(limiter.check("a"), { allowed: false, retryAfterMs: 300 });
});

test("window slides: capacity returns as old hits age out", () => {
  const c = clock();
  const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: c.now });
  limiter.check("a");
  c.tick(500);
  limiter.check("a");
  assert.equal(limiter.check("a").allowed, false);
  c.tick(501); // first hit is now outside the window, second is not
  assert.deepEqual(limiter.check("a"), { allowed: true, remaining: 0 });
  assert.equal(limiter.check("a").allowed, false);
});

test("keys are independent", () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });
  assert.equal(limiter.check("a").allowed, true);
  assert.equal(limiter.check("b").allowed, true);
  assert.equal(limiter.check("a").allowed, false);
});

test("idle keys are swept once a window has passed", () => {
  const c = clock();
  const limiter = createRateLimiter({ limit: 5, windowMs: 1000, now: c.now });
  limiter.check("a");
  limiter.check("b");
  assert.equal(limiter.size(), 2);
  c.tick(1001);
  limiter.check("c"); // triggers the sweep
  assert.equal(limiter.size(), 1);
});

test("rejects nonsense options", () => {
  assert.throws(() => createRateLimiter({ limit: 0, windowMs: 1000 }));
  assert.throws(() => createRateLimiter({ limit: 1.5, windowMs: 1000 }));
  assert.throws(() => createRateLimiter({ limit: 1, windowMs: 0 }));
});
