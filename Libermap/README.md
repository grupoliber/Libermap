# Libermap

Sistema de mapeamento de infraestrutura FTTH (Fiber to the Home) para ISPs.

## 📋 Visão Geral

Libermap é uma ferramenta especializada para documentação e gerenciamento de redes ópticas. Permite mapear toda a infraestrutura de fibra óptica, desde o POP até a casa do cliente, incluindo caixas de emenda, splitters e CTOs.

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            Libermap                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        Frontend                                  │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │    │
│  │  │  Map View    │  │  Topology    │  │  Reports               │ │    │
│  │  │  (Leaflet)   │  │   Editor     │  │  Generator             │ │    │
│  │  └──────────────┘  └──────────────┘  └────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        Backend API                               │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │    │
│  │  │  Elements    │  │  Connections │  │  Import/Export         │ │    │
│  │  │  CRUD        │  │  Manager     │  │  KML/GeoJSON           │ │    │
│  │  └──────────────┘  └──────────────┘  └────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        Database                                  │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │    │
│  │  │  Elements    │  │  Cables      │  │  Splitters             │ │    │
│  │  │  (POP, CTO)  │  │  Fibers      │  │  Fusions               │ │    │
│  │  └──────────────┘  └──────────────┘  └────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## ✨ Funcionalidades

### Mapeamento
- **Elementos de rede**: POPs, CTOs, caixas de emenda, postes
- **Cabos e fibras**: Documentação de cabos com cores de fibras
- **Geolocalização**: Posicionamento GPS preciso
- **Camadas**: Organização por áreas/bairros

### Topologia
- **Splitters**: Gerenciamento de portas 1:8, 1:16, 1:32
- **Fusões**: Registro de fusões com cores
- **Rastreamento**: Caminho da fibra do POP ao cliente
- **Diagrama óptico**: Visualização da cadeia óptica

### Relatórios
- **Inventário**: Quantidade de elementos por tipo
- **Ocupação**: Taxa de ocupação de CTOs e splitters
- **Exportação**: PDF, Excel, KML, GeoJSON

### Integração
- **Google Maps / OpenStreetMap**: Visualização de mapas
- **RouterACS**: Link com CPEs por localização
- **ERP ISP**: Sincronização de clientes

## 🚀 Instalação

```bash
curl -sSL https://saas.libernet.com.br/libermap/install.sh | bash
```

### Requisitos
- Ubuntu 20.04+ / Debian 11+
- 2GB RAM
- 20GB disco (mais para anexos)
- PostgreSQL 14+ com PostGIS

## 📁 Estrutura do Projeto

```
libermap/
├── install.sh
├── docker-compose.yml
├── config/
│   └── libermap.yml
├── src/
│   ├── api/
│   │   ├── main.py         # FastAPI
│   │   ├── models.py       # SQLAlchemy/PostGIS
│   │   └── routes/
│   │       ├── elements.py
│   │       ├── cables.py
│   │       ├── splitters.py
│   │       └── export.py
│   └── services/
│       ├── topology.py     # Cálculo de topologia
│       └── trace.py        # Rastreamento de fibra
├── web/
│   ├── index.html
│   └── js/
│       └── map.js          # Leaflet integration
└── database/
    └── schema.sql
```

## 🔧 Configuração

### libermap.yml

```yaml
server:
  host: 0.0.0.0
  port: 8000
  
database:
  host: localhost
  port: 5432
  name: libermap
  user: libermap
  password: ${DB_PASSWORD}
  
map:
  default_center: [-14.79, -39.27]  # Coaraci, BA
  default_zoom: 14
  tile_provider: openstreetmap  # ou google, mapbox
  
elements:
  types:
    - id: pop
      name: POP
      icon: building
      color: "#2563eb"
      
    - id: cto
      name: CTO
      icon: box
      color: "#16a34a"
      
    - id: ceo
      name: Caixa de Emenda
      icon: git-merge
      color: "#eab308"
      
    - id: splitter
      name: Splitter
      icon: git-branch
      color: "#8b5cf6"
      
    - id: poste
      name: Poste
      icon: landmark
      color: "#6b7280"

fiber_colors:
  - { position: 1, color: "verde", hex: "#22c55e" }
  - { position: 2, color: "amarelo", hex: "#eab308" }
  - { position: 3, color: "branco", hex: "#ffffff" }
  - { position: 4, color: "azul", hex: "#3b82f6" }
  - { position: 5, color: "vermelho", hex: "#ef4444" }
  - { position: 6, color: "violeta", hex: "#8b5cf6" }
  - { position: 7, color: "marrom", hex: "#92400e" }
  - { position: 8, color: "rosa", hex: "#ec4899" }
  - { position: 9, color: "preto", hex: "#000000" }
  - { position: 10, color: "cinza", hex: "#6b7280" }
  - { position: 11, color: "laranja", hex: "#f97316" }
  - { position: 12, color: "aqua", hex: "#06b6d4" }

license:
  server_url: https://license.libernet.com.br
  key: ${LICENSE_KEY}
```

