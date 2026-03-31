"""Serviço de cálculo de topologia da rede óptica.

Constrói a árvore de topologia de uma área, mostrando as conexões
entre POPs, CTOs, splitters e clientes.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.models import Element, Cable, Splitter, SplitterPort


async def build_topology(db: AsyncSession, area: str) -> dict:
    """
    Constrói a topologia completa de uma área.

    Args:
        db: Sessão do banco de dados
        area: Nome da área/bairro

    Returns:
        Dicionário com nós e conexões da topologia
    """
    # Busca elementos da área
    result = await db.execute(
        select(Element).where(Element.area == area).order_by(Element.type)
    )
    elements = result.scalars().all()

    nodes = []
    edges = []

    for elem in elements:
        nodes.append({
            "id": elem.id,
            "type": elem.type,
            "name": elem.name,
            "status": elem.status,
            "capacity": elem.capacity,
        })

    # Busca cabos que conectam esses elementos
    element_ids = [e.id for e in elements]
    if element_ids:
        result = await db.execute(
            select(Cable).where(
                Cable.element_from_id.in_(element_ids)
                | Cable.element_to_id.in_(element_ids)
            )
        )
        cables = result.scalars().all()

        for cable in cables:
            edges.append({
                "from": cable.element_from_id,
                "to": cable.element_to_id,
                "fiber_count": cable.fiber_count,
                "cable_type": cable.cable_type,
                "length_m": float(cable.length_meters) if cable.length_meters else None,
            })

    # Busca ocupação de splitters
    splitter_elements = [e for e in elements if e.type in ("cto", "splitter")]
    occupancy = {}
    for elem in splitter_elements:
        result = await db.execute(
            select(Splitter).where(Splitter.element_id == elem.id)
        )
        splitters = result.scalars().all()
        total_ports = 0
        used_ports = 0
        for spl in splitters:
            result = await db.execute(
                select(SplitterPort).where(SplitterPort.splitter_id == spl.id)
            )
            ports = result.scalars().all()
            total_ports += len(ports)
            used_ports += sum(1 for p in ports if p.status == "used")
        occupancy[elem.id] = {
            "total": total_ports,
            "used": used_ports,
            "available": total_ports - used_ports,
        }

    return {
        "area": area,
        "nodes": nodes,
        "edges": edges,
        "occupancy": occupancy,
        "summary": {
            "total_elements": len(nodes),
            "total_cables": len(edges),
        },
    }
