import { logger } from "./logger.js";
import { config } from './config.js';

export async function notifyScanEvent(event, {
  webhookUrl = config.discordWebhookUrl, send = fetch, warn = message => logger.warn(message),
} = {}) {
  if (!webhookUrl) return false;
  const text = `[Pentelligence] ${event.target}: ${event.message}`;
  // Leave room for an ellipsis and never split a surrogate pair.
  let content = '';
  for (const character of text) {
    if (content.length + character.length > 1999) break;
    content += character;
  }
  if (content.length < text.length) content += '…';
  try {
    const response = await send(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      warn(`[notifications] Discord delivery failed (HTTP ${response.status})`);
      return false;
    }
    return true;
  } catch {
    // Transport errors can contain the secret webhook URL; never log it.
    warn('[notifications] Discord delivery failed (network error or timeout)');
    return false;
  }
}
