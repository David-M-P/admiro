import asyncio
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from admiro_backend.settings import get_settings
from admiro_backend.services.filters import (
    filter_frag_vis_ind,
    filter_frag_vis_reg,
    filter_summ_stats_ind,
)

router = APIRouter(prefix="/api")
_settings = get_settings()
_fragvisreg_limiter = asyncio.Semaphore(
    max(1, int(getattr(_settings, "fragvisreg_max_concurrency", 2)))
)


class FragVisIndFilters(BaseModel):
    ind_list: List[str]


class SumStatIndFilters(BaseModel):
    phases: List[str]
    mpp: int


class FragVisRegFilters(BaseModel):
    plot_type: str
    phase_state: str
    region: Optional[str] = None
    ancestry: str
    mpp: int


@router.post("/fragvisind-data")
async def get_frag_vis_ind(params: FragVisIndFilters):
    try:
        return await run_in_threadpool(filter_frag_vis_ind, params.ind_list)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summ-stats-ind-data")
async def get_summ_stats_ind(params: SumStatIndFilters):
    try:
        return await run_in_threadpool(filter_summ_stats_ind, params.phases, params.mpp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fragvisreg-data")
async def get_frag_vis_reg(params: FragVisRegFilters):
    try:
        async with _fragvisreg_limiter:
            return await run_in_threadpool(
                filter_frag_vis_reg,
                params.plot_type,
                params.phase_state,
                params.region,
                params.ancestry,
                params.mpp,
            )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
