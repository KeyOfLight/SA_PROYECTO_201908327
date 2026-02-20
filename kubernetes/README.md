# Script de despliegue en GCP para Deliver Eats

## Requisitos previos

Instala estas herramientas antes de ejecutar el despliegue:

### 1. Google Cloud SDK
- **Windows**: https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe
- **macOS/Linux**: `curl https://sdk.cloud.google.com | bash`

### 2. kubectl
```bash
gcloud components install kubectl
```

### 3. Docker Desktop
- https://www.docker.com/products/docker-desktop

### 4. Git
- https://git-scm.com/download

## Configuración inicial

```bash
# Autenticarse en Google Cloud
gcloud auth login

# Establecer proyecto
gcloud config set project deliver-eats-project

# Autenticarse en Docker Registry
gcloud auth configure-docker us-central1-docker.pkg.dev
```

## Despliegue automático

### Opción 1: Usar el script de despliegue

```bash
# Dar permisos de ejecución
chmod +x kubernetes/deploy.sh

# Ejecutar despliegue
./kubernetes/deploy.sh
```

### Opción 2: Despliegue manual paso a paso

```bash
# 1. Crear namespace
kubectl apply -f kubernetes/01-namespace.yaml

# 2. Crear secrets (actualizar valores primero)
kubectl apply -f kubernetes/02-secrets.yaml

# 3. Crear ConfigMap
kubectl create configmap db-init-script \
    --from-file=databases/model.sql \
    -n deliver-eats

# 4. Ejecutar migraciones de base de datos
kubectl apply -f kubernetes/04-db-migration-job.yaml

# 5. Esperar migraciones
kubectl wait --for=condition=complete job/db-migration -n deliver-eats --timeout=300s

# 6. Desplegar servicios
kubectl apply -f kubernetes/05-auth-service.yaml
kubectl apply -f kubernetes/06-catalog-service.yaml
kubectl apply -f kubernetes/07-order-service.yaml
kubectl apply -f kubernetes/08-gateway.yaml
kubectl apply -f kubernetes/09-hpa.yaml

# 7. Verificar estado
kubectl get pods -n deliver-eats
kubectl get services -n deliver-eats
```

## Monitoreo y mantenimiento

### Ver logs en tiempo real
```bash
kubectl logs -n deliver-eats -f deployment/gateway
```

### Ver estado de todos los recursos
```bash
kubectl get all -n deliver-eats
```

### Escalar un servicio manualmente
```bash
kubectl scale deployment/gateway -n deliver-eats --replicas=5
```

### Actualizar una imagen
```bash
kubectl set image deployment/gateway -n deliver-eats \
    gateway=us-central1-docker.pkg.dev/deliver-eats-project/deliver-eats-repo/gateway:v2
```

### Ver métricas de recursos
```bash
kubectl top pods -n deliver-eats
kubectl top nodes
```

## Rollback a versión anterior

```bash
kubectl rollout history deployment/gateway -n deliver-eats
kubectl rollout undo deployment/gateway -n deliver-eats
```

## Eliminación del despliegue

```bash
# Eliminar todos los recursos del namespace
kubectl delete namespace deliver-eats

# Eliminar cluster de GKE
gcloud container clusters delete deliver-eats-cluster --zone us-central1-a

# Eliminar instancia de Cloud SQL
gcloud sql instances delete deliver-eats-db
```

## Variables de entorno importantes

Editar `kubernetes/02-secrets.yaml` antes de desplegar:

- `MYSQL_HOST`: IP pública de Cloud SQL
- `MYSQL_USER`: Usuario de base de datos
- `MYSQL_PASSWORD`: Contraseña segura
- `JWT_SECRET`: Clave secreta para JWT (generar con: `openssl rand -hex 32`)
- `JWT_EXPIRE`: Expiración de tokens (ej: 7d)

## Troubleshooting

### Pod no inicia
```bash
kubectl describe pod -n deliver-eats [POD_NAME]
kubectl logs -n deliver-eats [POD_NAME]
```

### Error de conectividad a base de datos
```bash
# Verificar conectividad
kubectl run -it --rm debug --image=busybox --restart=Never -- \
    sh -c "nc -zv [CLOUD_SQL_IP] 3306"
```

### Ver eventos del cluster
```bash
kubectl get events -n deliver-eats
```

## Costo estimado (mensual en GCP)

- **GKE**: 3 nodes n1-standard-2 ≈ $450/mes
- **Cloud SQL**: db-f1-micro ≈ $20/mes  
- **Bandwidth**: ~$50-100/mes
- **Total estimado**: $500-600/mes

Tip: Usar preemptible VMs para reducir costos a ~$200/mes en desarrollo.
