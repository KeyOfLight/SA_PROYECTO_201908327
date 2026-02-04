import { IUser } from './user.models';

export interface IUserRepository {
  findByEmail(email: string, includePassword?: boolean): Promise<IUser | null>;
  findById(id: number, includePassword?: boolean): Promise<IUser | null>;
  create(input: { email: string; password: string; role?: string }): Promise<IUser | null>;
  comparePassword(candidatePassword: string, hashedPassword: string): Promise<boolean>;
  updateProfile(id: number, input: { email?: string; role?: string }): Promise<IUser | null>;
  updatePassword(id: number, newPassword: string): Promise<void>;
}