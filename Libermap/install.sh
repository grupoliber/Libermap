#!/bin/bash
# Libermap - Script de Instalação
set -e

echo "==================================="
echo "  Libermap - Instalação"
echo "  Mapeamento FTTH para ISPs"
echo "==================================="
echo ""

# Verifica Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instale em: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose não encontrado."
    exit 1
fi

echo "✓ Docker encontrado"

# Cria .env se não existir
if [ ! -f .env ]; then
    cp .env.example .env
    # Gera senha aleatória
    DB_PASS=$(openssl rand -base64 24)
    SECRET=$(openssl rand -base64 32)
    sed -i "s/CHANGE_ME_IN_PRODUCTION/$DB_PASS/g" .env
    sed -i "s/SECRET_KEY=.*/SECRET_KEY=$SECRET/" .env
    echo "✓ Arquivo .env criado com senhas aleatórias"
else
    echo "✓ Arquivo .env já existe"
fi

# Sobe containers
echo ""
echo "Iniciando serviços..."
docker compose up -d

echo ""
echo "Aguardando banco de dados..."
sleep 5

echo ""
echo "==================================="
echo "  ✓ Libermap instalado!"
echo ""
echo "  Acesse: http://localhost:8000"
echo "  API:    http://localhost:8000/api/v1/health"
echo "  Docs:   http://localhost:8000/docs"
echo "==================================="
