import express, { Express, Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import config from './config/config';
import router from './routes';

dotenv.config();

const app: Express = express();
 
connectDB();
 
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging de requests en desarrollo
if (config.nodeEnv === 'development') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Rutas
app.use('', router);

// // Ruta de prueba
// app.get('/api/health', (req: Request, res: Response) => {
//   res.json({
//     success: true,
//     message: 'Servidor funcionando correctamente',
//     timestamp: new Date().toISOString()
//   });
// });

// Manejo de rutas no encontradas
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Manejo de errores global
interface CustomError extends Error {
  status?: number;
}

const errorHandler: ErrorRequestHandler = (err: CustomError, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    error: config.nodeEnv === 'development' ? err : {}
  });
};

app.use(errorHandler);

// Iniciar servidor
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Entorno: ${config.nodeEnv}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

export default app;
