"""Libermap - API Principal"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.api.config import settings
from src.api.database import engine, Base
from src.api.routes import elements, cables, splitters, export, trace

app = FastAPI(
    title="Libermap",
    description="Sistema de mapeamento de infraestrutura FTTH",
    version="0.1.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas da API
app.include_router(elements.router, prefix="/api/v1/elements", tags=["Elementos"])
app.include_router(cables.router, prefix="/api/v1/cables", tags=["Cabos"])
app.include_router(splitters.router, prefix="/api/v1/splitters", tags=["Splitters"])
app.include_router(export.router, prefix="/api/v1/export", tags=["Exportação"])
app.include_router(trace.router, prefix="/api/v1/trace", tags=["Rastreamento"])

# Arquivos estáticos (frontend)
app.mount("/", StaticFiles(directory="web", html=True), name="web")


@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
