import IORedis from 'ioredis';
import { Queue } from 'bullmq';

export const connection = new IORedis(process.env.REDIS_URL);

export const imageQueue = new Queue('image-processing', { connection });
export const videoQueue = new Queue('video-processing', { connection });
