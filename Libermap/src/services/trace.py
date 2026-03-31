"""Serviço de rastreamento de fibra óptica.

Rastreia o caminho completo de uma fibra desde o cliente até o POP,
passando por splitters, caixas de emenda e fusões.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.models import (
    Element, Cable, Fiber, Splitter, SplitterPort, Fusion, CustomerConnection,
)


async def trace_fiber_path(
    db: AsyncSession,
    start_id: int,
    from_customer: bool = False,
) -> dict:
    """
    Rastreia o caminho da fibra a partir de um ponto.

    Args:
        db: Sessão do banco de dados
        start_id: ID do elemento ou porta de splitter inicial
        from_customer: Se True, começa do cliente; se False, do elemento

    Returns:
        Dicionário com o caminho rastreado, distâncias e contagens
    """
    path = []
    total_distance = 0.0
    total_splitters = 0
    total_fusions = 0

    if from_customer:
        # Busca a porta do splitter onde o cliente está conectado
        result = await db.execute(
            select(SplitterPort).where(SplitterPort.id == start_id)
        )
        port = result.scalar_one_or_none()
        if port:
            path.append({
                "type": "splitter_port",
                "port": port.port_number,
                "status": port.status,
            })
            total_splitters += 1

    # TODO: Implementar rastreamento completo recursivo
    # 1. Seguir fusões de fibra em fibra
    # 2. Identificar splitters no caminho
    # 3. Seguir cabos entre elementos
    # 4. Calcular distância total
    # 5. Chegar até o POP

    return {
        "customer_id": None,
        "path": path,
        "total_distance_m": total_distance,
        "total_splitters": total_splitters,
        "total_fusions": total_fusions,
    }
