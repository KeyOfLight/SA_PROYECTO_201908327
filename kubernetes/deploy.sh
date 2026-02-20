#!/bin/bash

# Script para desplegar la aplicación Deliver Eats en GCP/GKE
# Requerimientos: gcloud, kubectl, docker configurados

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
PROJECT_ID="deliver-eats-project"
REGION="us-central1"
ZONE="us-central1-a"
CLUSTER_NAME="deliver-eats-cluster"
REGISTRY="$REGION-docker.pkg.dev"
REPO_NAME="deliver-eats-repo"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Despliegue de Deliver Eats en GCP/GKE${NC}"
echo -e "${YELLOW}========================================${NC}"

# Paso 1: Validar que gcloud está configurado
echo -e "\n${YELLOW}[1/10] Validando configuración de gcloud...${NC}"
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud no está instalado${NC}"
    exit 1
fi

CURRENT_PROJECT=$(gcloud config get-value project)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo -e "${YELLOW}Configurando proyecto GCP: $PROJECT_ID${NC}"
    gcloud config set project $PROJECT_ID
fi

echo -e "${GREEN}✓ gcloud configurado correctamente${NC}"

# Paso 2: Habilitar APIs
echo -e "\n${YELLOW}[2/10] Habilitando APIs de GCP...${NC}"
gcloud services enable container.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudsql.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable storage.googleapis.com
echo -e "${GREEN}✓ APIs habilitadas${NC}"

# Paso 3: Verificar/Crear Artifact Registry
echo -e "\n${YELLOW}[3/10] Configurando Artifact Registry...${NC}"
if gcloud artifacts repositories describe $REPO_NAME --location=$REGION &> /dev/null; then
    echo -e "${GREEN}✓ Repositorio ya existe${NC}"
else
    echo -e "${YELLOW}Creando repositorio...${NC}"
    gcloud artifacts repositories create $REPO_NAME \
        --repository-format=docker \
        --location=$REGION \
        --description="Repositorio Deliver Eats"
fi

gcloud auth configure-docker $REGION-docker.pkg.dev
echo -e "${GREEN}✓ Artifact Registry configurado${NC}"

# Paso 4: Verificar/Crear cluster GKE
echo -e "\n${YELLOW}[4/10] Configurando cluster GKE...${NC}"
if gcloud container clusters describe $CLUSTER_NAME --zone=$ZONE &> /dev/null; then
    echo -e "${GREEN}✓ Cluster GKE ya existe${NC}"
else
    echo -e "${YELLOW}Creando cluster GKE (esto puede tardar 10-15 minutos)...${NC}"
    gcloud container clusters create $CLUSTER_NAME \
        --zone $ZONE \
        --num-nodes 3 \
        --machine-type n1-standard-2 \
        --enable-ip-alias \
        --enable-stackdriver-kubernetes \
        --addons HorizontalPodAutoscaling,HttpLoadBalancing,GcePersistentDiskCsiDriver
fi

gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE
echo -e "${GREEN}✓ Cluster GKE configurado${NC}"

# Paso 5: Verificar/Crear instancia Cloud SQL
echo -e "\n${YELLOW}[5/10] Configurando Cloud SQL...${NC}"
if gcloud sql instances describe deliver-eats-db &> /dev/null; then
    echo -e "${GREEN}✓ Instancia Cloud SQL ya existe${NC}"
else
    echo -e "${YELLOW}Creando instancia Cloud SQL...${NC}"
    gcloud sql instances create deliver-eats-db \
        --database-version MYSQL_8_0 \
        --tier db-f1-micro \
        --region $REGION \
        --backup \
        --retained-backups-count 30
    
    echo -e "${YELLOW}Esperando a que la instancia esté lista...${NC}"
    sleep 30
fi

# Obtener IP de Cloud SQL
DB_IP=$(gcloud sql instances describe deliver-eats-db --format='value(ipAddresses[0].ipAddress)')
echo -e "${GREEN}✓ Cloud SQL configurado en IP: $DB_IP${NC}"

# Paso 6: Crear base de datos y usuario
echo -e "\n${YELLOW}[6/10] Configurando base de datos...${NC}"
if gcloud sql databases describe auth_db --instance=deliver-eats-db &> /dev/null; then
    echo -e "${GREEN}✓ Base de datos ya existe${NC}"
else
    gcloud sql databases create auth_db --instance=deliver-eats-db
    echo -e "${GREEN}✓ Base de datos creada${NC}"
fi

# Criar usuario si no exists
if gcloud sql users describe delivereats --instance=deliver-eats-db &> /dev/null; then
    echo -e "${GREEN}✓ Usuario de base de datos ya existe${NC}"
