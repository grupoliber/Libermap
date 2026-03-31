"""Rotas de exportação e importação (KML, GeoJSON, PDF)."""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.database import get_db
from src.api.models import Element, Cable

router = APIRouter()


@router.get("/geojson")
async def export_geojson(
    area: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Exporta elementos como GeoJSON FeatureCollection."""
    query = select(Element)
    if area:
        query = query.where(Element.area == area)
    result = await db.execute(query)
    elements = result.scalars().all()

    features = []
    for elem in elements:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [0, 0],  # TODO: extrair coords do PostGIS
            },
            "properties": {
                "id": elem.id,
                "type": elem.type,
                "name": elem.name,
                "area": elem.area,
                "status": elem.status,
            },
        })

    return JSONResponse({
        "type": "FeatureCollection",
        "features": features,
    })


@router.get("/kml")
async def export_kml(
    area: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Exporta elementos como KML."""
    # TODO: implementar exportação KML com simplekml
    return {"message": "Exportação KML - em desenvolvimento"}


@router.get("/pdf")
async def export_pdf(
    area: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Gera relatório PDF da infraestrutura."""
    # TODO: implementar geração de PDF com reportlab
    return {"message": "Relatório PDF - em desenvolvimento"}


@router.post("/import/kml")
async def import_kml():
    """Importa elementos a partir de arquivo KML."""
    # TODO: implementar importação KML
    return {"message": "Importação KML - em desenvolvimento"}
