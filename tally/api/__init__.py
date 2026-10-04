from fastapi import APIRouter

from tally.api import cases, chat, monitoring, policy, research, review, sanctions

router = APIRouter()
for module in (cases, review, monitoring, policy, chat, sanctions, research):
    router.include_router(module.router)
