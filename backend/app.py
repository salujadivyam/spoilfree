import collections, os, time
import torch
import torch.nn.functional as F
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from transformers import AutoTokenizer, AutoModelForSequenceClassification


path="./spoilfree_model"
threshold=float(os.environ.get("threshold", 0.5))   # extension applies the real bars
maxlen=int(os.environ.get("maxlen", 160))           # same as training
# comma list, e.g. chrome-extension://<store id>. unset = any origin, so set it after publishing
origins=[o.strip() for o in os.environ.get("allowed_origins", "*").split(",") if o.strip()]

app=FastAPI(docs_url=None, redoc_url=None, openapi_url=None)   # no public schema or swagger
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST"], allow_headers=["Content-Type"], allow_credentials=False)

tokenizer=AutoTokenizer.from_pretrained(path, trust_remote_code=False)
model=AutoModelForSequenceClassification.from_pretrained(path, trust_remote_code=False)
model.eval()


class TextInput(BaseModel):
    text: str=Field(max_length=5000)   # bigger bodies get a 422


rate,window=int(os.environ.get("RATE_LIMIT", 120)), 60
global_rate=int(os.environ.get("GLOBAL_RATE_LIMIT", 1500))   # backstop if one ip header is faked
hits=collections.defaultdict(collections.deque)
all_hits=collections.deque()


@app.middleware("http")
async def guard(request, call_next):
    if request.url.path=="/predict":
        try:
            size=int(request.headers.get("content-length") or 0)
        except ValueError:
            return JSONResponse({"detail": "bad request"}, status_code=400)
        if size>10000:
            return JSONResponse({"detail": "too large"}, status_code=413)
        o=request.headers.get("origin")
        if o and "*" not in origins and o not in origins:   # not a login, anyone can fake this header
            return JSONResponse({"detail": "forbidden"}, status_code=403)
        ip=(request.headers.get("x-forwarded-for") or (request.client.host if request.client else "?")).split(",")[0].strip()
        now=time.time(); q=hits[ip]
        while q and now-q[0]>window: q.popleft()
        while all_hits and now-all_hits[0]>window: all_hits.popleft()
        if len(q)>=rate or len(all_hits)>=global_rate:
            return JSONResponse({"detail": "rate limit"}, status_code=429)
        q.append(now); all_hits.append(now)
        if len(hits)>10000: hits.clear()   # keep memory bounded
    resp=await call_next(request)
    resp.headers["X-Content-Type-Options"]="nosniff"
    resp.headers["Cache-Control"]="no-store"
    return resp


@app.exception_handler(Exception)
async def fail(request, exc):
    return JSONResponse({"detail": "error"}, status_code=500)   # no stack traces out


@app.post("/predict")
def predict(input: TextInput):
    text=input.text.strip()[:2000]
    if len(text)<20:
        return {"spoiler": False, "confidence": 0.0, "series_name": None}
    x=tokenizer(text, return_tensors="pt", truncation=True, max_length=maxlen)
    with torch.no_grad():
        p=F.softmax(model(**x).logits, dim=1)[0, 1].item()   # probability of class 1=spoiler
    return {"spoiler": p>=threshold, "confidence": round(p, 4), "series_name": None}


@app.get("/")
def health():
    return {"status": "ok"}


if __name__=="__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 7860)))
