import { ResultSetHeader } from 'mysql2/promise';
import { getPool } from '../../config/database';

export interface RestaurantRecord {
  id: number;
  name: string;
  address: string;
  cuisineType: string;
  openingHours: string;
  contactPhone: string;
  rating: number;
  ownerId: number;
}

export interface MenuItemRecord {
  id: number;
  restaurantId: number;
  name: string;
  description: string | null;
  price: number;
  available: boolean;
  stock: number;
}

export interface MenuItemInputRecord {
  restaurantId: number;
  name: string;
  description: string | null;
  price: number;
  available: boolean;
  stock?: number;
}

export const fetchMenuItemsByIds = async (ids: number[]): Promise<MenuItemRecord[]> => {
  if (ids.length === 0) {
    return [];
  }

  const placeholders = ids.map(() => '?').join(',');
  const sql = `
    SELECT id, restaurant_id AS restaurantId, name, description, price, available, stock
    FROM menu_items
    WHERE id IN (${placeholders})
  `;
  const pool = getPool();
  const [rows] = await pool.query(sql, ids);

  return rows as MenuItemRecord[];
};

export const createRestaurant = async (data: Omit<RestaurantRecord, 'id'>): Promise<RestaurantRecord> => {
  const sql = `
    INSERT INTO restaurants (name, address, cuisine_type, opening_hours, contact_phone, rating, owner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const pool = getPool();
  const [result] = await pool.query<ResultSetHeader>(sql, [
    data.name,
    data.address,
    data.cuisineType,
    data.openingHours,
    data.contactPhone,
    data.rating,
    data.ownerId
  ]);

  return {
    id: result.insertId,
    ...data
  };
};

export const fetchRestaurantById = async (id: number): Promise<RestaurantRecord | null> => {
  const sql = `
    SELECT id, name, address,
      cuisine_type AS cuisineType,
      opening_hours AS openingHours,
      contact_phone AS contactPhone,
      rating, owner_id AS ownerId
    FROM restaurants
    WHERE id = ?
  `;
  const pool = getPool();
  const [rows] = await pool.query(sql, [id]);
  const results = rows as RestaurantRecord[];
  return results[0] || null;
};

export const listRestaurants = async (): Promise<RestaurantRecord[]> => {
  const sql = `
    SELECT id, name, address,
      cuisine_type AS cuisineType,
      opening_hours AS openingHours,
      contact_phone AS contactPhone,
      rating, owner_id AS ownerId
    FROM restaurants
    ORDER BY name ASC
  `;
  const pool = getPool();
  const [rows] = await pool.query(sql);
  return rows as RestaurantRecord[];
};

export const updateRestaurant = async (data: RestaurantRecord): Promise<RestaurantRecord | null> => {
  const sql = `
    UPDATE restaurants
    SET name = ?, address = ?, cuisine_type = ?, opening_hours = ?, contact_phone = ?, rating = ?, owner_id = ?
    WHERE id = ?
  `;
  const pool = getPool();
  const [result] = await pool.query<ResultSetHeader>(sql, [
    data.name,
    data.address,
    data.cuisineType,
    data.openingHours,
    data.contactPhone,
    data.rating,
    data.ownerId,
    data.id
  ]);

  if (result.affectedRows === 0) {
    return null;
  }

  return data;
};

export const deleteRestaurant = async (id: number): Promise<boolean> => {
  const sql = 'DELETE FROM restaurants WHERE id = ?';
  const pool = getPool();
  const [result] = await pool.query<ResultSetHeader>(sql, [id]);
  return result.affectedRows > 0;
};

export const createMenuItem = async (data: MenuItemInputRecord): Promise<MenuItemRecord> => {
  const sql = `
    INSERT INTO menu_items (restaurant_id, name, description, price, available, stock)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const pool = getPool();
  const [result] = await pool.query<ResultSetHeader>(sql, [
    data.restaurantId,
    data.name,
    data.description,
    data.price,
    data.available,
    data.stock ?? 10
  ]);

  return {
    id: result.insertId,
    restaurantId: data.restaurantId,
    name: data.name,
    description: data.description,
    price: data.price,
    available: data.available,
    stock: data.stock ?? 10
  };
};

export const fetchMenuItemById = async (id: number): Promise<MenuItemRecord | null> => {
  const sql = `
    SELECT id, restaurant_id AS restaurantId, name, description, price, available, stock
    FROM menu_items
    WHERE id = ?
  `;
  const pool = getPool();
  const [rows] = await pool.query(sql, [id]);
  const results = rows as MenuItemRecord[];
  return results[0] || null;
};

export const listMenuItemsByRestaurant = async (
  restaurantId: number,
  onlyAvailable: boolean
): Promise<MenuItemRecord[]> => {
  const sql = `
    SELECT id, restaurant_id AS restaurantId, name, description, price, available, stock
    FROM menu_items
    WHERE restaurant_id = ?
      AND (? = FALSE OR available = TRUE)
    ORDER BY name ASC
  `;
  const pool = getPool();
  const [rows] = await pool.query(sql, [restaurantId, onlyAvailable]);
  return rows as MenuItemRecord[];
};

export const updateMenuItem = async (data: MenuItemRecord | MenuItemInputRecord & { id: number }): Promise<MenuItemRecord | null> => {
  const sql = `
    UPDATE menu_items
    SET restaurant_id = ?, name = ?, description = ?, price = ?, available = ?, stock = COALESCE(?, stock)
    WHERE id = ?
  `;
  const pool = getPool();
  const [result] = await pool.query<ResultSetHeader>(sql, [
    data.restaurantId,
    data.name,
    data.description,
    data.price,
    data.available,
    'stock' in data ? data.stock ?? null : null,
    data.id
  ]);

  if (result.affectedRows === 0) {
    return null;
  }

  return fetchMenuItemById(data.id);
};

export const deleteMenuItem = async (id: number): Promise<boolean> => {
  const sql = 'DELETE FROM menu_items WHERE id = ?';
  const pool = getPool();
  const [result] = await pool.query<ResultSetHeader>(sql, [id]);
  return result.affectedRows > 0;
};
