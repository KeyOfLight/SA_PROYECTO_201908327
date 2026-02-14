import { ResultSetHeader } from 'mysql2/promise';
import { getPool } from '../../config/database';

export interface OrderRecord {
  id: number;
  userId: number;
  restaurantId: number;
  status: string;
  total: number;
  createdAt: Date;
}

export interface OrderItemRecord {
  id: number;
  orderId: number;
  menuItemId: number;
  quantity: number;
  price: number;
}

export interface CreateOrderItemInput {
  menuItemId: number;
  quantity: number;
  price: number;
}

export const createOrder = async (
  userId: number,
  restaurantId: number,
  total: number,
  items: CreateOrderItemInput[]
): Promise<OrderRecord> => {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const quantityByItem = new Map<number, number>();
    items.forEach(item => {
      const current = quantityByItem.get(item.menuItemId) || 0;
      quantityByItem.set(item.menuItemId, current + item.quantity);
    });

    const itemIds = Array.from(quantityByItem.keys());
    if (itemIds.length === 0) {
      throw new Error('Order items are required');
    }

    const placeholders = itemIds.map(() => '?').join(',');
    const stockSql = `
      SELECT id, stock
      FROM restaurant_db.menu_items
      WHERE id IN (${placeholders})
      FOR UPDATE
    `;
    const [stockRows] = await connection.query(stockSql, itemIds);
    const stockList = stockRows as Array<{ id: number; stock: number }>;
    const stockMap = new Map<number, number>();
    stockList.forEach(row => stockMap.set(row.id, Number(row.stock)));

    for (const [menuItemId, quantity] of quantityByItem.entries()) {
      const stock = stockMap.get(menuItemId);
      if (stock === undefined) {
        throw new Error('Invalid order item');
      }
      if (stock < quantity) {
        throw new Error('Insufficient stock');
      }
    }

    const stockCases = itemIds.map(() => 'WHEN ? THEN ?').join(' ');
    const updateSql = `
      UPDATE restaurant_db.menu_items
      SET stock = stock - CASE id ${stockCases} END
      WHERE id IN (${placeholders})
    `;

    const updateParams: Array<number> = [];
    itemIds.forEach(id => {
      updateParams.push(id, quantityByItem.get(id) || 0);
    });

    await connection.query(updateSql, [...updateParams, ...itemIds]);

    const insertOrderSql = `
      INSERT INTO orders (user_id, restaurant_id, status, total)
      VALUES (?, ?, 'CREADA', ?)
    `;
    const [orderResult] = await connection.query<ResultSetHeader>(insertOrderSql, [
      userId,
      restaurantId,
      total
    ]);

    const orderId = orderResult.insertId;

    const insertItemsSql = `
      INSERT INTO order_items (order_id, menu_item_id, quantity, price)
      VALUES ?
    `;
    const itemRows = items.map(item => [orderId, item.menuItemId, item.quantity, item.price]);
    await connection.query(insertItemsSql, [itemRows]);

    await connection.commit();

    return {
      id: orderId,
      userId,
      restaurantId,
      status: 'CREADA',
      total,
      createdAt: new Date()
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const fetchOrderById = async (id: number): Promise<OrderRecord | null> => {
  const sql = `
    SELECT id, user_id AS userId, restaurant_id AS restaurantId, status, total, created_at AS createdAt
    FROM orders
    WHERE id = ?
  `;
  const pool = getPool();
  const [rows] = await pool.query(sql, [id]);
  const results = rows as OrderRecord[];
  return results[0] || null;
};

export const updateOrderStatus = async (id: number, status: string): Promise<OrderRecord | null> => {
  const sql = `
    UPDATE orders
    SET status = ?
    WHERE id = ?
  `;
  const pool = getPool();
  const [result] = await pool.query<ResultSetHeader>(sql, [status, id]);

  if (result.affectedRows === 0) {
    return null;
  }

  return fetchOrderById(id);
};

export const fetchOrdersByUser = async (userId: number): Promise<OrderRecord[]> => {
  const sql = `
    SELECT id, user_id AS userId, restaurant_id AS restaurantId, status, total, created_at AS createdAt
    FROM orders
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;
  const pool = getPool();
  const [rows] = await pool.query(sql, [userId]);
  return rows as OrderRecord[];
};

export const fetchOrdersByRestaurant = async (restaurantId: number): Promise<OrderRecord[]> => {
  const sql = `
    SELECT id, user_id AS userId, restaurant_id AS restaurantId, status, total, created_at AS createdAt
    FROM orders
    WHERE restaurant_id = ?
    ORDER BY created_at DESC
  `;
  const pool = getPool();
  const [rows] = await pool.query(sql, [restaurantId]);
  return rows as OrderRecord[];
};

export const fetchOrderItemsByOrderIds = async (orderIds: number[]): Promise<OrderItemRecord[]> => {
  if (orderIds.length === 0) {
    return [];
  }

  const placeholders = orderIds.map(() => '?').join(',');
  const sql = `
    SELECT id, order_id AS orderId, menu_item_id AS menuItemId, quantity, price
    FROM order_items
    WHERE order_id IN (${placeholders})
    ORDER BY id ASC
  `;
  const pool = getPool();
  const [rows] = await pool.query(sql, orderIds);
  return rows as OrderItemRecord[];
};
