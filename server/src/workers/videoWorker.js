import { Worker } from 'bullmq';
import path from 'node:path';
import { connection as redis } from '../queue/queues.js';
import { convertVideo } from '../utils/ffmpegConvert.js';
import axios from 'axios';
import fs from 'node:fs/promises';

export default new Worker('video-processing', async (job) => {
  const { file, meta } = job.data;
  const outDir = path.dirname(file.path);
  const { master: finalPath } = await convertVideo(file.path, outDir, meta.variant);

  /* extract 1 frame for vision embedding */
  const jpeg = path.join(outDir, 'thumb.jpg');
  await (await import('node:child_process')).execFileSync('ffmpeg',
    ['-y', '-i', finalPath, '-vf', 'thumbnail,scale=512:-1', '-frames:v', '1', jpeg]);

  const form = new FormData();
  form.append('file', await fs.readFile(jpeg), 'thumb.jpg');

  const { data: clip } = await axios.post(
    `${process.env.PY_SERVICE}/clip-embed-image`,
    form, { headers: { ...form.getHeaders(), 'x-api-key': process.env.MAIN_SERVER_KEY } });

  const { data: vio } = await axios.post(
    `${process.env.PY_SERVICE}/violence-detect`,
    form, { headers: { ...form.getHeaders(), 'x-api-key': process.env.MAIN_SERVER_KEY } });

  const ranked = clampAndRankTags(meta.userTags, {});

  await redis.set(`result:${meta.pendingId}`, JSON.stringify({
    mediaPath: finalPath,
    mime: 'application/octet-stream',
    data: {
      vision: clip.vector,
      nsfw: null,
      violence: vio,
      tags: ranked
    }
  }), 'EX', 3600);
}, { connection: redis });
