import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import dotenv from 'dotenv';
import config from '../../config/config';
import { connectDB } from '../../config/database';
import {
  cancelOrderEntry,
  createOrderEntry,
  listOrdersByRestaurantEntry,
  listOrdersByUserEntry,
  updateOrderStatusEntry
} from './order.service';

dotenv.config();

const PROTO_PATH = path.join(__dirname, '../../proto/order.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const orderProto = grpc.loadPackageDefinition(packageDefinition) as any;

const CATALOG_PROTO_PATH = path.join(__dirname, '../../proto/restaurant-catalog.proto');
const catalogPackageDefinition = protoLoader.loadSync(CATALOG_PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const catalogProto = grpc.loadPackageDefinition(catalogPackageDefinition) as any;
const catalogClient = new catalogProto.restaurant_catalog.RestaurantCatalogService(
  process.env.RESTAURANT_CATALOG_URL || 'localhost:50052',
  grpc.credentials.createInsecure()
);

const mapErrorToStatus = (error: unknown): { code: grpc.status; message: string } => {
  const message = error instanceof Error ? error.message : 'Internal server error';

  switch (message) {
    case 'User ID and restaurant ID are required':
    case 'Order items are required':
    case 'Invalid order item':
    case 'Invalid order status':
    case 'Status change not allowed':
    case 'Order cannot be cancelled':
    case 'Restaurant ID is required':
    case 'Catalog validation failed':
    case 'Insufficient stock':
      return { code: grpc.status.INVALID_ARGUMENT, message };
    case 'Forbidden':
      return { code: grpc.status.PERMISSION_DENIED, message };
    default:
      return { code: grpc.status.INTERNAL, message: 'Internal server error' };
  }
};

const serviceImpl = {
  createOrder: async (call: any, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const { user_id, restaurant_id, items } = call.request;
      const restaurantId = Number(restaurant_id);
      const requestItems = items || [];
      const validationItems = requestItems.map((item: any) => ({
        product_id: Number(item.menu_item_id),
        price: Number(item.price),
        quantity: Number(item.quantity)
      }));

      catalogClient.validateItems(
        { restaurant_id: restaurantId, items: validationItems },
        async (validationErr: any, validationResponse: any) => {
          if (validationErr) {
            const mapped = mapErrorToStatus(new Error('Catalog validation failed'));
            callback(mapped);
            return;
          }

          if (!validationResponse?.valid) {
            callback(null, {
              success: false,
              message: validationResponse?.message || 'Catalog validation failed',
              validation: validationResponse
            });
            return;
          }

          const order = await createOrderEntry(Number(user_id), restaurantId, requestItems || []);
          callback(null, { success: true, message: 'Order created', order });
        }
      );
    } catch (error) {
      const mapped = mapErrorToStatus(error);
      callback(mapped);
    }
  },
  cancelOrder: async (call: any, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const order = await cancelOrderEntry(Number(call.request?.id), Number(call.request?.user_id));
      if (!order) {
        callback(null, { success: false, message: 'Order not found' });
        return;
      }
      callback(null, { success: true, message: 'Order cancelled', order });
    } catch (error) {
      const mapped = mapErrorToStatus(error);
      callback(mapped);
    }
  },
  updateOrderStatus: async (call: any, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const order = await updateOrderStatusEntry(
        Number(call.request?.id),
        String(call.request?.status),
        Number(call.request?.restaurant_id)
      );
      if (!order) {
        callback(null, { success: false, message: 'Order not found' });
        return;
      }
      callback(null, { success: true, message: 'Order updated', order });
    } catch (error) {
      const mapped = mapErrorToStatus(error);
      callback(mapped);
    }
  },
  listOrdersByUser: async (call: any, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const orders = await listOrdersByUserEntry(Number(call.request?.user_id));
      callback(null, { success: true, message: 'OK', orders });
    } catch (error) {
      const mapped = mapErrorToStatus(error);
      callback(mapped);
    }
  },
  listOrdersByRestaurant: async (call: any, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const orders = await listOrdersByRestaurantEntry(Number(call.request?.restaurant_id));
      callback(null, { success: true, message: 'OK', orders });
    } catch (error) {
      const mapped = mapErrorToStatus(error);
      callback(mapped);
    }
  }
};

async function startOrderService() {
  await connectDB();

  const server = new grpc.Server();
  server.addService(orderProto.order.OrderService.service, serviceImpl);

  const PORT = process.env.ORDER_SERVICE_PORT || 50053;
  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error(`Error binding server: ${err}`);
      process.exit(1);
    }
    server.start();
    console.log(`Order Service running on port ${port}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Database: ${config.mysql.database}`);
  });
}

startOrderService().catch(err => {
  console.error('Error starting Order Service:', err);
  process.exit(1);
});
