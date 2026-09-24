import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prefersReducedMotion, subscribeToReducedMotion } from '../src/lib/motionPreference.js';

test('motion preference reads system changes and removes its listener', t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else delete globalThis.window;
  });
  let listener;
  const media = {
    matches: true,
    addEventListener(event, callback) { assert.equal(event, 'change'); listener = callback; },
    removeEventListener(event, callback) {
      assert.equal(event, 'change');
      assert.equal(callback, listener);
      listener = undefined;
    },
  };
  globalThis.window = { matchMedia(query) {
    assert.equal(query, '(prefers-reduced-motion: reduce)');
    return media;
  } };
  assert.equal(prefersReducedMotion(), true);
  let observed;
  const unsubscribe = subscribeToReducedMotion(() => { observed = prefersReducedMotion(); });
  media.matches = false;
  listener();
  assert.equal(observed, false);
  unsubscribe();
  assert.equal(listener, undefined);
  globalThis.window = {};
  assert.equal(prefersReducedMotion(), false);
  assert.doesNotThrow(() => subscribeToReducedMotion(() => {})());
});
