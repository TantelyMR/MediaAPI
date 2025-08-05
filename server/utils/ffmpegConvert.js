import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';

const execa = promisify(execFile);

export async function convertVideo(input, outDir, variant) {
  await fs.mkdir(outDir, { recursive: true });
  const base = path.join(outDir, path.parse(input).name);

  switch (variant) {
    case 'mp4': {
      const dst = `${base}.mp4`;
      await execa('ffmpeg', ['-y', '-i', input, '-c:v', 'libx264',
        '-preset', 'fast', '-pix_fmt', 'yuv420p', dst]);
      return { master: dst };
    }
    case 'webm': {
      const dst = `${base}.webm`;
      await execa('ffmpeg', ['-y', '-i', input, '-c:v', 'libvpx-vp9',
        '-b:v', '2M', '-c:a', 'libopus', dst]);
      return { master: dst };
    }
    case 'hls': {
      const m3u8 = `${base}.m3u8`;
      await execa('ffmpeg', ['-y', '-i', input, '-profile:v', 'main',
        '-start_number', '0', '-hls_time', '4', '-hls_list_size', '0',
        '-f', 'hls', m3u8]);
      return { master: m3u8 };
    }
    case 'dash': {
      const mpd = `${base}.mpd`;
      await execa('ffmpeg', ['-y', '-i', input, '-map', '0', '-map', '-0:s',
        '-c:a', 'aac', '-c:v', 'libx264', '-f', 'dash', mpd]);
      return { master: mpd };
    }
    default:
      throw new Error(`Unknown variant ${variant}`);
  }
}