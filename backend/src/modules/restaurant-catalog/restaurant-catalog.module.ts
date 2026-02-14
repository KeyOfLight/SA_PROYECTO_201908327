import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import dotenv from 'dotenv';
import config from '../../config/config';
import { connectDB } from '../../config/database';
import {
  createMenuItemEntry,
  createRestaurantEntry,
  deleteMenuItemEntry,
  deleteRestaurantEntry,
  getMenuItemEntry,
  getRestaurantEntry,
  listMenuItemsEntry,
  listRestaurantEntries,
  updateMenuItemEntry,
  updateRestaurantEntry,
  validateItems
} from './restaurant-catalog.service';

dotenv.config();

const PROTO_PATH = path.join(__dirname, '../../proto/restaurant-catalog.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const catalogProto = grpc.loadPackageDefinition(packageDefinition) as any;

const mapErrorToStatus = (error: unknown): { code: grpc.status; message: string } => {
  if (error instanceof Error) {
    console.error('Catalog service error:', error);
  } else {
    console.error('Catalog service error:', error);
  }

  const message = error instanceof Error ? error.message : 'Internal server error';

  switch (message) {
    case 'Restaurant ID and items are required':
      return { code: grpc.status.INVALID_ARGUMENT, message };
    default:
      return { code: grpc.status.INTERNAL, message };
  }
};

const serviceImpl = {
  validateItems: async (call: any, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const restaurantId = Number(call.request?.restaurant_id);
      const items = call.request?.items || [];
      const response = await validateItems(restaurantId, items);
      callback(null, response);
    } catch (error) {
      const mapped = mapErrorToStatus(error);
      callback(mapped);
    }
  },
  createRestaurant: async (call: any, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const restaurant = await createRestaurantEntry(call.request);
      callback(null, { success: true, message: 'Restaurant created', restaurant });
    } catch (error) {
      const mapped = mapErrorToStatus(error);
      callback(mapped);
    }
  },
  getRestaurant: async (call: any, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const restaurant = await getRestaurantEntry(Number(call.request?.id));
      if (!restaurant) {
        callback(null, { success: false, message: 'Restaurant not found' });
        return;
      }
      callback(null, { success: true, message: 'OK', restaurant });
    } catch (error) {
      const mapped = mapErrorToStatus(error);
      callback(mapped);
    }
  },
  updateRestaurant: async (call: any, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const id = Number(call.request?.id);
      const restaurant = await updateRestaurantEntry(id, call.request);
      if (!restaurant) {
        callback(null, { success: false, message: 'Restaurant not found' });
        return;
      }
      callback(null, { success: true, message: 'Restaurant updated', restaurant });
    } catch (error) {
      const mapped = mapErrorToStatus(error);
      callback(mapped);
    }
  },
  deleteRestaurant: async (call: any, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const removed = await deleteRestaurantEntry(Number(call.request?.id));
      callback(null, {
        success: removed,
        message: removed ? 'Restaurant deleted' : 'Restaurant not found'
      });
    } catch (error) {
      const mapped = mapErrorToStatus(error);
      callback(mapped);
    }
  },
  listRestaurants: async (_call: any, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const restaurants = await listRestaurantEntries();
      callback(null, { success: true, message: 'OK', restaurants });
    } catch (error) {
      const mapped = mapErrorToStatus(error);
      callback(mapped);
    }
  },
  createMenuItem: async (call: any, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const item = await createMenuItemEntry(call.request);
      callback(null, { success: true, message: 'Menu item created', item });
    } catch (error) {
      const mapped = mapErrorToStatus(error);
      callback(mapped);
    }
  },
  getMenuItem: async (call: any, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const item = await getMenuItemEntry(Number(call.request?.id));
      if (!item) {
        callback(null, { success: false, message: 'Menu item not found' });
        return;
      }
      callback(null, { success: true, message: 'OK', item });
    } catch (error) {
      const mapped = mapErrorToStatus(error);
      callback(mapped);
    }
  },
  updateMenuItem: async (call: any, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const id = Number(call.request?.id);
      const item = await updateMenuItemEntry(id, call.request);
      if (!item) {
        callback(null, { success: false, message: 'Menu item not found' });
        return;
      }
      callback(null, { success: true, message: 'Menu item updated', item });
    } catch (error) {
      const mapped = mapErrorToStatus(error);
      callback(mapped);
    }
  },
  deleteMenuItem: async (call: any, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const removed = await deleteMenuItemEntry(Number(call.request?.id));
      callback(null, {
        success: removed,
        message: removed ? 'Menu item deleted' : 'Menu item not found'
      });
    } catch (error) {
      const mapped = mapErrorToStatus(error);
      callback(mapped);
    }
  },
  listMenuItemsByRestaurant: async (call: any, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const restaurantId = Number(call.request?.restaurant_id);
      const onlyAvailable = Boolean(call.request?.only_available);
      const items = await listMenuItemsEntry(restaurantId, onlyAvailable);
      callback(null, { success: true, message: 'OK', items });
    } catch (error) {
      const mapped = mapErrorToStatus(error);
      callback(mapped);
    }
  }
};

async function startRestaurantCatalogService() {
  await connectDB();

  const server = new grpc.Server();
  server.addService(catalogProto.restaurant_catalog.RestaurantCatalogService.service, serviceImpl);

  const PORT = process.env.RESTAURANT_CATALOG_PORT || 50052;
  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error(`Error binding server: ${err}`);
      process.exit(1);
    }
    server.start();
    console.log(`Restaurant Catalog Service running on port ${port}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Database: ${config.mysql.database}`);
  });
}

startRestaurantCatalogService().catch(err => {
  console.error('Error starting Restaurant Catalog Service:', err);
  process.exit(1);
});
