import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import * as User from '../modules/user/user.models';
import config from '../config/config';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
      };
    }
  }
}

interface DecodedToken {
  id: number;
}

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  // Verificar si el token existe en el header Authorization
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verificar token
      const decoded = jwt.verify(token, config.jwtSecret) as DecodedToken;

      // Obtener usuario del token
      const user = await User.findById(decoded.id);

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      req.user = { id: user.id };
      next();
    } catch (error) {
      console.error('Error de autenticación:', error);

      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          message: 'Token inválido'
        });
        return;
      }

      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          message: 'Token expirado'
        });
        return;
      }

      res.status(401).json({
        success: false,
        message: 'No autorizado para acceder a esta ruta'
      });
    }
  } else {
    res.status(401).json({
      success: false,
      message: 'No se proporcionó token de autenticación'
    });
  }
};

// Middleware para autorizar roles específicos
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'No autorizado'
      });
      return;
    }

    // Note: You would need to extend the user object to include role
    // For now, this is a placeholder
    next();
  };
};
