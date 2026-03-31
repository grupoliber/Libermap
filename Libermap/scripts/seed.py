"""
Script para popular o banco com dados de exemplo.
Uso: python -m scripts.seed
"""

import asyncio
from src.api.database import async_session, engine, Base
from src.api.models import Element
from sqlalchemy import func


SAMPLE_ELEMENTS = [
    {
        "type": "pop",
        "name": "POP Central",
        "address": "Rua Principal, 100 - Centro",
        "area": "centro",
        "capacity": 48,
        "lat": -14.7950,
        "lng": -39.2730,
    },
    {
        "type": "cto",
        "name": "CTO-001",
        "address": "Rua A, 200 - Centro",
        "area": "centro",
        "capacity": 16,
        "lat": -14.7960,
        "lng": -39.2720,
    },
    {
        "type": "cto",
        "name": "CTO-002",
        "address": "Rua B, 50 - Jardim",
        "area": "jardim",
        "capacity": 16,
        "lat": -14.7940,
        "lng": -39.2750,
    },
    {
        "type": "ceo",
        "name": "CEO-01",
        "address": "Rua A esquina Rua B",
        "area": "centro",
        "capacity": 24,
        "lat": -14.7955,
        "lng": -39.2725,
    },
    {
        "type": "poste",
        "name": "Poste-001",
        "address": "Rua A, frente ao 150",
        "area": "centro",
        "capacity": None,
        "lat": -14.7953,
        "lng": -39.2728,
    },
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        for data in SAMPLE_ELEMENTS:
            elem = Element(
                type=data["type"],
                name=data["name"],
                address=data["address"],
                area=data["area"],
                capacity=data["capacity"],
                location=func.ST_SetSRID(
                    func.ST_MakePoint(data["lng"], data["lat"]), 4326
                ),
            )
            session.add(elem)
        await session.commit()

    print(f"✓ {len(SAMPLE_ELEMENTS)} elementos de exemplo criados.")


if __name__ == "__main__":
    asyncio.run(seed())
