"""Rotas CRUD para elementos da rede (POPs, CTOs, CEOs, etc.)."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.functions import ST_DWithin, ST_MakePoint, ST_SetSRID

from src.api.database import get_db
from src.api.models import Element
from src.api.schemas import ElementCreate, ElementUpdate, ElementResponse

router = APIRouter()


@router.get("/", response_model=list[ElementResponse])
async def list_elements(
    type: str | None = None,
    area: str | None = None,
    status: str = "active",
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    db: AsyncSession = Depends(get_db),
):
    """Lista elementos com filtros opcionais."""
    query = select(Element).where(Element.status == status)
    if type:
        query = query.where(Element.type == type)
    if area:
        query = query.where(Element.area == area)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=ElementResponse, status_code=201)
async def create_element(
    data: ElementCreate,
    db: AsyncSession = Depends(get_db),
):
    """Cria um novo elemento na rede."""
    element = Element(
        type=data.type,
        name=data.name,
        description=data.description,
        location=func.ST_SetSRID(
            func.ST_MakePoint(data.location.lng, data.location.lat), 4326
        ),
        address=data.address,
        area=data.area,
        capacity=data.capacity,
        metadata_=data.metadata,
    )
    db.add(element)
    await db.flush()
    await db.refresh(element)
    return element


@router.get("/{element_id}", response_model=ElementResponse)
async def get_element(element_id: int, db: AsyncSession = Depends(get_db)):
    """Retorna detalhes de um elemento."""
    result = await db.execute(select(Element).where(Element.id == element_id))
    element = result.scalar_one_or_none()
    if not element:
        raise HTTPException(status_code=404, detail="Elemento não encontrado")
    return element


@router.put("/{element_id}", response_model=ElementResponse)
async def update_element(
    element_id: int,
    data: ElementUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Atualiza um elemento existente."""
    result = await db.execute(select(Element).where(Element.id == element_id))
    element = result.scalar_one_or_none()
    if not element:
        raise HTTPException(status_code=404, detail="Elemento não encontrado")

    update_data = data.model_dump(exclude_unset=True)
    if "location" in update_data and update_data["location"]:
        loc = update_data.pop("location")
        element.location = func.ST_SetSRID(
            func.ST_MakePoint(loc["lng"], loc["lat"]), 4326
        )
    for key, value in update_data.items():
        setattr(element, key, value)

    await db.flush()
    await db.refresh(element)
    return element


@router.delete("/{element_id}", status_code=204)
async def delete_element(element_id: int, db: AsyncSession = Depends(get_db)):
    """Remove um elemento."""
    result = await db.execute(select(Element).where(Element.id == element_id))
    element = result.scalar_one_or_none()
    if not element:
        raise HTTPException(status_code=404, detail="Elemento não encontrado")
    await db.delete(element)


@router.get("/near/", response_model=list[ElementResponse])
async def elements_near(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_m: float = Query(default=500, le=10000),
    db: AsyncSession = Depends(get_db),
):
    """Retorna elementos próximos a uma coordenada."""
    point = func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326)
    query = (
        select(Element)
        .where(
            ST_DWithin(
                Element.location,
                func.ST_Transform(point, 3857),
                radius_m,
            )
        )
        .limit(50)
    )
    result = await db.execute(query)
    return result.scalars().all()
