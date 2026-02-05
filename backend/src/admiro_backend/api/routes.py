from typing import List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from admiro_backend.services.filters import filter_frag_vis_ind

router = APIRouter(prefix="/api")


class FragVisIndFilters(BaseModel):
    ind_list: List[str]


@router.post("/fragvisind-data")
async def get_frag_vis_ind(params: FragVisIndFilters):
    try:
        return filter_frag_vis_ind(params.ind_list)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
