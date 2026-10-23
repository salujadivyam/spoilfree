import collections, os, time
import torch
import torch.nn.functional as F
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from transformers import DistilBertTokenizerFast, DistilBertForSequenceClassification

MODEL_PATH = "./spoilfree_model"
THRESHOLD = float(os.environ.get("THRESHOLD", 0.5))   

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST"], allow_headers=["Content-Type"], allow_credentials=False)

tokenizer = DistilBertTokenizerFast.from_pretrained(MODEL_PATH)
model = DistilBertForSequenceClassification.from_pretrained(MODEL_PATH)
model.eval()


class TextInput(BaseModel):
    text: str = Field(max_length=5000)    #bigger bodies will get 422 nothing is processed


# simple per-IP rate limit in memory as HF puts the real client IP in x-forwarded-for.
RATE, WINDOW = int(os.environ.get("RATE_LIMIT", 120)), 60
hits = collections.defaultdict(collections.deque)


@app.middleware("http")
async def rate_limit(request, call_next):
    if request.url.path == "/predict":
        ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "?")).split(",")[0].strip()
        now = time.time(); q = hits[ip]
        while q and now - q[0] > WINDOW: q.popleft()
        if len(q) >= RATE:
            return JSONResponse({"detail": "rate limit"}, status_code=429)
        q.append(now)
        if len(hits) > 10000: hits.clear()          # keep memory bounded
    return await call_next(request)


@app.post("/predict")
def predict(input: TextInput):
    text = input.text.strip()[:2000]
    if len(text) < 20:
        return {"spoiler": False, "confidence": 0.0, "series_name": None}
    x = tokenizer(text, return_tensors="pt", truncation=True, max_length=256)
    with torch.no_grad():
        p = F.softmax(model(**x).logits, dim=1)[0, 1].item()   # probability of class 1 = spoiler
    return {"spoiler": p >= THRESHOLD, "confidence": round(p, 4), "series_name": None}


@app.get("/")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 7860)))