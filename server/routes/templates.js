import express from 'express';
import { startUpdate, templatesStatus } from '../modules/templates.js';

const router = express.Router();

router.get('/status', (req, res) => {
  res.json(templatesStatus());
});

router.post('/update', async (req, res) => {
  const result = await startUpdate();
  res.status(result.started ? 202 : 409).json(result);
});

export default router;
