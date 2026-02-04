import bcrypt from 'bcryptjs';
import { RowDataPacket } from 'mysql2/promise';
import { getPool } from '../../config/database';

export interface IUser {
  id: number;
  email: string;
  password?: string;
  role: string;
  createdAt: Date;
}

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  password: string;
  role: string;
  created_at: Date;
}

const mapUser = (row: UserRow): IUser => {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at
  };
};

export const findByEmail = async (email: string, includePassword: boolean = false): Promise<IUser | null> => {
  const pool = getPool();
  const [rows] = await pool.query<UserRow[]>(
    'SELECT id, email, password, role, created_at FROM users WHERE email = ? LIMIT 1',
    [email]
  );

  if (!rows.length) return null;

  const user = rows[0];
  if (!includePassword) {
    return mapUser(user);
  }

  return {
    ...mapUser(user),
    password: user.password
  };
};

export const findById = async (id: number, includePassword: boolean = false): Promise<IUser | null> => {
  const pool = getPool();
  const [rows] = await pool.query<UserRow[]>(
    'SELECT id, email, password, role, created_at FROM users WHERE id = ? LIMIT 1',
    [id]
  );

  if (!rows.length) return null;

  const user = rows[0];
  if (!includePassword) {
    return mapUser(user);
  }

  return {
    ...mapUser(user),
    password: user.password
  };
};

interface CreateUserInput {
  email: string;
  password: string;
  role?: string;
}

export const create = async ({ email, password, role = 'CLIENTE' }: CreateUserInput): Promise<IUser | null> => {
  const pool = getPool();
  const hashedPassword = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
    [email, hashedPassword, role]
  );

  return findById((result as any).insertId);
};

export const comparePassword = async (candidatePassword: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(candidatePassword, hashedPassword);
};

interface UpdateProfileInput {
  email?: string;
  role?: string;
}

export const updateProfile = async (id: number, { email, role }: UpdateProfileInput): Promise<IUser | null> => {
  const pool = getPool();
  const fields: string[] = [];
  const values: any[] = [];

  if (email) {
    fields.push('email = ?');
    values.push(email);
  }

  if (role) {
    fields.push('role = ?');
    values.push(role);
  }

  if (!fields.length) {
    return findById(id);
  }

  values.push(id);

  await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  return findById(id);
};

export const updatePassword = async (id: number, newPassword: string): Promise<void> => {
  const pool = getPool();
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await pool.query(
    'UPDATE users SET password = ? WHERE id = ?',
    [hashedPassword, id]
  );
};
