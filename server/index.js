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
import { config, DEFAULT_DEV_ORIGINS, validateProductionConfig } from './config.js';
import { getToolReadiness } from './tools.js';
import { checkGroq } from './modules/groq.js';
import { createWorkspace, requireAccessSession, requireWorkspace } from './workspaces.js';

validateProductionConfig();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '../dist');
const allowedOrigins = config.corsOrigins.length > 0 ? config.corsOrigins : DEFAULT_DEV_ORIGINS;

const requestBuckets = new Map();
function rateLimit({ windowMs = 60_000, max = 120 } = {}) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.baseUrl}:${req.path}`;
    const now = Date.now();
    const bucket = requestBuckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }
    bucket.count += 1;
    requestBuckets.set(key, bucket);
    if (bucket.count > max) {
      res.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'too many requests; retry shortly' });
    }
    next();
  };
}

app.disable('x-powered-by');
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
app.use('/api/recon',  reconRouter);
app.use('/api/agent',  agentRouter);
app.use('/api/nuclei', nucleiRouter);
app.use('/api/exploit', exploitRouter);
app.use('/api/findings', findingsRouter);
app.use('/api/programs', programsRouter);

// health check
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', groq: Boolean(config.groqApiKey), authenticationRequired: Boolean(config.appPassword) })
);

app.get('/api/health/groq', async (req, res, next) => {
  try {
    res.json(await checkGroq());
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

  console.error('[server] unhandled error:', err);
  res.status(500).json({ error: 'internal server error' });
});

app.listen(config.port, () => {
  console.log(`[server] running on http://localhost:${config.port}`);
});
