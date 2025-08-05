import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import mime from 'mime-types';
import { nanoid } from 'nanoid';

const TMP = process.env.MEDIA_TEMP;

const storage = multer.diskStorage({
  async destination(_r, _f, cb) {
    const dir = path.join(TMP, nanoid(8));
    await fs.mkdir(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_r, file, cb) {
    const ext = mime.extension(file.mimetype) || 'bin';
    cb(null, `${nanoid(11)}.${ext}`);
  }
});

export const uploadImage = multer({ storage }).single('image');
export const uploadVideo = multer({ storage }).single('video');
