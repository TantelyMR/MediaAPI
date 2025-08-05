import os, tempfile, json, io, uvicorn
from fastapi import FastAPI, UploadFile, Form, Header, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image
import torch, open_clip, numpy as np
from nudenet import NudeDetector

API_KEY = os.getenv("MAIN_SERVER_KEY", "")
if not API_KEY:
    raise RuntimeError("MAIN_SERVER_KEY not set")

app = FastAPI()
detector = NudeDetector()
clip_model, _, preprocess = open_clip.create_model_and_transforms('ViT-B-32', pretrained='openai')
clip_model.eval()

def check_key(key:str):            # small inline auth helper
    if key != API_KEY:
        raise HTTPException(status_code=403, detail="bad key")

@app.post("/clip-embed-image")
async def clip_embed_image(file: UploadFile, x_api_key: str = Header(...)):
    check_key(x_api_key)
    img = Image.open(io.BytesIO(await file.read())).convert("RGB")
    with torch.no_grad():
        vec = clip_model.encode_image(preprocess(img).unsqueeze(0))
        vec /= vec.norm(dim=-1, keepdim=True)
    return JSONResponse({"vector": vec.squeeze(0).cpu().tolist()})

@app.post("/clip-embed-text")
async def clip_embed_text(text: str = Form(...), x_api_key: str = Header(...)):
    check_key(x_api_key)
    tok = open_clip.tokenize([text])
    with torch.no_grad():
        vec = clip_model.encode_text(tok)
        vec /= vec.norm(dim=-1, keepdim=True)
    return JSONResponse({"vector": vec.squeeze(0).cpu().tolist()})

@app.post("/nudenet-detect")
async def nudenet_detect(file: UploadFile, x_api_key: str = Header(...)):
    check_key(x_api_key)
    tmp = tempfile.NamedTemporaryFile(delete=False)
    tmp.write(await file.read())
    tmp.close()
    res = detector.detect(tmp.name)
    os.unlink(tmp.name)
    exposed = any(d["class"].endswith("_EXPOSED") for d in res)
    return JSONResponse({"has_exposed_parts": exposed, "detections": res})

# ── ShieldGemma-2 paranoia prompts (violence) ─────────────────────────
PROMPTS = [
  "very gory violent scene", "mutilated body", "graphic gore",
  "severed head", "open wound with blood"
]
tok_prompts = open_clip.tokenize(PROMPTS)
with torch.no_grad():
    P_EMB = clip_model.encode_text(tok_prompts).float()
    P_EMB /= P_EMB.norm(dim=-1, keepdim=True)

@app.post("/violence-detect")
async def violence(file: UploadFile, x_api_key: str = Header(...)):
    check_key(x_api_key)
    img = Image.open(io.BytesIO(await file.read())).convert("RGB")
    v = preprocess(img).unsqueeze(0)
    with torch.no_grad():
        emb = clip_model.encode_image(v).float()
        emb /= emb.norm(dim=-1, keepdim=True)
    sims = (emb @ P_EMB.T).squeeze(0)
    mx = float(sims.max())
    idxs = sims.topk(3).indices.tolist()
    return JSONResponse({
        "gore_flag": mx > 0.28,
        "highest_score": mx,
        "top_prompts": [{ "prompt": PROMPTS[i], "score": float(sims[i]) } for i in idxs]
    })

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
