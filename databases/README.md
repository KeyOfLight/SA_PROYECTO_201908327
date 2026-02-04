# Deliver Eats - Bases de Datos MySQL

Este directorio contiene la configuración de Docker para las bases de datos MySQL del proyecto Deliver Eats.

## Bases de Datos

El sistema utiliza 5 bases de datos independientes:

1. **auth_db** - Gestión de usuarios y autenticación
2. **restaurant_db** - Restaurantes y menús
3. **order_db** - Órdenes y pedidos
4. **delivery_db** - Entregas
5. **notification_db** - Notificaciones

## Configuración

### Requisitos
- Docker
- Docker Compose

### Iniciar el contenedor

```bash
cd databases
docker-compose up -d
```

### Detener el contenedor

```bash
docker-compose down
```

### Ver logs

```bash
docker-compose logs -f
```

### Acceder a MySQL

```bash
docker exec -it deliver_eats_mysql mysql -u root -prootpassword
```

## Conexión desde aplicaciones

- **Host**: localhost
- **Puerto**: 3306
- **Usuario**: root
- **Contraseña**: rootpassword

### String de conexión ejemplo (Node.js)

```javascript
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'rootpassword',
  database: 'auth_db' // o la base de datos que necesites
});
```

## Estructura de Datos

### auth_db.users
- Almacena usuarios con roles: CLIENTE, RESTAURANTE, REPARTIDOR, ADMINISTRADOR

### restaurant_db
- **restaurants**: Información de restaurantes
- **menu_items**: Productos del menú de cada restaurante

### order_db
- **orders**: Órdenes realizadas por clientes
- **order_items**: Detalle de items en cada orden

### delivery_db
- **deliveries**: Estado de entregas de órdenes

### notification_db
- **notifications**: Notificaciones enviadas a usuarios

## Datos de Prueba

El script `model.sql` incluye datos de prueba:
- 4 usuarios de ejemplo (admin, cliente, restaurante, repartidor)
- 1 restaurante con 2 items de menú
- 1 orden de ejemplo con 2 items
- 1 entrega en camino
- 2 notificaciones de prueba

## Backup y Restore

### Crear backup

```bash
docker exec deliver_eats_mysql mysqldump -u root -prootpassword --all-databases > backup.sql
```

### Restaurar backup

```bash
docker exec -i deliver_eats_mysql mysql -u root -prootpassword < backup.sql
```
