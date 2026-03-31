"""Testes para a rota de elementos."""

import pytest
from httpx import AsyncClient, ASGITransport

from src.api.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_list_elements(client):
    response = await client.get("/api/v1/elements/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_create_element(client):
    data = {
        "type": "pop",
        "name": "POP Teste",
        "location": {"lat": -14.79, "lng": -39.27},
        "address": "Rua Teste, 100",
        "area": "centro",
        "capacity": 48,
    }
    response = await client.post("/api/v1/elements/", json=data)
    assert response.status_code == 201
    result = response.json()
    assert result["name"] == "POP Teste"
    assert result["type"] == "pop"
