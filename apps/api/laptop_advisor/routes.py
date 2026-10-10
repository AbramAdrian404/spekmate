"""HTTP endpoints. Everything lives under /api so the frontend can proxy a single prefix."""
from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query

from . import schemas as S
from .catalog import Catalog, get_catalog
from .recommend import UnknownNeed, recommend

router = APIRouter()
CatalogDep = Annotated[Catalog, Depends(get_catalog)]


@router.get("/health", response_model=S.Health, tags=["service"], summary="Is the API alive?")
def health() -> S.Health:
    return S.Health()


# Uptime monitors and `curl -I` send HEAD, and FastAPI does not answer HEAD for a GET route on its own.
# Kept out of the OpenAPI document so the published contract stays the same.
router.add_api_route("/health", health, methods=["HEAD"], include_in_schema=False)


@router.get("/meta", response_model=S.Meta, tags=["service"], summary="Which data is being served")
def meta(cat: CatalogDep) -> S.Meta:
    return cat.meta()


@router.get("/needs", response_model=list[S.NeedInfo], tags=["catalog"], summary="The needs a laptop is judged for")
def needs(cat: CatalogDep) -> list[S.NeedInfo]:
    return cat.needs()


@router.get("/models", response_model=S.ModelList, tags=["catalog"], summary="List laptop models")
def list_models(
    cat: CatalogDep,
    condition: Annotated[S.Condition | None, Query(description="Only models with prices in this condition.")] = None,
    need: Annotated[
        str | None,
        Query(description="Need id. Keeps models with a variant rated Cocok or Bisa, dengan catatan."),
    ] = None,
    q: Annotated[str | None, Query(max_length=80, description="Words that must appear in the name or summary.")] = None,
    sort: Annotated[Literal["name", "price"], Query()] = "name",
) -> S.ModelList:
    if need is not None and cat.ds.need(need) is None:
        raise HTTPException(status_code=404, detail=f"Kebutuhan '{need}' tidak dikenal.")
    return cat.list_models(condition=condition, need=need, q=q, sort=sort)


@router.get("/models/{model_id}", response_model=S.ModelDetailOut, tags=["catalog"],
            summary="One model with all its variants")
def get_model(model_id: str, cat: CatalogDep) -> S.ModelDetailOut:
    detail = cat.model_detail(model_id)
    if detail is None:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' tidak ditemukan.")
    return detail


@router.get("/variants/{variant_id}", response_model=S.VariantOut, tags=["catalog"], summary="One configuration")
def get_variant(variant_id: str, cat: CatalogDep) -> S.VariantOut:
    variant = cat.get_variant(variant_id)
    if variant is None:
        raise HTTPException(status_code=404, detail=f"Varian '{variant_id}' tidak ditemukan.")
    return variant


@router.post("/recommendations", response_model=S.RecommendationResponse, tags=["consultation"],
             summary="Recommend laptops for one or more needs and a budget")
def recommendations(body: S.RecommendationRequest, cat: CatalogDep) -> S.RecommendationResponse:
    try:
        return recommend(cat, body)
    except UnknownNeed as exc:
        raise HTTPException(status_code=404, detail=f"Kebutuhan '{exc.args[0]}' tidak dikenal.") from None


@router.get("/methodology", response_model=S.MethodologyOut, tags=["transparency"],
            summary="The scoring rules, in the open")
def methodology(cat: CatalogDep) -> S.MethodologyOut:
    return cat.methodology()
