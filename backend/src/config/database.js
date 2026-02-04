const mysql = require('mysql2/promise');
const config = require('./config');

let pool;

const connectDB = async () => {
  try {
    pool = mysql.createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    await pool.query('SELECT 1');
    console.log(`MySQL conectado: ${config.mysql.host}:${config.mysql.port}/${config.mysql.database}`);
  } catch (error) {
    console.error(`Error conectando a MySQL: ${error.message}`);
    process.exit(1);
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error('La conexión MySQL no ha sido inicializada');
  }
  return pool;
};

module.exports = { connectDB, getPool };
