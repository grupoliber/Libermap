"""Rotas para splitters e suas portas."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.database import get_db
from src.api.models import Splitter, SplitterPort
from src.api.schemas import SplitterCreate, SplitterPortResponse, ConnectCustomerRequest

router = APIRouter()

# Mapa de ratio para número de portas
RATIO_PORTS = {"1:8": 8, "1:16": 16, "1:32": 32}


@router.get("/")
async def list_splitters(db: AsyncSession = Depends(get_db)):
    """Lista todos os splitters."""
    result = await db.execute(select(Splitter))
    return result.scalars().all()


@router.post("/", status_code=201)
async def create_splitter(data: SplitterCreate, db: AsyncSession = Depends(get_db)):
    """Cria um splitter e gera automaticamente as portas."""
    splitter = Splitter(
        element_id=data.element_id,
        ratio=data.ratio,
        input_fiber_id=data.input_fiber_id,
    )
    db.add(splitter)
    await db.flush()

    # Cria portas automaticamente
    num_ports = RATIO_PORTS.get(data.ratio, 8)
    for i in range(num_ports):
        port = SplitterPort(
            splitter_id=splitter.id,
            port_number=i + 1,
            status="available",
        )
        db.add(port)

    await db.flush()
    await db.refresh(splitter)
    return {"id": splitter.id, "ratio": splitter.ratio, "ports_created": num_ports}


@router.get("/{splitter_id}/ports", response_model=list[SplitterPortResponse])
async def get_splitter_ports(splitter_id: int, db: AsyncSession = Depends(get_db)):
    """Lista portas de um splitter."""
    result = await db.execute(
        select(SplitterPort)
        .where(SplitterPort.splitter_id == splitter_id)
        .order_by(SplitterPort.port_number)
    )
    return result.scalars().all()


@router.post("/{splitter_id}/connect", status_code=201)
async def connect_customer(
    splitter_id: int,
    data: ConnectCustomerRequest,
    db: AsyncSession = Depends(get_db),
):
    """Conecta um cliente a uma porta do splitter."""
    result = await db.execute(
        select(SplitterPort).where(
            SplitterPort.splitter_id == splitter_id,
            SplitterPort.port_number == data.port_number,
        )
    )
    port = result.scalar_one_or_none()
    if not port:
        raise HTTPException(status_code=404, detail="Porta não encontrada")
    if port.status != "available":
        raise HTTPException(status_code=409, detail="Porta já ocupada")

    port.customer_id = data.customer_id
    port.onu_serial = data.onu_serial
    port.status = "used"

    return {"message": f"Cliente {data.customer_id} conectado na porta {data.port_number}"}
