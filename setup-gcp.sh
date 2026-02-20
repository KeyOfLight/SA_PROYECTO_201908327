#!/bin/bash

# Script para verificar y configurar GCP automáticamente
# Ejecutar con: bash setup-gcp.sh

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Setup GCP - Deliver Eats${NC}"
echo -e "${YELLOW}========================================${NC}"

# 1. Verificar gcloud
echo -e "\n${YELLOW}[1/5] Verificando gcloud...${NC}"
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}✗ gcloud no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✓ gcloud está instalado${NC}"

# 2. Obtener proyecto y cuenta actuales
echo -e "\n${YELLOW}[2/5] Verificando configuración...${NC}"
ACCOUNT=$(gcloud config get-value account)
PROJECT=$(gcloud config get-value project)
echo "  Account: $ACCOUNT"
echo "  Project: $PROJECT"

if [ -z "$PROJECT" ]; then
    echo -e "${RED}✗ No hay proyecto configurado${NC}"
    echo "Ejecuta: gcloud config set project [PROJECT_ID]"
    exit 1
fi

echo -e "${GREEN}✓ Configuración lista${NC}"

# 3. Habilitar servicios
echo -e "\n${YELLOW}[3/5] Habilitando servicios de GCP...${NC}"

services=(
    "container.googleapis.com"
    "artifactregistry.googleapis.com"
    "compute.googleapis.com"
    "storage.googleapis.com"
)

for service in "${services[@]}"; do
    echo -n "  Habilitando $service... "
    if gcloud services enable "$service" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠ (puede ya estar habilitada)${NC}"
    fi
done

# Optional: Cloud SQL (puede fallar)
echo -n "  Habilitando cloudsql.googleapis.com... "
if gcloud services enable cloudsql.googleapis.com 2>/dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ (restricción de permisos - continuaremos sin esto)${NC}"
fi

echo -e "${GREEN}✓ Servicios habilitados${NC}"

# 4. Configurar Docker registry
echo -e "\n${YELLOW}[4/5] Configurando Docker registry...${NC}"
if command -v docker &> /dev/null; then
    gcloud auth configure-docker us-central1-docker.pkg.dev --quiet
    echo -e "${GREEN}✓ Docker registry configurado${NC}"
else
    echo -e "${YELLOW}⚠ Docker no está instalado. Instálalo desde: https://docker.com${NC}"
fi

# 5. Verificar Artifact Registry
echo -e "\n${YELLOW}[5/5] Verificando Artifact Registry...${NC}"
if gcloud artifacts repositories describe deliver-eats-repo \
    --location=us-central1 &>/dev/null; then
    echo -e "${GREEN}✓ Repositorio ya existe${NC}"
else
    echo "  Creando repositorio deliver-eats-repo..."
    if gcloud artifacts repositories create deliver-eats-repo \
        --repository-format=docker \
        --location=us-central1 \
        --description="Deliver Eats Docker images" 2>/dev/null; then
        echo -e "${GREEN}✓ Repositorio creado${NC}"
    else
        echo -e "${YELLOW}⚠ No se pudo crear (probablemente ya existe)${NC}"
    fi
fi

# Resumen
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Setup completado!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}Información de tu proyecto:${NC}"
echo "  Proyecto: $PROJECT"
echo "  Región: us-central1"
echo "  Registry: us-central1-docker.pkg.dev/$PROJECT/deliver-eats-repo"

echo -e "\n${YELLOW}Próximos pasos:${NC}"
echo "  1. Crear Cluster GKE:"
echo "     gcloud container clusters create deliver-eats-cluster \\"
echo "       --zone us-central1-a --num-nodes 3 --machine-type n1-standard-2"
echo ""
echo "  2. Construir y publicar imágenes Docker:"
echo "     export PROJECT_ID=$PROJECT"
echo "     export REGISTRY=us-central1-docker.pkg.dev"
echo "     docker build -f backend/Dockerfile.gateway -t \$REGISTRY/\$PROJECT_ID/deliver-eats-repo/gateway:latest ."
echo "     docker push \$REGISTRY/\$PROJECT_ID/deliver-eats-repo/gateway:latest"
echo ""
echo "  3. Ver guía completa: QUICKSTART_GCP.md"

echo -e "\n${GREEN}✓ Listo para continuar${NC}"
