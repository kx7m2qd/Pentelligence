import { test } from 'node:test';
import assert from 'node:assert/strict';
import { screenToSvg } from '../src/utils/mapCoordinates.js';

test('map coordinates account for scaling and letterbox translation', () => {
  const svg = { getScreenCTM: () => ({ inverse: () => ({ a: .5, b: 0, c: 0, d: .5, e: -50, f: -20 }) }) };
  assert.deepEqual(screenToSvg(svg, 580, 400), { x: 240, y: 180 });
  const start = screenToSvg(svg, 100, 100);
  const end = screenToSvg(svg, 140, 160);
  assert.equal(end.x - start.x, 20);
  assert.equal(end.y - start.y, 30);
});
test('map coordinates handle non-axis-aligned transforms and unavailable SVGs', () => {
  const svg = { getScreenCTM: () => ({ inverse: () => ({ a: 0, b: -1, c: 1, d: 0, e: 0, f: 0 }) }) };
  assert.deepEqual(screenToSvg(svg, 10, 20), { x: 20, y: -10 });
  assert.equal(screenToSvg(null, 10, 20), null);
  assert.equal(screenToSvg({ getScreenCTM: () => null }, 10, 20), null);
});
