import { Router } from 'express';
import { connection as redis } from '../queue/queues.js';
import fs from 'node:fs/promises';

const router = Router();

/* GET /api/v1/result/:id – returns 404 until worker finishes */
router.get('/result/:id', async (req, res) => {
  const key = `result:${req.params.id}`;
  const blob = await redis.getBuffer(key);

  if (!blob) return res.status(404).json({ status: 'processing' });

  const doc = JSON.parse(blob.toString());
  const file = await fs.readFile(doc.mediaPath);
  res.setHeader('Content-Type', doc.mime);
  res.setHeader('X-Result-Data', Buffer.from(JSON.stringify(doc.data)).toString('base64'));
  return res.end(file);
});

export default router;
