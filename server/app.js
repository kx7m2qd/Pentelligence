import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import reconRouter   from './routes/recon.js';
import agentRouter   from './routes/agent.js';
import nucleiRouter  from './routes/nuclei.js';
import exploitRouter from './routes/exploit.js';
import findingsRouter from './routes/findings.js';
import authRouter from './routes/auth.js';
import programsRouter from './routes/programs.js';
import templatesRouter from './routes/templates.js';
import { config, DEFAULT_DEV_ORIGINS, validateProductionConfig } from './config.js';
import { getToolReadiness } from './tools.js';
import { checkAI } from './modules/groq.js';
import db from './db.js';
import { createWorkspace, requireAccessSession, requireWorkspace } from './workspaces.js';
import { rateLimit } from './rateLimit.js';
import { requestLogging, withScanContext } from './logger.js';
import { auditRequests, rolePolicy, requireAdmin, scanCapacity } from './security.js';
import { ownedScan } from './workspaces.js';
import exportsRouter from './exports.js';

validateProductionConfig();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '../dist');
const allowedOrigins = config.corsOrigins.length > 0 ? config.corsOrigins : DEFAULT_DEV_ORIGINS;

app.disable('x-powered-by');
app.use(requestLogging);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin is not allowed by CORS'));
  },
}));
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  if (process.env.NODE_ENV === 'production') {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  }
  next();
});
app.use(express.json({ limit: '32kb' }));
app.use('/api', rateLimit());

app.use('/api/auth', rateLimit({ max: 30 }), authRouter);

app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/health') || req.path.startsWith('/auth')) return next();
  if (config.appPassword) return requireAccessSession(req, res, next);
  req.role = 'admin';
  return next();
});

app.post('/api/session', (req, res) => {
  res.status(201).json({ workspaceToken: createWorkspace(req.accessSessionId || null).token });
});

app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/health') || req.path.startsWith('/auth') || req.path === '/session') return next();
  return requireWorkspace(req, res, next);
});

// routes
app.use('/api', auditRequests, rolePolicy);
app.use('/api', rateLimit({ max: 240, key: req => String(req.workspaceId || req.ip) }));
app.use('/api', (req, res, next) => {
  const match = req.path.match(/^\/(agent|nuclei|exploit)\/run\/(\d+)$/);
  if (req.method !== 'POST' || !match) return next();
  if (!ownedScan(req.workspaceId, match[2])) return res.status(404).json({ error: 'scan not found' });
  const reason = scanCapacity(req.workspaceId);
  if (reason) return res.status(429).json({ error: reason });
  withScanContext(Number(match[2]), next);
});
app.get('/api/admin/audit', requireAdmin, (req, res) => {
  const after = Math.max(0, Number(req.query.after) || 0);
  res.json({ events: db.prepare('SELECT * FROM audit_events WHERE workspace_id=? AND id>? ORDER BY id LIMIT 200').all(req.workspaceId, after) });
});
app.use('/api/recon',  reconRouter);
app.use('/api/exports', exportsRouter);
app.use('/api/agent',  agentRouter);
app.use('/api/nuclei', nucleiRouter);
app.use('/api/exploit', exploitRouter);
app.use('/api/findings', findingsRouter);
app.use('/api/programs', programsRouter);
app.use('/api/templates', templatesRouter);

// health check
app.get('/api/health', (req, res) =>
  res.json({
    status: 'ok',
    ai: { provider: config.aiProvider, configured: config.aiEnabled, model: config.aiModel },
    authenticationRequired: Boolean(config.appPassword),
  })
);

app.get('/api/health/ai', async (req, res, next) => {
  try {
    res.json(await checkAI());
  } catch (err) {
    next(err);
  }
});

// Kept for clients from releases before the provider-neutral AI health route.
app.get('/api/health/groq', async (req, res, next) => {
  try {
    res.json(await checkAI());
  } catch (err) {
    next(err);
  }
});

app.get('/api/health/tools', async (req, res, next) => {
  try {
    res.json(await getToolReadiness());
  } catch (err) {
    next(err);
  }
});

if (process.env.NODE_ENV === 'production') {
  app.get('/env.js', (req, res) => {
    const payload = JSON.stringify({ apiBaseUrl: '/api' }).replaceAll('<', '\\u003c');

    res.type('application/javascript').send(`window.__PENTELLIGENCE_CONFIG__ = ${payload};`);
  });

  app.use(express.static(distDir));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  void next;
  if (err?.message === 'Origin is not allowed by CORS') {
    res.status(403).json({ error: err.message });
    return;
  }

  req.log?.error({ errorType: err?.name }, 'unhandled request error');
  res.status(500).json({ error: 'internal server error' });
});

export default app;
