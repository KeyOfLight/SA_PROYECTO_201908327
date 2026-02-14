export interface OrderItemInput {
  menu_item_id: number;
  quantity: number;
  price: number;
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  user_id: number;
  restaurant_id: number;
  status: string;
  total: number;
  created_at: string;
  items: OrderItem[];
}

export interface OrderResponse {
  success: boolean;
  message: string;
  order?: Order;
  validation?: {
    valid: boolean;
    message: string;
    results: Array<{
      product_id: number;
      exists: boolean;
      belongs_to_restaurant: boolean;
      price_matches: boolean;
      current_price: number;
      message: string;
    }>;
  };
}

export interface OrdersResponse {
  success: boolean;
  message: string;
  orders: Order[];
}
