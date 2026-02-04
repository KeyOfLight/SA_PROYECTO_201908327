FROM mysql:8.0

# Variables de entorno para MySQL
ENV MYSQL_ROOT_PASSWORD=rootpassword
ENV MYSQL_DATABASE=auth_db

# Copiar el script SQL al contenedor
COPY model.sql /docker-entrypoint-initdb.d/

# Exponer el puerto de MySQL
EXPOSE 3308