## 📊 API Endpoints

### Elementos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/elements` | Lista elementos |
| POST | `/api/v1/elements` | Cria elemento |
| GET | `/api/v1/elements/{id}` | Detalhes do elemento |
| PUT | `/api/v1/elements/{id}` | Atualiza elemento |
| DELETE | `/api/v1/elements/{id}` | Remove elemento |
| GET | `/api/v1/elements/near` | Elementos próximos |

### Cabos e Fibras

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/cables` | Lista cabos |
| POST | `/api/v1/cables` | Cria cabo |
| GET | `/api/v1/cables/{id}/fibers` | Fibras do cabo |
| POST | `/api/v1/cables/{id}/fusion` | Registra fusão |

### Splitters

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/splitters` | Lista splitters |
| GET | `/api/v1/splitters/{id}/ports` | Portas do splitter |
| POST | `/api/v1/splitters/{id}/connect` | Conecta cliente |

### Rastreamento

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/trace/{element_id}` | Rastreia caminho |
| GET | `/api/v1/topology/{area}` | Topologia da área |

### Exportação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/export/kml` | Exporta KML |
| GET | `/api/v1/export/geojson` | Exporta GeoJSON |
| GET | `/api/v1/export/pdf` | Relatório PDF |
| POST | `/api/v1/import/kml` | Importa KML |

## 📐 Database Schema

```sql
-- Extensão PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Elementos (POPs, CTOs, etc)
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
    element_from_id INTEGER REFERENCES elements(id),
    element_to_id INTEGER REFERENCES elements(id),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cables_path ON cables USING GIST(path);

-- Fibras (cada fibra de cada cabo)
CREATE TABLE fibers (
    id SERIAL PRIMARY KEY,
    cable_id INTEGER REFERENCES cables(id),
    position INTEGER NOT NULL,
    color VARCHAR(50),
    status VARCHAR(50) DEFAULT 'available',  -- available, used, reserved, broken
    customer_id VARCHAR(100),
    metadata JSONB
);

-- Splitters
CREATE TABLE splitters (
    id SERIAL PRIMARY KEY,
    element_id INTEGER REFERENCES elements(id),
    ratio VARCHAR(10) NOT NULL,  -- 1:8, 1:16, 1:32
    input_fiber_id INTEGER REFERENCES fibers(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Portas de Splitter
CREATE TABLE splitter_ports (
    id SERIAL PRIMARY KEY,
    splitter_id INTEGER REFERENCES splitters(id),
    port_number INTEGER NOT NULL,
    output_fiber_id INTEGER REFERENCES fibers(id),
    status VARCHAR(50) DEFAULT 'available',
    customer_id VARCHAR(100),
    onu_serial VARCHAR(100)
);

-- Fusões
CREATE TABLE fusions (
    id SERIAL PRIMARY KEY,
    element_id INTEGER REFERENCES elements(id),
    fiber_in_id INTEGER REFERENCES fibers(id),
    fiber_out_id INTEGER REFERENCES fibers(id),
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
    splitter_port_id INTEGER REFERENCES splitter_ports(id),
    onu_serial VARCHAR(100),
    location GEOMETRY(Point, 4326),
    address TEXT,
    connected_at TIMESTAMP DEFAULT NOW()
);
```

## 🗺️ Exemplo de Uso

### Criar um POP

```bash
curl -X POST http://localhost:8000/api/v1/elements \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pop",
    "name": "POP Central",
    "location": {
      "lat": -14.7950,
      "lng": -39.2730
    },
    "address": "Rua Principal, 100 - Centro",
    "area": "centro",
    "capacity": 48
  }'
```

### Rastrear fibra de um cliente

```bash
curl http://localhost:8000/api/v1/trace/from-customer/CUST-001
```

Resposta:
```json
{
  "customer_id": "CUST-001",
  "path": [
    {"type": "customer", "name": "João Silva", "address": "Rua A, 50"},
    {"type": "splitter_port", "port": 5, "ratio": "1:8"},
    {"type": "cto", "name": "CTO-001", "fibers": ["verde"]},
    {"type": "ceo", "name": "CEO-01", "fusion": "verde-verde"},
    {"type": "pop", "name": "POP Central", "port": 12}
  ],
  "total_distance_m": 1250,
  "total_splitters": 1,
  "total_fusions": 2
}
```

## 📄 Licenciamento

Produto comercial Libernet. Licenciado por número de elementos.

- **Libermap Starter**: Até 500 elementos
- **Libermap Pro**: Até 5.000 elementos
- **Libermap Enterprise**: Ilimitado

## 🆘 Suporte

- Email: suporte@libernet.com.br
- WhatsApp: (73) XXXX-XXXX
- Docs: https://docs.libernet.com.br/libermap
