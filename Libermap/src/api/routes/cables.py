"""Rotas para cabos e fibras ópticas."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.database import get_db
from src.api.models import Cable, Fiber, Fusion
from src.api.schemas import CableCreate, CableResponse, FusionCreate

router = APIRouter()

# Cores padrão de fibras FTTH
FIBER_COLORS = [
    "verde", "amarelo", "branco", "azul", "vermelho", "violeta",
    "marrom", "rosa", "preto", "cinza", "laranja", "aqua",
]


@router.get("/", response_model=list[CableResponse])
async def list_cables(
    cable_type: str | None = None,
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    db: AsyncSession = Depends(get_db),
):
    """Lista cabos com filtros."""
    query = select(Cable)
    if cable_type:
        query = query.where(Cable.cable_type == cable_type)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=CableResponse, status_code=201)
async def create_cable(data: CableCreate, db: AsyncSession = Depends(get_db)):
    """Cria um cabo e gera automaticamente as fibras com cores padrão."""
    # Constrói a geometria LineString
    coords = [(p.lng, p.lat) for p in data.path]
    wkt_coords = ", ".join(f"{lng} {lat}" for lng, lat in coords)
    linestring = func.ST_SetSRID(
        func.ST_GeomFromText(f"LINESTRING({wkt_coords})"), 4326
    )

    cable = Cable(
        name=data.name,
        fiber_count=data.fiber_count,
        cable_type=data.cable_type,
        path=linestring,
        length_meters=func.ST_Length(func.ST_Transform(linestring, 3857)),
        element_from_id=data.element_from_id,
        element_to_id=data.element_to_id,
        metadata_=data.metadata,
    )
    db.add(cable)
    await db.flush()

    # Cria fibras automaticamente com cores padrão
    for i in range(data.fiber_count):
        fiber = Fiber(
            cable_id=cable.id,
            position=i + 1,
            color=FIBER_COLORS[i % len(FIBER_COLORS)],
            status="available",
        )
        db.add(fiber)

    await db.flush()
    await db.refresh(cable)
    return cable


@router.get("/{cable_id}/fibers")
async def get_cable_fibers(cable_id: int, db: AsyncSession = Depends(get_db)):
    """Lista fibras de um cabo."""
    result = await db.execute(
        select(Fiber).where(Fiber.cable_id == cable_id).order_by(Fiber.position)
    )
    fibers = result.scalars().all()
    if not fibers:
        raise HTTPException(status_code=404, detail="Cabo não encontrado ou sem fibras")
    return fibers


@router.post("/{cable_id}/fusion", status_code=201)
async def create_fusion(
    cable_id: int,
    data: FusionCreate,
    db: AsyncSession = Depends(get_db),
):
    """Registra uma fusão entre fibras."""
    fusion = Fusion(
        element_id=data.element_id,
        fiber_in_id=data.fiber_in_id,
        fiber_out_id=data.fiber_out_id,
        loss_db=data.loss_db,
        technician=data.technician,
        notes=data.notes,
    )
    db.add(fusion)
    await db.flush()

    # Marca fibras como em uso
    for fid in [data.fiber_in_id, data.fiber_out_id]:
        result = await db.execute(select(Fiber).where(Fiber.id == fid))
        fiber = result.scalar_one_or_none()
        if fiber:
            fiber.status = "used"

    await db.refresh(fusion)
    return {"id": fusion.id, "message": "Fusão registrada com sucesso"}
