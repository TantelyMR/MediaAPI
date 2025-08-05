/* eslint-disable max-lines-per-function */
import { nanoid } from 'nanoid';
import { imageQueue, videoQueue } from '../queue/queues.js';
import fs from 'node:fs/promises';
import { clampAndRankTags } from '../utils/clampTags.js';

const ack = (res, id) => res.status(202).json({ pendingId: id, status: 'queued' });

export async function handleImageUpload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'no file' });

  let meta;
  try { meta = JSON.parse(req.body.meta || '{}'); } catch { meta = {}; }

  const { outputFormat = 'webp', tags = [] } = meta;
  const pendingId = nanoid(14);

  await imageQueue.add('process-image', {
    file: req.file,
    meta: { pendingId, outputFormat, userTags: tags }
  }, { removeOnComplete: 20 });

  return ack(res, pendingId);
}

export async function handleVideoUpload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'no file' });

  let meta;
  try { meta = JSON.parse(req.body.meta || '{}'); } catch { meta = {}; }

  const { variant = 'webm', tags = [] } = meta;
  const pendingId = nanoid(14);

  await videoQueue.add('process-video', {
    file: req.file,
    meta: { pendingId, variant, userTags: tags }
  }, { removeOnComplete: 20 });

  return ack(res, pendingId);
}
