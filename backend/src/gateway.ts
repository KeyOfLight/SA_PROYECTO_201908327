import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import config from './config/config';
import gatewayRouter from './routes/gateway.routes';

dotenv.config();

const app: Express = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging
if (config.nodeEnv === 'development') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Rutas
app.use('/api', gatewayRouter);

// Manejo de rutas no encontradas
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Inicio del servidor
const PORT = config.port;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'localhost:50051';
app.listen(PORT, () => {
  console.log(`API Gateway corriendo en puerto ${PORT}`);
  console.log(`Entorno: ${config.nodeEnv}`); 
  console.log(`Conectado a Auth Service en: ${AUTH_SERVICE_URL}`);
});

export default app;