from fastapi import APIRouter

from tally.api import cases, chat, monitoring, policy, review, sanctions

router = APIRouter()
for module in (cases, review, monitoring, policy, chat, sanctions):
    router.include_router(module.router)
