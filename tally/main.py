from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from tally.api import router
from tally.config import ROOT

app = FastAPI(title="Tally")
STATIC = ROOT / "static"
app.mount("/static", StaticFiles(directory=STATIC), name="static")
app.mount("/assets", StaticFiles(directory=ROOT / "assets"), name="assets")
app.include_router(router)


@app.get("/")
def index():
    return FileResponse(STATIC / "index.html")
