import { IUserRepository } from '../../modules/user/user.repository';
import { TokenService } from './auth.token.service';

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: TokenService
  ) {}

  async login(email: string, password: string) {
    if (!email || !password) {
      throw new Error('Email y contraseña son requeridos');
    }

    const user = await this.userRepository.findByEmail(email, true);
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    const isPasswordValid = await this.userRepository.comparePassword(password, user.password || '');
    if (!isPasswordValid) {
      throw new Error('Credenciales inválidas');
    }

    const token = this.tokenService.sign({ id: user.id });

    return {
      success: true,
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
  }

  async register(email: string, password: string, role?: string) {
    if (!email || !password) {
      throw new Error('Email y contraseña son requeridos');
    }

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('El email ya está registrado');
    }

    const user = await this.userRepository.create({ email, password, role });
    if (!user) {
      throw new Error('No se pudo crear el usuario');
    }

    const token = this.tokenService.sign({ id: user.id });

    return {
      success: true,
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
  }

  async getMe(userId: number) {
    if (!userId) {
      throw new Error('Usuario ID es requerido');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return {
      success: true,
      message: 'Usuario obtenido',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
  }

  async updateProfile(userId: number, email?: string, role?: string) {
    if (!userId || (!email && !role)) {
      throw new Error('User ID y al menos un campo para actualizar son requeridos');
    }

    const user = await this.userRepository.updateProfile(userId, { email, role });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return {
      success: true,
      message: 'Perfil actualizado',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    if (!userId || !currentPassword || !newPassword) {
      throw new Error('User ID, contraseña actual y nueva son requeridas');
    }

    const user = await this.userRepository.findById(userId, true);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const isPasswordValid = await this.userRepository.comparePassword(currentPassword, user.password || '');
    if (!isPasswordValid) {
      throw new Error('Contraseña actual incorrecta');
    }

    await this.userRepository.updatePassword(userId, newPassword);

    return {
      success: true,
      message: 'Contraseña actualizada exitosamente'
    };
  }
}