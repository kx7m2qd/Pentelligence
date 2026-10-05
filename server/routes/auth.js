import crypto from 'node:crypto';
import express from 'express';
import { config } from '../config.js';
import {
  cleanupExpiredSessions,
  createAccessSession,
  deleteAccessSession,
  getAccessSession,
} from '../workspaces.js';

const router = express.Router();

function passwordMatches(candidate, password = config.appPassword) {
  const expected = Buffer.from(password);
  const supplied = Buffer.from(String(candidate || ''));
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
}

router.get('/status', (req, res) => {
  if (!config.appPassword) return res.json({ authenticationRequired: false, authenticated: true });

  const token = String(req.headers['x-access-token'] || '').trim();
  const session = token ? getAccessSession(token) : null;
  res.json({ authenticationRequired: true, authenticated: Boolean(session) });
});

router.post('/login', (req, res) => {
  if (!config.appPassword) return res.json({ authenticationRequired: false, authenticated: true });
  const role = passwordMatches(req.body?.password) ? 'admin' : config.analystPassword && passwordMatches(req.body?.password, config.analystPassword) ? 'analyst' : null;
  if (!role) return res.status(401).json({ error: 'invalid password' });

  cleanupExpiredSessions();
  const session = createAccessSession(config.sessionTtlHours, role);
  res.status(201).json({ accessToken: session.token, expiresInHours: config.sessionTtlHours, role });
});

router.post('/logout', (req, res) => {
  const token = String(req.headers['x-access-token'] || '').trim();
  if (token) deleteAccessSession(token);
  res.status(204).end();
});

export default router;
