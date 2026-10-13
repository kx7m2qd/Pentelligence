import { test, after } from 'node:test';
import assert from 'node:assert/strict';

const originalFetch = globalThis.fetch;
const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
Object.defineProperty(globalThis, 'window', { configurable: true, value: { __PENTELLIGENCE_CONFIG__: { apiBaseUrl: '/custom-api' } } });
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => key.includes('workspace') ? 'fixture-workspace' : 'fixture-access' } });
const { apiImage } = await import('../src/lib/api.js');
after(() => {
  globalThis.fetch = originalFetch;
  for (const [key, descriptor] of [['window', windowDescriptor], ['localStorage', storageDescriptor]]) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});
test('screenshots use configured API base and both auth headers without URL tokens', async () => {
  const controller = new AbortController();
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/custom-api/recon/evidence/1/fixture.png');
    assert.equal(options.headers.get('x-workspace-token'), 'fixture-workspace');
    assert.equal(options.headers.get('x-access-token'), 'fixture-access');
    assert.equal(options.signal, controller.signal);
    return new Response('fixture', { headers: { 'content-type': 'image/png' } });
  };
  assert.equal((await apiImage('/recon/evidence/1/fixture.png', controller.signal)).type, 'image/png');
});
test('image loading exposes failed authorization and rejects non-image responses', async () => {
  globalThis.fetch = async () => new Response('{}', { status: 401 });
  await assert.rejects(apiImage('/recon/evidence/1/fixture.png'), /401/);
  globalThis.fetch = async () => new Response('<html/>', { headers: { 'content-type': 'text/html' } });
  await assert.rejects(apiImage('/recon/evidence/1/fixture.png'), /Invalid screenshot/);
});
