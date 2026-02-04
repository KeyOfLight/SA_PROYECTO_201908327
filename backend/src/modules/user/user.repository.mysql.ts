import * as User from './user.models';
import { IUserRepository } from './user.repository';

export class MySqlUserRepository implements IUserRepository {
  findByEmail(email: string, includePassword: boolean = false) {
    return User.findByEmail(email, includePassword);
  }

  findById(id: number, includePassword: boolean = false) {
    return User.findById(id, includePassword);
  }

  create(input: { email: string; password: string; role?: string }) {
    return User.create(input);
  }

  comparePassword(candidatePassword: string, hashedPassword: string) {
    return User.comparePassword(candidatePassword, hashedPassword);
  }

  updateProfile(id: number, input: { email?: string; role?: string }) {
    return User.updateProfile(id, input);
  }

  updatePassword(id: number, newPassword: string) {
    return User.updatePassword(id, newPassword);
  }
}