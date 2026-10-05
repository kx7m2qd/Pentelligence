import app from './app.js';
import { config } from './config.js';
import { recoverInterruptedScans } from './db.js';
import { ensureTemplates } from './modules/templates.js';
import { startScheduler } from './scheduler.js';
import { logger } from './logger.js';

const recovered = recoverInterruptedScans();
logger.info({ recovered }, 'startup scan recovery complete');
app.listen(config.port, () => {
  logger.info({ port: config.port }, 'server listening');
  ensureTemplates();
  startScheduler();
});
