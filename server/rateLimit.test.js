import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateLimit } from './rateLimit.js';

function request(limiter) {
  const result = { allowed: false, status: 200, headers: {} };
  const res = {
    set(name, value) { result.headers[name] = value; return this; },
    status(value) { result.status = value; return this; },
    json(value) { result.body = value; },
  };
  limiter({ ip: '192.0.2.1', baseUrl: '/api', path: '/auth/login' }, res, () => { result.allowed = true; });
  return result;
}

test('nested limiter policies keep independent budgets and reset at the boundary', t => {
  let time = 0;
  const general = rateLimit({ max: 10, windowMs: 1000, now: () => time });
  const auth = rateLimit({ max: 2, windowMs: 1000, now: () => time });
  t.after(() => { general.close(); auth.close(); });
  for (let i = 0; i < 2; i++) {
    assert.equal(request(general).allowed, true);
    assert.equal(request(auth).allowed, true);
  }
  assert.equal(request(general).allowed, true);
  const rejected = request(auth);
  assert.equal(rejected.status, 429);
  assert.equal(rejected.headers['Retry-After'], '1');
  time = 1000;
  assert.equal(request(auth).allowed, true);
});

test('periodic sweep releases expired counters while retaining live ones', t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  let time = 0;
  const limiter = rateLimit({ max: 1, windowMs: 1000, now: () => time });
  t.after(() => limiter.close());
  request(limiter);
  time = 500;
  t.mock.timers.tick(1000);
  assert.equal(request(limiter).status, 429);
  time = 1000;
  t.mock.timers.tick(1000);
  // Rewind the injected clock so the request itself cannot reset the bucket.
  // Success proves the interval actually removed the expired entry.
  time = 500;
  assert.equal(request(limiter).allowed, true);
});
