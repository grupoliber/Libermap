"""Schemas Pydantic para validação de request/response."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# --- Elementos ---

class LocationSchema(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class ElementCreate(BaseModel):
    type: str = Field(..., pattern="^(pop|cto|ceo|splitter|poste)$")
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    location: LocationSchema
    address: Optional[str] = None
    area: Optional[str] = None
    capacity: Optional[int] = None
    metadata: Optional[dict] = None


class ElementUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[LocationSchema] = None
    address: Optional[str] = None
    area: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[str] = None
    metadata: Optional[dict] = None


class ElementResponse(BaseModel):
    id: int
    type: str
    name: str
    description: Optional[str]
    location: Optional[LocationSchema]
    address: Optional[str]
    area: Optional[str]
    capacity: Optional[int]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Cabos ---

class CableCreate(BaseModel):
    name: Optional[str] = None
    fiber_count: int = Field(..., ge=1, le=288)
    cable_type: str = Field(..., pattern="^(drop|distribuicao|backbone)$")
    path: list[LocationSchema]
    element_from_id: int
    element_to_id: int
    metadata: Optional[dict] = None


class CableResponse(BaseModel):
    id: int
    name: Optional[str]
    fiber_count: int
    cable_type: Optional[str]
    length_meters: Optional[float]
    element_from_id: Optional[int]
    element_to_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# --- Splitters ---

class SplitterCreate(BaseModel):
    element_id: int
    ratio: str = Field(..., pattern="^1:(8|16|32)$")
    input_fiber_id: Optional[int] = None


class SplitterPortResponse(BaseModel):
    id: int
    port_number: int
    status: str
    customer_id: Optional[str]
    onu_serial: Optional[str]

    class Config:
        from_attributes = True


class ConnectCustomerRequest(BaseModel):
    port_number: int
    customer_id: str
    onu_serial: Optional[str] = None


# --- Fusões ---

class FusionCreate(BaseModel):
    element_id: int
    fiber_in_id: int
    fiber_out_id: int
    loss_db: Optional[float] = None
    technician: Optional[str] = None
    notes: Optional[str] = None


# --- Rastreamento ---

class TraceResponse(BaseModel):
    customer_id: Optional[str]
    path: list[dict]
    total_distance_m: Optional[float]
    total_splitters: int
    total_fusions: int
