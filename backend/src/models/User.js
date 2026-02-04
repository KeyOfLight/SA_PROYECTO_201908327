const bcrypt = require('bcryptjs');
const { getPool } = require('../config/database');

const mapUser = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at
  };
};

const findByEmail = async (email, includePassword = false) => {
  const pool = getPool();
  const [rows] = await pool.query(
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

const findById = async (id, includePassword = false) => {
  const pool = getPool();
  const [rows] = await pool.query(
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

const create = async ({ email, password, role = 'CLIENTE' }) => {
  const pool = getPool();
  const hashedPassword = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
    [email, hashedPassword, role]
  );

  return findById(result.insertId);
};

const comparePassword = async (candidatePassword, hashedPassword) => {
  return bcrypt.compare(candidatePassword, hashedPassword);
};

const updateProfile = async (id, { email, role }) => {
  const pool = getPool();
  const fields = [];
  const values = [];

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

const updatePassword = async (id, newPassword) => {
  const pool = getPool();
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await pool.query(
    'UPDATE users SET password = ? WHERE id = ?',
    [hashedPassword, id]
  );
};

module.exports = {
  findByEmail,
  findById,
  create,
  comparePassword,
  updateProfile,
  updatePassword
};
