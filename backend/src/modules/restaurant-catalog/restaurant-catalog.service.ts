import {
  createMenuItem,
  createRestaurant,
  deleteMenuItem,
  deleteRestaurant,
  fetchMenuItemById,
  fetchMenuItemsByIds,
  fetchRestaurantById,
  listMenuItemsByRestaurant,
  listRestaurants,
  MenuItemRecord,
  RestaurantRecord,
  updateMenuItem,
  updateRestaurant
} from './restaurant-catalog.repository.mysql';

export interface ProductPriceInput {
  product_id: number;
  price: number;
  quantity?: number;
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

export interface ValidateItemsResult {
  valid: boolean;
  message: string;
  results: ItemValidationResult[];
}

export interface RestaurantInput {
  name: string;
  address: string;
  cuisine_type: string;
  opening_hours: string;
  contact_phone: string;
  rating: number;
  owner_id: number;
}

export interface MenuItemInput {
  restaurant_id: number;
  name: string;
  description: string;
  price: number;
  available: boolean;
}

const isSamePrice = (dbPrice: number, requestPrice: number): boolean => {
  return Math.abs(dbPrice - requestPrice) < 0.01;
};

const findItem = (items: Map<number, MenuItemRecord>, productId: number): MenuItemRecord | undefined => {
  return items.get(productId);
};

export const validateItems = async (
  restaurantId: number,
  items: ProductPriceInput[]
): Promise<ValidateItemsResult> => {
  if (!restaurantId || items.length === 0) {
    return {
      valid: false,
      message: 'Restaurant ID and items are required',
      results: []
    };
  }

  const ids = items.map(item => item.product_id);
  const dbItems = await fetchMenuItemsByIds(ids);
  const dbMap = new Map<number, MenuItemRecord>();

  dbItems.forEach(item => {
    dbMap.set(item.id, item);
  });

  const results: ItemValidationResult[] = items.map(item => {
    const dbItem = findItem(dbMap, item.product_id);
    const requestedQuantity = Math.max(1, Number(item.quantity || 1));

    if (!dbItem) {
      return {
        product_id: item.product_id,
        exists: false,
        belongs_to_restaurant: false,
        price_matches: false,
        in_stock: false,
        current_price: 0,
        message: 'Product not found'
      };
    }

    if (dbItem.restaurantId !== restaurantId) {
      return {
        product_id: item.product_id,
        exists: true,
        belongs_to_restaurant: false,
        price_matches: false,
        in_stock: false,
        current_price: Number(dbItem.price),
        message: 'Product does not belong to restaurant'
      };
    }

    const priceMatches = isSamePrice(Number(dbItem.price), Number(item.price));
    const inStock = Number(dbItem.stock) >= requestedQuantity;

    return {
      product_id: item.product_id,
      exists: true,
      belongs_to_restaurant: true,
      price_matches: priceMatches,
      in_stock: inStock,
      current_price: Number(dbItem.price),
      message: !inStock ? 'Insufficient stock' : priceMatches ? 'OK' : 'Price mismatch'
    };
  });

  const valid = results.every(result => result.exists && result.belongs_to_restaurant && result.price_matches && result.in_stock);

  return {
    valid,
    message: valid ? 'All items are valid' : 'No existe suficiente Stock o hay errores en los items',
    results
  };
};

const mapRestaurant = (record: RestaurantRecord) => ({
  id: record.id,
  name: record.name,
  address: record.address,
  cuisine_type: record.cuisineType,
  opening_hours: record.openingHours,
  contact_phone: record.contactPhone,
  rating: Number(record.rating),
  owner_id: record.ownerId
});

const mapMenuItem = (record: MenuItemRecord) => ({
  id: record.id,
  restaurant_id: record.restaurantId,
  name: record.name,
  description: record.description || '',
  price: Number(record.price),
  available: Boolean(record.available)
});

export const createRestaurantEntry = async (input: RestaurantInput) => {
  const created = await createRestaurant({
    name: input.name,
    address: input.address,
    cuisineType: input.cuisine_type || 'General',
    openingHours: input.opening_hours || '09:00-21:00',
    contactPhone: input.contact_phone || 'N/A',
    rating: Number(input.rating) || 0,
    ownerId: input.owner_id
  });

  return mapRestaurant(created);
};

export const getRestaurantEntry = async (id: number) => {
  const found = await fetchRestaurantById(id);
  return found ? mapRestaurant(found) : null;
};

export const listRestaurantEntries = async () => {
  const rows = await listRestaurants();
  return rows.map(mapRestaurant);
};

export const updateRestaurantEntry = async (id: number, input: RestaurantInput) => {
  const updated = await updateRestaurant({
    id,
    name: input.name,
    address: input.address,
    cuisineType: input.cuisine_type || 'General',
    openingHours: input.opening_hours || '09:00-21:00',
    contactPhone: input.contact_phone || 'N/A',
    rating: Number(input.rating) || 0,
    ownerId: input.owner_id
  });

  return updated ? mapRestaurant(updated) : null;
};

export const deleteRestaurantEntry = async (id: number) => {
  return deleteRestaurant(id);
};

export const createMenuItemEntry = async (input: MenuItemInput) => {
  const created = await createMenuItem({
    restaurantId: input.restaurant_id,
    name: input.name,
    description: input.description || '',
    price: Number(input.price),
    available: Boolean(input.available)
  });

  return mapMenuItem(created);
};

export const getMenuItemEntry = async (id: number) => {
  const found = await fetchMenuItemById(id);
  return found ? mapMenuItem(found) : null;
};

export const listMenuItemsEntry = async (restaurantId: number, onlyAvailable: boolean) => {
  const rows = await listMenuItemsByRestaurant(restaurantId, onlyAvailable);
  return rows.map(mapMenuItem);
};

export const updateMenuItemEntry = async (id: number, input: MenuItemInput) => {
  const updated = await updateMenuItem({
    id,
    restaurantId: input.restaurant_id,
    name: input.name,
    description: input.description || '',
    price: Number(input.price),
    available: Boolean(input.available)
  });

  return updated ? mapMenuItem(updated) : null;
};

export const deleteMenuItemEntry = async (id: number) => {
  return deleteMenuItem(id);
};
