import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notifyScanEvent } from './notifications.js';

test('Discord payload limits content and suppresses mentions', async () => {
  let sent;
  const success = await notifyScanEvent({ target: '@everyone', message: '😀'.repeat(2000) }, {
    webhookUrl: 'https://example.invalid/secret',
    send: async (_url, options) => { sent = JSON.parse(options.body); return { ok: true }; },
  });
  assert.equal(success, true);
  assert.ok(sent.content.length <= 2000);
  assert.equal(sent.content.isWellFormed(), true);
  assert.ok(sent.content.endsWith('…'));
  assert.deepEqual(sent.allowed_mentions, { parse: [] });
});
test('Discord reports HTTP/transport failures without leaking secret URLs', async () => {
  for (const send of [async () => ({ ok: false, status: 429 }), async () => { throw new Error('secret-url'); }]) {
    const logs = [];
    assert.equal(await notifyScanEvent({ target: 'test', message: 'done' }, {
      webhookUrl: 'secret-url', send, warn: message => logs.push(message),
    }), false);
    assert.equal(logs.length, 1);
    assert.ok(!logs[0].includes('secret-url'));
  }
});
test('Discord does not request anything when disabled', async () => {
  assert.equal(await notifyScanEvent({}, { webhookUrl: '', send: () => assert.fail('unexpected request') }), false);
});
