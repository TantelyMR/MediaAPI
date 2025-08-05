# 🖼️ Media-API

A containerized, offline-ready microservice for image & video conversion with automated content analysis and tagging.

[![CI](https://github.com/your-org/media-api/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/media-api/actions)
[![Docker pulls](https://img.shields.io/docker/pulls/your-org/media-api.svg)](https://hub.docker.com/r/your-org/media-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Features

- **Single image or video per request**  
- Output formats: `jpg`, `png`, `webp`, `mp4`, `webm`, `hls`, `dash`
- **Content analysis for every job**
  - CLIP 512-D vision vector
  - NSFW signals (NudeNet · NSFW-JS · DeepDanbooru)
  - Violence score (ShieldGemma-2 prompts)
  - Up to **33** ranked custom tags
- **No database** — files live in `/tmp`, auto-expire after 1 h
- **Completely offline**: Node.js · Python · Redis in Docker

---

## Quick Start

```bash
git clone https://github.com/your-org/media-api.git
cd media-api
cp server/.env.sample server/.env              # set MAIN_SERVER_KEY in .env
docker compose up --build`

```

Node API → http://localhost:8000
Python models → http://localhost:8001

| Method | Endpoint             | Multipart fields | Description      |
| ------ | -------------------- | ---------------- | ---------------- |
| POST   | `/api/v1/image`      | `image`, `meta`  | Convert image    |
| POST   | `/api/v1/video`      | `video`, `meta`  | Convert video    |
| GET    | `/api/v1/result/:id` | —                | Fetch job result |


| Field          | Type                                       | Default | Applies to |
| -------------- | ------------------------------------------ | ------- | ---------- |
| `outputFormat` | `"jpg"` \| `"png"` \| `"webp"`             | `webp`  | image      |
| `variant`      | `"mp4"` \| `"webm"` \| `"hls"` \| `"dash"` | `webm`  | video      |
| `tags`         | `string[]`                                 | `[]`    | both       |

[--------------------------------------------EXAMPLE---------------------------------]
## Image Upload
```bash
curl -F "image=@./samples/cat.webp" \
     -F 'meta={"outputFormat":"png","tags":["cat","cute","furry"]}' \
     http://localhost:8000/api/v1/image
```

## Server reply
```bash
{ "pendingId": "q8Sg7TQNPu3OXZ", "status": "queued" }
```
## Fetch the converted result:
```bash
curl -i http://localhost:8000/api/v1/result/q8Sg7TQNPu3OXZ
```

* Body → converted file (Content-Type matches your output).

* Header X-Result-Data → base64-encoded JSON analysis.

## Decode helper:

```bash
curl -sI http://localhost:8000/api/v1/result/q8Sg7TQNPu3OXZ \
 | grep X-Result-Data | cut -d' ' -f2 | base64 -d | jq .
```

## Sample result JSON:
```
{
  "vision": [0.014, -0.021, 0.020, "..."],
  "nsfw": {
    "has_exposed_parts": false,
    "detections": []
  },
  "violence": {
    "gore_flag": false,
    "highest_score": 0.083,
    "top_prompts": [
      { "prompt": "graphic gore", "score": 0.083 },
      { "prompt": "mutilated body", "score": 0.072 }
    ]
  },
  "tags": ["cat", "cute", "furry"]
}
```

## Architecture:

```
User → [Node API] → [Redis Queue] → [Workers: Image / Video] → [Python FastAPI: Models] → [Redis: results]
         ↑                                                                               │
         └──────────────────────────────  GET /result/:id  ──────────────────────────────┘
```

* Node API validates, parses, and enqueues jobs.

* BullMQ workers convert media, create thumbnail/frame, call Python models.

* Python FastAPI hosts CLIP, NSFW, violence endpoints (key-protected).

* Redis queues & caches; /tmp and Redis keys auto-expire after 1 h.*

```
media-api/
├─ docker-compose.yml
├─ server/
│  ├─ Dockerfile
│  ├─ .env.sample
│  ├─ package.json
│  └─ src/
│     ├─ app.js
│     ├─ routes/uploadRoutes.js
│     ├─ controllers/
│     │   ├─ uploadController.js
│     │   └─ resultController.js
│     ├─ middleware/multerSetup.js
│     ├─ queue/queues.js
│     ├─ workers/
│     │   ├─ imageWorker.js
│     │   ├─ videoWorker.js
│     │   └─ index.js
│     └─ utils/
│        ├─ clampTags.js
│        ├─ sharpConvert.js
│        └─ ffmpegConvert.js
└─ python/
   ├─ Dockerfile
   ├─ requirements.txt
   └─ app.py
```

| Key               | Required | Example                    | Description                   |
| ----------------- | -------- | -------------------------- | ----------------------------- |
| `PORT`            | no       | `8000`                     | Node listen port              |
| `REDIS_URL`       | yes      | `redis://127.0.0.1:6379/0` | Redis connection string       |
| `MEDIA_TEMP`      | no       | `/tmp/media-api`           | Working directory for uploads |
| `PY_SERVICE`      | yes      | `http://localhost:8001`    | FastAPI model server URL      |
| `MAIN_SERVER_KEY` | yes      | `yourSuperSecretKey`       | Shared secret Node ↔ Python   |


## Local Development (Without Docker)

```bash
# Redis
docker run -p 6379:6379 redis:7-alpine

# Python models (auto-reload)
cd python
pip install -r requirements.txt
MAIN_SERVER_KEY=devKey uvicorn app:app --reload --port 8001

# Node API + workers
cd ../server
npm install
export REDIS_URL="redis://127.0.0.1:6379/0"
export PY_SERVICE="http://127.0.0.1:8001"
export MAIN_SERVER_KEY="devKey"
node src/app.js

```
## Module Overview

| File                                | Role                                          |
| ----------------------------------- | --------------------------------------------- |
| `multerSetup.js`                    | Streams uploads to `/tmp`                     |
| `uploadController.js`               | Validates meta, enqueues BullMQ job           |
| `imageWorker.js` / `videoWorker.js` | Convert media & call model endpoints          |
| `resultController.js`               | Streams file and sets `X-Result-Data` header  |
| `python/app.py`                     | Hosts CLIP, NudeNet, violence — key-protected |

License

MIT © 2025