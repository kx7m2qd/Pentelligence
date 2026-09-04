import { config } from './config.js';

export async function notifyScanEvent(event) {
  if (!config.discordWebhookUrl) return;
  try {
    await fetch(config.discordWebhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: `[Pentelligence] ${event.target}: ${event.message}` }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    console.warn('[notifications] Discord delivery failed:', error.message);
  }
}
