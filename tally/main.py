from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from tally.api import router
from tally.config import ROOT

app = FastAPI(title="Tracy")
STATIC = ROOT / "static"
app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.middleware("http")
async def fresh_static(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static"):
        response.headers["Cache-Control"] = "no-cache"
    return response
app.mount("/assets", StaticFiles(directory=ROOT / "assets"), name="assets")
app.include_router(router)


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return FileResponse(STATIC / "img" / "tracy_logo.png", media_type="image/png")


@app.get("/")
def landing():
    return FileResponse(STATIC / "index_landing.html")

@app.get("/app")
def app_dashboard():
    return FileResponse(STATIC / "index.html")

