"""Modelos SQLAlchemy com suporte a PostGIS."""

from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import (
    Column, Integer, String, Text, Numeric, DateTime, ForeignKey, Index,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from src.api.database import Base


class Element(Base):
    __tablename__ = "elements"

    id = Column(Integer, primary_key=True)
    type = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    location = Column(Geometry("POINT", srid=4326))
    address = Column(Text)
    area = Column(String(100), index=True)
    capacity = Column(Integer)
    status = Column(String(50), default="active")
    metadata_ = Column("metadata", JSONB)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamentos
    cables_from = relationship("Cable", foreign_keys="Cable.element_from_id", back_populates="element_from")
    cables_to = relationship("Cable", foreign_keys="Cable.element_to_id", back_populates="element_to")
    splitters = relationship("Splitter", back_populates="element")
    fusions = relationship("Fusion", back_populates="element")

    __table_args__ = (
        Index("idx_elements_location", location, postgresql_using="gist"),
    )


class Cable(Base):
    __tablename__ = "cables"

    id = Column(Integer, primary_key=True)
    name = Column(String(255))
    fiber_count = Column(Integer, nullable=False)
    cable_type = Column(String(50))  # drop, distribuicao, backbone
    path = Column(Geometry("LINESTRING", srid=4326))
    length_meters = Column(Numeric(10, 2))
    element_from_id = Column(Integer, ForeignKey("elements.id"))
    element_to_id = Column(Integer, ForeignKey("elements.id"))
    metadata_ = Column("metadata", JSONB)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relacionamentos
    element_from = relationship("Element", foreign_keys=[element_from_id], back_populates="cables_from")
    element_to = relationship("Element", foreign_keys=[element_to_id], back_populates="cables_to")
    fibers = relationship("Fiber", back_populates="cable", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_cables_path", path, postgresql_using="gist"),
    )


class Fiber(Base):
    __tablename__ = "fibers"

    id = Column(Integer, primary_key=True)
    cable_id = Column(Integer, ForeignKey("cables.id"), nullable=False)
    position = Column(Integer, nullable=False)
    color = Column(String(50))
    status = Column(String(50), default="available")  # available, used, reserved, broken
    customer_id = Column(String(100))
    metadata_ = Column("metadata", JSONB)

    cable = relationship("Cable", back_populates="fibers")


class Splitter(Base):
    __tablename__ = "splitters"

    id = Column(Integer, primary_key=True)
    element_id = Column(Integer, ForeignKey("elements.id"))
    ratio = Column(String(10), nullable=False)  # 1:8, 1:16, 1:32
    input_fiber_id = Column(Integer, ForeignKey("fibers.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    element = relationship("Element", back_populates="splitters")
    input_fiber = relationship("Fiber", foreign_keys=[input_fiber_id])
    ports = relationship("SplitterPort", back_populates="splitter", cascade="all, delete-orphan")


class SplitterPort(Base):
    __tablename__ = "splitter_ports"

    id = Column(Integer, primary_key=True)
    splitter_id = Column(Integer, ForeignKey("splitters.id"), nullable=False)
    port_number = Column(Integer, nullable=False)
    output_fiber_id = Column(Integer, ForeignKey("fibers.id"))
    status = Column(String(50), default="available")
    customer_id = Column(String(100))
    onu_serial = Column(String(100))

    splitter = relationship("Splitter", back_populates="ports")
    output_fiber = relationship("Fiber", foreign_keys=[output_fiber_id])


class Fusion(Base):
    __tablename__ = "fusions"

    id = Column(Integer, primary_key=True)
    element_id = Column(Integer, ForeignKey("elements.id"))
    fiber_in_id = Column(Integer, ForeignKey("fibers.id"))
    fiber_out_id = Column(Integer, ForeignKey("fibers.id"))
    loss_db = Column(Numeric(5, 2))
    technician = Column(String(100))
    fusion_date = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text)

    element = relationship("Element", back_populates="fusions")
    fiber_in = relationship("Fiber", foreign_keys=[fiber_in_id])
    fiber_out = relationship("Fiber", foreign_keys=[fiber_out_id])


class CustomerConnection(Base):
    __tablename__ = "customer_connections"

    id = Column(Integer, primary_key=True)
    customer_id = Column(String(100), nullable=False)
    customer_name = Column(String(255))
    splitter_port_id = Column(Integer, ForeignKey("splitter_ports.id"))
    onu_serial = Column(String(100))
    location = Column(Geometry("POINT", srid=4326))
    address = Column(Text)
    connected_at = Column(DateTime, default=datetime.utcnow)

    splitter_port = relationship("SplitterPort")
