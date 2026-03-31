"""Rotas de rastreamento de fibra e topologia."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.database import get_db
from src.api.models import Element, CustomerConnection
from src.api.schemas import TraceResponse
from src.services.trace import trace_fiber_path
from src.services.topology import build_topology

router = APIRouter()


@router.get("/{element_id}", response_model=TraceResponse)
async def trace_from_element(element_id: int, db: AsyncSession = Depends(get_db)):
    """Rastreia o caminho da fibra a partir de um elemento."""
    result = await db.execute(select(Element).where(Element.id == element_id))
    element = result.scalar_one_or_none()
    if not element:
        raise HTTPException(status_code=404, detail="Elemento não encontrado")

    path = await trace_fiber_path(db, element_id)
    return path


@router.get("/from-customer/{customer_id}", response_model=TraceResponse)
async def trace_from_customer(customer_id: str, db: AsyncSession = Depends(get_db)):
    """Rastreia caminho da fibra de um cliente até o POP."""
    result = await db.execute(
        select(CustomerConnection).where(CustomerConnection.customer_id == customer_id)
    )
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    path = await trace_fiber_path(db, connection.splitter_port_id, from_customer=True)
    return path


@router.get("/topology/{area}")
async def get_topology(area: str, db: AsyncSession = Depends(get_db)):
    """Retorna a topologia completa de uma área."""
    topology = await build_topology(db, area)
    return topology
