-- Libermap - Schema do Banco de Dados
-- PostgreSQL 14+ com PostGIS

-- Extensão PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Elementos (POPs, CTOs, Caixas de Emenda, Splitters, Postes)
CREATE TABLE elements (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location GEOMETRY(Point, 4326),
    address TEXT,
    area VARCHAR(100),
    capacity INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_elements_location ON elements USING GIST(location);
CREATE INDEX idx_elements_type ON elements(type);
CREATE INDEX idx_elements_area ON elements(area);

-- Cabos
CREATE TABLE cables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    fiber_count INTEGER NOT NULL,
    cable_type VARCHAR(50),  -- drop, distribuicao, backbone
    path GEOMETRY(LineString, 4326),
    length_meters DECIMAL(10,2),
    element_from_id INTEGER REFERENCES elements(id) ON DELETE SET NULL,
    element_to_id INTEGER REFERENCES elements(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cables_path ON cables USING GIST(path);

-- Fibras (cada fibra individual de cada cabo)
CREATE TABLE fibers (
    id SERIAL PRIMARY KEY,
    cable_id INTEGER REFERENCES cables(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    color VARCHAR(50),
    status VARCHAR(50) DEFAULT 'available',  -- available, used, reserved, broken
    customer_id VARCHAR(100),
    metadata JSONB
);

CREATE INDEX idx_fibers_cable ON fibers(cable_id);
CREATE INDEX idx_fibers_status ON fibers(status);

-- Splitters
CREATE TABLE splitters (
    id SERIAL PRIMARY KEY,
    element_id INTEGER REFERENCES elements(id) ON DELETE CASCADE,
    ratio VARCHAR(10) NOT NULL,  -- 1:8, 1:16, 1:32
    input_fiber_id INTEGER REFERENCES fibers(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Portas de Splitter
CREATE TABLE splitter_ports (
    id SERIAL PRIMARY KEY,
    splitter_id INTEGER REFERENCES splitters(id) ON DELETE CASCADE,
    port_number INTEGER NOT NULL,
    output_fiber_id INTEGER REFERENCES fibers(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'available',
    customer_id VARCHAR(100),
    onu_serial VARCHAR(100)
);

CREATE INDEX idx_splitter_ports_splitter ON splitter_ports(splitter_id);

-- Fusões
CREATE TABLE fusions (
    id SERIAL PRIMARY KEY,
    element_id INTEGER REFERENCES elements(id) ON DELETE CASCADE,
    fiber_in_id INTEGER REFERENCES fibers(id) ON DELETE SET NULL,
    fiber_out_id INTEGER REFERENCES fibers(id) ON DELETE SET NULL,
    loss_db DECIMAL(5,2),
    technician VARCHAR(100),
    fusion_date TIMESTAMP DEFAULT NOW(),
    notes TEXT
);

-- Clientes (referência ao ERP)
CREATE TABLE customer_connections (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255),
    splitter_port_id INTEGER REFERENCES splitter_ports(id) ON DELETE SET NULL,
    onu_serial VARCHAR(100),
    location GEOMETRY(Point, 4326),
    address TEXT,
    connected_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customer_connections_location ON customer_connections USING GIST(location);
CREATE INDEX idx_customer_connections_customer ON customer_connections(customer_id);
