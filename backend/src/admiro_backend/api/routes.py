import asyncio
import time
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import ORJSONResponse
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from admiro_backend.settings import get_settings
from admiro_backend.services.filters import (
    filter_frag_vis_ind,
    filter_frag_vis_reg,
    filter_summ_stats_ind,
)
from admiro_backend.services.response_cache import ResponseTtlCache, build_cache_key

router = APIRouter(prefix="/api")
_settings = get_settings()
_fragvisreg_limiter = asyncio.Semaphore(
    max(1, int(getattr(_settings, "fragvisreg_max_concurrency", 2)))
)
_summ_stats_cache = ResponseTtlCache(
    enabled=_settings.response_cache_enabled,
    ttl_seconds=_settings.response_cache_ttl_seconds,
    max_entries=_settings.response_cache_max_entries_summ_stats,
)
_fragvisreg_cache = ResponseTtlCache(
    enabled=_settings.response_cache_enabled,
    ttl_seconds=_settings.response_cache_ttl_seconds,
    max_entries=_settings.response_cache_max_entries_fragvisreg,
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


def _format_server_timing(total_ms: float, compute_ms: float, serialize_ms: float) -> str:
    return (
        f"total;dur={total_ms:.1f}, "
        f"compute;dur={compute_ms:.1f}, "
        f"serialize;dur={serialize_ms:.1f}"
    )


def _json_response(payload: dict, cache_status: str, started_at: float, computed_at: float):
    serialize_started_at = time.perf_counter()
    response = ORJSONResponse(content=payload)
    serialize_finished_at = time.perf_counter()

    response.headers["X-Admiro-Cache"] = cache_status
    if _settings.server_timing_enabled:
        total_ms = (serialize_finished_at - started_at) * 1000.0
        compute_ms = (computed_at - started_at) * 1000.0
        serialize_ms = (serialize_finished_at - serialize_started_at) * 1000.0
        response.headers["Server-Timing"] = _format_server_timing(
            total_ms=total_ms, compute_ms=compute_ms, serialize_ms=serialize_ms
        )

    return response


@router.post("/fragvisind-data")
async def get_frag_vis_ind(params: FragVisIndFilters):
    try:
        return await run_in_threadpool(filter_frag_vis_ind, params.ind_list)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summ-stats-ind-data")
async def get_summ_stats_ind(params: SumStatIndFilters):
    started_at = time.perf_counter()
    request_payload = params.model_dump(exclude_none=True)
    cache_key = build_cache_key("/api/summ-stats-ind-data", request_payload)
    try:
        cached = _summ_stats_cache.get(cache_key)
        if cached.hit:
            computed_at = time.perf_counter()
            return _json_response(cached.value, "HIT", started_at, computed_at)

        payload = await run_in_threadpool(filter_summ_stats_ind, params.phases, params.mpp)
        _summ_stats_cache.set(cache_key, payload)
        computed_at = time.perf_counter()
        return _json_response(payload, "MISS", started_at, computed_at)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fragvisreg-data")
async def get_frag_vis_reg(params: FragVisRegFilters):
    started_at = time.perf_counter()
    request_payload = params.model_dump(exclude_none=True)
    cache_key = build_cache_key("/api/fragvisreg-data", request_payload)
    try:
        cached = _fragvisreg_cache.get(cache_key)
        if cached.hit:
            computed_at = time.perf_counter()
            return _json_response(cached.value, "HIT", started_at, computed_at)

        async with _fragvisreg_limiter:
            payload = await run_in_threadpool(
                filter_frag_vis_reg,
                params.plot_type,
                params.phase_state,
                params.region,
                params.ancestry,
                params.mpp,
            )
        _fragvisreg_cache.set(cache_key, payload)
        computed_at = time.perf_counter()
        return _json_response(payload, "MISS", started_at, computed_at)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
