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

function passwordMatches(candidate) {
  const expected = Buffer.from(config.appPassword);
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
  if (!passwordMatches(req.body?.password)) return res.status(401).json({ error: 'invalid password' });

  cleanupExpiredSessions();
  const session = createAccessSession(config.sessionTtlHours);
  res.status(201).json({ accessToken: session.token, expiresInHours: config.sessionTtlHours });
});

router.post('/logout', (req, res) => {
  const token = String(req.headers['x-access-token'] || '').trim();
  if (token) deleteAccessSession(token);
  res.status(204).end();
});

export default router;
