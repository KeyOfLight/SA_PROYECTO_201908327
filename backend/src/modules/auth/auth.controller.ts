import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as User from '../user/user.models';
import config from '../../config/config';

interface AuthRequest extends Request {
  user?: { id: number };
}

const generateToken = (userId: number): string => {
  return jwt.sign(
    { id: userId },
    config.jwtSecret,
    { expiresIn: config.jwtExpire } as any
  );
};

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, role } = req.body as { email: string; password: string; role?: string };

    // Validar campos requeridos
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Por favor proporcione email y contraseña'
      });
      return;
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
      return;
    }

    // Crear usuario
    const user = await User.create({
      email,
      password,
      role
    });

    if (!user) {
      res.status(500).json({
        success: false,
        message: 'No se pudo crear el usuario'
      });
      return;
    }

    // Generar token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Por favor proporcione email y contraseña'
      });
      return;
    }

    const user = await User.findByEmail(email, true);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
      return;
    }

    const isPasswordValid = await User.comparePassword(password, user.password || '');

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
      return;
    }

    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'No autorizado'
      });
      return;
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error en getMe:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'No autorizado'
      });
      return;
    }

    const { email, role } = req.body as { email?: string; role?: string };

    if (!email && !role) {
      res.status(400).json({
        success: false,
        message: 'No hay campos válidos para actualizar'
      });
      return;
    }

    const user = await User.updateProfile(req.user.id, { email, role });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error en updateProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'No autorizado'
      });
      return;
    }

    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Por favor proporcione la contraseña actual y la nueva'
      });
      return;
    }

    // Obtener usuario con password
    const user = await User.findById(req.user.id, true);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
      return;
    }

    // Verificar contraseña actual
    const isPasswordValid = await User.comparePassword(currentPassword, user.password || '');

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
      return;
    }

    await User.updatePassword(req.user.id, newPassword);

    res.status(200).json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error en changePassword:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar contraseña',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
