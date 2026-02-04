module.exports = {
  // Entorno
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Puerto del servidor
  port: process.env.PORT || 3000,
  
  // Base de datos MySQL
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3308),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'rootpassword',
    database: process.env.MYSQL_DATABASE || 'auth_db'
  },
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'deliver-eats-secret-key-2026',
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',
};
