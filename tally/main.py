from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from tally.api import router
from tally.config import ROOT

class NoCacheStaticFiles(StaticFiles):
    """The frontend is plain ES modules. Without this a browser can keep an old module
    that imports a file that has since moved, and the whole app fails to start."""

    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        response.headers["Cache-Control"] = "no-cache"
        return response


app = FastAPI(title="Tally")
STATIC = ROOT / "static"
app.mount("/static", NoCacheStaticFiles(directory=STATIC), name="static")
app.mount("/assets", StaticFiles(directory=ROOT / "assets"), name="assets")
app.include_router(router)


@app.get("/")
def landing():
    return FileResponse(STATIC / "index_landing.html")

@app.get("/app")
def app_dashboard():
    return FileResponse(STATIC / "index.html")

