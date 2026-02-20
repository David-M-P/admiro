from typing import List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from admiro_backend.services.filters import filter_frag_vis_ind, filter_summ_stats_ind

router = APIRouter(prefix="/api")


class FragVisIndFilters(BaseModel):
    ind_list: List[str]


class SumStatIndFilters(BaseModel):
    phases: List[str]
    mpp: int


@router.post("/fragvisind-data")
async def get_frag_vis_ind(params: FragVisIndFilters):
    try:
        return filter_frag_vis_ind(params.ind_list)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summ-stats-ind-data")
async def get_summ_stats_ind(params: SumStatIndFilters):
    try:
        return filter_summ_stats_ind(params.phases, params.mpp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
