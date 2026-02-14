import {
  createOrder,
  fetchOrderById,
  fetchOrderItemsByOrderIds,
  fetchOrdersByRestaurant,
  fetchOrdersByUser,
  updateOrderStatus,
  CreateOrderItemInput,
  OrderItemRecord,
  OrderRecord
} from './order.repository.mysql';

export interface OrderItemInput {
  menu_item_id: number;
  quantity: number;
  price: number;
}

export interface OrderItemDto {
  id: number;
  order_id: number;
  menu_item_id: number;
  quantity: number;
  price: number;
}

export interface OrderDto {
  id: number;
  user_id: number;
  restaurant_id: number;
  status: string;
  total: number;
  created_at: string;
  items: OrderItemDto[];
}

const VALID_STATUSES = new Set(['CREADA', 'EN_PROCESO', 'FINALIZADA', 'RECHAZADA', 'CANCELADA']);
const RESTAURANT_ACTION_STATUSES = new Set(['EN_PROCESO', 'FINALIZADA', 'RECHAZADA']);
const CLIENT_CANCEL_STATUSES = new Set(['CREADA', 'EN_PROCESO']);

const mapOrder = (record: OrderRecord, items: OrderItemRecord[]): OrderDto => ({
  id: record.id,
  user_id: record.userId,
  restaurant_id: record.restaurantId,
  status: record.status,
  total: Number(record.total),
  created_at: record.createdAt instanceof Date ? record.createdAt.toISOString() : String(record.createdAt),
  items: items.map(item => ({
    id: item.id,
    order_id: item.orderId,
    menu_item_id: item.menuItemId,
    quantity: item.quantity,
    price: Number(item.price)
  }))
});

const buildItemsMap = (items: OrderItemRecord[]): Map<number, OrderItemRecord[]> => {
  const map = new Map<number, OrderItemRecord[]>();
  items.forEach(item => {
    if (!map.has(item.orderId)) {
      map.set(item.orderId, []);
    }
    map.get(item.orderId)!.push(item);
  });
  return map;
};

const validateItems = (items: OrderItemInput[]): void => {
  if (!items || items.length === 0) {
    throw new Error('Order items are required');
  }

  items.forEach(item => {
    if (!item.menu_item_id || item.quantity <= 0) {
      throw new Error('Invalid order item');
    }
    if (Number.isNaN(Number(item.price)) || Number(item.price) < 0) {
      throw new Error('Invalid order item');
    }
  });
};

export const createOrderEntry = async (
  userId: number,
  restaurantId: number,
  items: OrderItemInput[]
): Promise<OrderDto> => {
  if (!userId || !restaurantId) {
    throw new Error('User ID and restaurant ID are required');
  }

  validateItems(items);

  const total = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const orderItems: CreateOrderItemInput[] = items.map(item => ({
    menuItemId: item.menu_item_id,
    quantity: item.quantity,
    price: Number(item.price)
  }));

  const created = await createOrder(userId, restaurantId, total, orderItems);
  const orderItemsRecords = await fetchOrderItemsByOrderIds([created.id]);

  return mapOrder(created, orderItemsRecords);
};

export const cancelOrderEntry = async (orderId: number, userId: number): Promise<OrderDto | null> => {
  const order = await fetchOrderById(orderId);
  if (!order) {
    return null;
  }

  if (order.userId !== userId) {
    throw new Error('Forbidden');
  }

  if (!CLIENT_CANCEL_STATUSES.has(order.status)) {
    throw new Error('Order cannot be cancelled');
  }

  const updated = await updateOrderStatus(orderId, 'CANCELADA');
  if (!updated) {
    return null;
  }

  const items = await fetchOrderItemsByOrderIds([updated.id]);
  return mapOrder(updated, items);
};

export const updateOrderStatusEntry = async (
  orderId: number,
  status: string,
  restaurantId?: number
): Promise<OrderDto | null> => {
  if (!VALID_STATUSES.has(status)) {
    throw new Error('Invalid order status');
  }

  if (!RESTAURANT_ACTION_STATUSES.has(status)) {
    throw new Error('Status change not allowed');
  }

  if (!restaurantId) {
    throw new Error('Restaurant ID is required');
  }

  const existing = await fetchOrderById(orderId);
  if (!existing) {
    return null;
  }

  if (existing.restaurantId !== restaurantId) {
    throw new Error('Forbidden');
  }

  const updated = await updateOrderStatus(orderId, status);
  if (!updated) {
    return null;
  }

  const items = await fetchOrderItemsByOrderIds([updated.id]);
  return mapOrder(updated, items);
};

export const listOrdersByUserEntry = async (userId: number): Promise<OrderDto[]> => {
  const orders = await fetchOrdersByUser(userId);
  const orderIds = orders.map(order => order.id);
  const items = await fetchOrderItemsByOrderIds(orderIds);
  const itemsMap = buildItemsMap(items);

  return orders.map(order => mapOrder(order, itemsMap.get(order.id) || []));
};

export const listOrdersByRestaurantEntry = async (restaurantId: number): Promise<OrderDto[]> => {
  const orders = await fetchOrdersByRestaurant(restaurantId);
  const orderIds = orders.map(order => order.id);
  const items = await fetchOrderItemsByOrderIds(orderIds);
  const itemsMap = buildItemsMap(items);

  return orders.map(order => mapOrder(order, itemsMap.get(order.id) || []));
};