else
    echo -e "${YELLOW}Creando usuario de base de datos...${NC}"
    gcloud sql users create delivereats \
        --instance=deliver-eats-db \
        --password=DeliverEats123!@#
fi

# Paso 7: Construir imágenes Docker
echo -e "\n${YELLOW}[7/10] Construyendo imágenes Docker...${NC}"

cd "$(dirname "$0")/.."

images=(
    "gateway:Dockerfile.gateway"
    "auth-service:Dockerfile.auth"
    "catalog-service:Dockerfile.catalog"
    "order-service:Dockerfile.order"
)

for img in "${images[@]}"; do
    IFS=':' read -r name dockerfile <<< "$img"
    img_name="$REGISTRY/$PROJECT_ID/$REPO_NAME/$name:latest"
    
    echo -e "${YELLOW}  Construyendo: $name${NC}"
    docker build -f backend/$dockerfile -t $img_name .
    
    echo -e "${YELLOW}  Publicando: $name${NC}"
    docker push $img_name
    echo -e "${GREEN}  ✓ $name completado${NC}"
done

# Paso 8: Aplicar manifiestos de Kubernetes
echo -e "\n${YELLOW}[8/10] Aplicando manifiestos de Kubernetes...${NC}"

# Crear namespace
kubectl apply -f kubernetes/01-namespace.yaml

# Actualizar secrets con IP real de Cloud SQL
echo -e "${YELLOW}Actualizando secrets con información de Cloud SQL...${NC}"
kubectl create secret generic db-credentials \
    --from-literal=MYSQL_HOST="$DB_IP" \
    --from-literal=MYSQL_PORT="3306" \
    --from-literal=MYSQL_USER="delivereats" \
    --from-literal=MYSQL_PASSWORD="DeliverEats123!@#" \
    --from-literal=MYSQL_DATABASE="auth_db" \
    --from-literal=JWT_SECRET="deliver-eats-secret-key-2026" \
    --from-literal=JWT_EXPIRE="7d" \
    --from-literal=AUTH_SERVICE_PORT="50051" \
    --from-literal=CATALOG_SERVICE_PORT="50052" \
    --from-literal=ORDER_SERVICE_PORT="50053" \
    -n deliver-eats \
    --dry-run=client -o yaml | kubectl apply -f -

# Crear ConfigMap con script de base de datos
kubectl create configmap db-init-script \
    --from-file=databases/model.sql \
    -n deliver-eats \
    --dry-run=client -o yaml | kubectl apply -f -

# Aplicar manifiestos en orden
kubectl apply -f kubernetes/04-db-migration-job.yaml
echo -e "${YELLOW}  Esperando migraciones de base de datos...${NC}"
kubectl wait --for=condition=complete job/db-migration -n deliver-eats --timeout=300s || echo "⚠️  Job de migración tardó más de lo esperado"

kubectl apply -f kubernetes/05-auth-service.yaml
kubectl apply -f kubernetes/06-catalog-service.yaml
kubectl apply -f kubernetes/07-order-service.yaml
kubectl apply -f kubernetes/08-gateway.yaml
kubectl apply -f kubernetes/09-hpa.yaml

echo -e "${GREEN}✓ Manifiestos de Kubernetes aplicados${NC}"

# Paso 9: Esperar despliegues
echo -e "\n${YELLOW}[9/10] Esperando a que los despliegues estén listos...${NC}"
kubectl wait --for=condition=available --timeout=300s \
    deployment/gateway \
    deployment/auth-service \
    deployment/catalog-service \
    deployment/order-service \
    -n deliver-eats

echo -e "${GREEN}✓ Todos los despliegues están listos${NC}"

# Paso 10: Mostrar información de acceso
echo -e "\n${YELLOW}[10/10] Información de despliegue${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}¡Despliegue completado exitosamente!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${YELLOW}Servicios desplegados:${NC}"
kubectl get services -n deliver-eats

echo ""
echo -e "${YELLOW}Estado de los pods:${NC}"
kubectl get pods -n deliver-eats

echo ""
echo -e "${YELLOW}Obtener IP externa (Gateway):${NC}"
echo "kubectl get service gateway -n deliver-eats --watch"

echo ""
echo -e "${YELLOW}Comandos útiles:${NC}"
echo "  Ver logs de un pod:"
echo "    kubectl logs -n deliver-eats -f deployment/gateway"
echo ""
echo "  Acceder a un pod interactivamente:"
echo "    kubectl exec -it -n deliver-eats deployment/gateway -- /bin/bash"
echo ""
echo "  Ver métricas:"
echo "    kubectl top pods -n deliver-eats"
echo ""

echo -e "${GREEN}✓ Despliegue completado${NC}"
