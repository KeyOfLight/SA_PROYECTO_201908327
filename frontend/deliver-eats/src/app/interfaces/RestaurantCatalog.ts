export interface CatalogItemInput {
  product_id: number;
  price: number;
}

export interface ItemValidationResult {
  product_id: number;
  exists: boolean;
  belongs_to_restaurant: boolean;
  price_matches: boolean;
  in_stock: boolean;
  current_price: number;
  message: string;
}

export interface ValidateItemsResponse {
  valid: boolean;
  message: string;
  results: ItemValidationResult[];
}

export interface Restaurant {
  id: number;
  name: string;
  address: string;
  cuisine_type: string;
  opening_hours: string;
  contact_phone: string;
  rating: number;
  owner_id: number;
}

export interface MenuItem {
  id: number;
  restaurant_id: number;
  name: string;
  description: string;
  price: number;
  available: boolean;
}

export interface RestaurantsResponse {
  success: boolean;
  message: string;
  restaurants: Restaurant[];
}

export interface MenuItemsResponse {
  success: boolean;
  message: string;
  items: MenuItem[];
}

export interface RestaurantResponse {
  success: boolean;
  message: string;
  restaurant?: Restaurant;
}

export interface MenuItemResponse {
  success: boolean;
  message: string;
  item?: MenuItem;
}
