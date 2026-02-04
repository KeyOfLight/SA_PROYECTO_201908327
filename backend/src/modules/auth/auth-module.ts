import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import config from '../../config/config';
import { connectDB } from '../../config/database';
import dotenv from 'dotenv';
import { AuthService } from './auth.service';
import { TokenService } from './auth.token.service';
import { MySqlUserRepository } from '../user/user.repository.mysql';

dotenv.config();

// Cargar el archivo .proto
const PROTO_PATH = path.join(__dirname, '../../proto/auth.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const authProto = grpc.loadPackageDefinition(packageDefinition) as any;

const authService = new AuthService(
  new MySqlUserRepository(),
  new TokenService()
);

const mapErrorToStatus = (error: unknown): { code: grpc.status; message: string } => {
  const message = error instanceof Error ? error.message : 'Error interno del servidor';

  switch (message) {
    case 'Email y contraseña son requeridos':
    case 'User ID y al menos un campo para actualizar son requeridos':
    case 'User ID, contraseña actual y nueva son requeridas':
    case 'Usuario ID es requerido':
      return { code: grpc.status.INVALID_ARGUMENT, message };
    case 'El email ya está registrado':
      return { code: grpc.status.ALREADY_EXISTS, message };
    case 'Credenciales inválidas':
    case 'Contraseña actual incorrecta':
      return { code: grpc.status.UNAUTHENTICATED, message };
    case 'Usuario no encontrado':
      return { code: grpc.status.NOT_FOUND, message };
    case 'No se pudo crear el usuario':
      return { code: grpc.status.INTERNAL, message };
    default:
      return { code: grpc.status.INTERNAL, message: 'Error interno del servidor' };
  }
};

// Implementación del servicio
const authServiceImpl = {
  login: async (call: any, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const { email, password } = call.request;
      const response = await authService.login(email, password);
      callback(null, response);
    } catch (error) {
      console.error('Error en login:', error);
      const mapped = mapErrorToStatus(error);
      callback(mapped);
    }
  },

  register: async (call: any, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const { email, password, role } = call.request;
      const response = await authService.register(email, password, role);
      callback(null, response);
    } catch (error) {
      console.error('Error en register:', error);
      const mapped = mapErrorToStatus(error);
      callback(mapped);
    }
  },

  getMe: async (call: any, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const { user_id } = call.request;
      const response = await authService.getMe(user_id);
      callback(null, response);
    } catch (error) {
      console.error('Error en getMe:', error);
      const mapped = mapErrorToStatus(error);
      callback(mapped);
    }
  },

  updateProfile: async (call: any, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const { user_id, email, role } = call.request;
      const response = await authService.updateProfile(user_id, email, role);
      callback(null, response);
    } catch (error) {
      console.error('Error en updateProfile:', error);
      const mapped = mapErrorToStatus(error);
      callback(mapped);
    }
  },

  changePassword: async (call: any, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const { user_id, current_password, new_password } = call.request;
      const response = await authService.changePassword(user_id, current_password, new_password);
      callback(null, response);
    } catch (error) {
      console.error('Error en changePassword:', error);
      const mapped = mapErrorToStatus(error);
      callback(mapped);
    }
  }
};

// Crear y iniciar el servidor gRPC
async function startAuthService() {
  await connectDB();

  const server = new grpc.Server();

  server.addService(authProto.auth.AuthService.service, authServiceImpl);

  const AUTH_PORT = process.env.AUTH_SERVICE_PORT || 50051;
  server.bindAsync(`0.0.0.0:${AUTH_PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error(`Error binding server: ${err}`);
      process.exit(1);
    }
    server.start();
    console.log(` Auth Service corriendo en puerto ${port}`);
    console.log(` Entorno: ${config.nodeEnv}`);
  });
}

startAuthService().catch(err => {
  console.error('Error starting Auth Service:', err);
  process.exit(1);
});
