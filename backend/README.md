# Backend - Deliver Eats (Microservicios)

## 🏗️ Arquitectura

Este proyecto implementa una **arquitectura de microservicios** con gRPC:

```
Frontend (Angular - Puerto 4200)
    ↓ HTTP/REST
API Gateway (Express - Puerto 3000)
    ↓ gRPC
Auth Service (gRPC Server - Puerto 50051)
    ↓ MySQL
Base de Datos (MySQL - Puerto 3308)
```

## 📁 Estructura

```
backend/
├── src/
│   ├── gateway.ts              # API Gateway (REST → gRPC)
│   ├── routes/
│   │   └── gateway.routes.ts   # Rutas del Gateway
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth-module.ts      # gRPC Auth Service
│   │   │   ├── auth.service.ts     # Lógica de negocio
│   │   │   └── auth.token.service.ts
│   │   └── user/
│   │       ├── user.models.ts
│   │       └── user.repository.mysql.ts
│   ├── proto/
│   │   └── auth.proto          # Definición Protocol Buffers
│   └── config/
│       ├── config.ts
│       └── database.ts
└── package.json
```

## 🚀 Instalación

```bash
# Instalar dependencias
npm install

# Configurar base de datos (Docker)
cd ../databases
docker-compose up -d
```

## ▶️ Ejecución

**Necesitas 2 terminales corriendo simultáneamente:**

### Terminal 1: Auth Service (gRPC)
```bash
npm run dev:auth
```
Inicia el servicio de autenticación en puerto **50051**

### Terminal 2: API Gateway (HTTP)
```bash
npm run dev
```
Inicia el API Gateway en puerto **3000**

## 🔌 Endpoints

Todos los endpoints están en: `http://localhost:3000/api`

### Públicos
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario

### Protegidos (requieren JWT)
- `GET /api/auth/me` - Obtener perfil
- `PUT /api/auth/updateprofile` - Actualizar perfil
- `PUT /api/auth/changepassword` - Cambiar contraseña

### Utilidad
- `GET /api/health` - Health check

## 🧪 Testing

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@delivereats.com","password":"admin123"}'

# Health check
curl http://localhost:3000/api/health
```

## 🛠️ Build para Producción

```bash
npm run build
npm start
```

## 📦 Tecnologías

- **Express** - HTTP Server (Gateway)
- **gRPC** - Comunicación entre servicios
- **Protocol Buffers** - Definición de contratos
- **TypeScript** - Tipado estático
- **MySQL** - Base de datos
- **JWT** - Autenticación
- **bcryptjs** - Hash de contraseñas

## 🔒 Variables de Entorno

Crea un archivo `.env`:

```env
NODE_ENV=development
PORT=3000
AUTH_SERVICE_PORT=50051
AUTH_SERVICE_URL=localhost:50051

DB_HOST=localhost
DB_PORT=3308
DB_USER=root
DB_PASSWORD=admin123
DB_NAME=auth_db

JWT_SECRET=deliver-eats-secret-key-2026
JWT_EXPIRE=7d
```

## 📝 Notas

- El **Gateway** no tiene acceso directo a la base de datos
- Toda la lógica de negocio está en los **servicios gRPC**
- Los servicios se comunican mediante **Protocol Buffers**
- Fácil escalar agregando más servicios (pedidos, restaurantes, etc.)
