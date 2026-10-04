from fastapi import APIRouter

from tally.api import cases, chat, monitoring, policy, review

router = APIRouter()
for module in (cases, review, monitoring, policy, chat):
    router.include_router(module.router)
