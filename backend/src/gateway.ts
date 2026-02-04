import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import config from './config/config';
import { TokenService } from './modules/auth/auth.token.service';

dotenv.config();

const app: Express = express();
 
const PROTO_PATH = path.join(__dirname, './proto/auth.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const authProto = grpc.loadPackageDefinition(packageDefinition) as any;

// Crear cliente gRPC
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'localhost:50051';
const authClient = new authProto.auth.AuthService(
  AUTH_SERVICE_URL,
  grpc.credentials.createInsecure()
);

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

// Middleware para extraer token
interface AuthenticatedRequest extends Request {
  user?: { id: number };
}

const tokenService = new TokenService();

const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'No autorizado'
    });
    return;
  }

  try {
    const decoded = tokenService.verify(token);
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

// Rutas públicas

// Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  authClient.login({ email, password }, (err: any, response: any) => {
    if (err) {
      console.error('gRPC error:', err);
      res.status(err.code === 16 ? 401 : 500).json({
        success: false,
        message: err.message || 'Error en login'
      });
      return;
    }

    res.status(200).json(response);
  });
});

// Register
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { email, password, role } = req.body;

  authClient.register({ email, password, role: role || 'CLIENTE' }, (err: any, response: any) => {
    if (err) {
      console.error('gRPC error:', err);
      res.status(err.code === 6 ? 400 : 500).json({
        success: false,
        message: err.message || 'Error en registro'
      });
      return;
    }

    res.status(201).json(response);
  });
});

// Rutas protegidas

// Get Me
app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'No autorizado'
    });
    return;
  }

  authClient.getMe({ user_id: req.user.id }, (err: any, response: any) => {
    if (err) {
      console.error('gRPC error:', err);
      res.status(err.code === 5 ? 404 : 500).json({
        success: false,
        message: err.message || 'Error obteniendo usuario'
      });
      return;
    }

    res.status(200).json(response);
  });
});

// Update Profile
app.put('/api/auth/updateprofile', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'No autorizado'
    });
    return;
  }

  const { email, role } = req.body;

  authClient.updateProfile({ user_id: req.user.id, email, role }, (err: any, response: any) => {
    if (err) {
      console.error('gRPC error:', err);
      res.status(err.code === 5 ? 404 : 500).json({
        success: false,
        message: err.message || 'Error actualizando perfil'
      });
      return;
    }

    res.status(200).json(response);
  });
});

// Change Password
app.put('/api/auth/changepassword', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'No autorizado'
    });
    return;
  }

  const { currentPassword, newPassword } = req.body;

  authClient.changePassword(
    { user_id: req.user.id, current_password: currentPassword, new_password: newPassword },
    (err: any, response: any) => {
      if (err) {
        console.error('gRPC error:', err);
        res.status(err.code === 16 ? 401 : 500).json({
          success: false,
          message: err.message || 'Error cambiando contraseña'
        });
        return;
      }

      res.status(200).json(response);
    }
  );
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API Gateway funcionando',
    timestamp: new Date().toISOString()
  });
});

// Manejo de rutas no encontradas
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Inicio del servidor
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`API Gateway corriendo en puerto ${PORT}`);
  console.log(`Entorno: ${config.nodeEnv}`); 
  console.log(`Conectado a Auth Service en: ${AUTH_SERVICE_URL}`);
});

export default app;
