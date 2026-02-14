import express, { Request, Response, Router } from 'express';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { TokenService } from '../modules/auth/auth.token.service';

const router: Router = express.Router();

// Cargar proto auth
const PROTO_PATH = path.join(__dirname, '../proto/auth.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const authProto = grpc.loadPackageDefinition(packageDefinition) as any;

// Cargar proto catalog
const CATALOG_PROTO_PATH = path.join(__dirname, '../proto/restaurant-catalog.proto');
const catalogPackageDefinition = protoLoader.loadSync(CATALOG_PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const catalogProto = grpc.loadPackageDefinition(catalogPackageDefinition) as any;

// Cargar proto order
const ORDER_PROTO_PATH = path.join(__dirname, '../proto/order.proto');
const orderPackageDefinition = protoLoader.loadSync(ORDER_PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const orderProto = grpc.loadPackageDefinition(orderPackageDefinition) as any;

// Crear cliente gRPC
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'localhost:50051';
const authClient = new authProto.auth.AuthService(
  AUTH_SERVICE_URL,
  grpc.credentials.createInsecure()
);

const CATALOG_SERVICE_URL = process.env.RESTAURANT_CATALOG_URL || 'localhost:50052';
const catalogClient = new catalogProto.restaurant_catalog.RestaurantCatalogService(
  CATALOG_SERVICE_URL,
  grpc.credentials.createInsecure()
);

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'localhost:50053';
const orderClient = new orderProto.order.OrderService(
  ORDER_SERVICE_URL,
  grpc.credentials.createInsecure()
);

// Middleware de autenticación
interface AuthenticatedRequest extends Request {
  user?: { id: number; role?: string };
}

const tokenService = new TokenService();

const authMiddleware = (req: AuthenticatedRequest, res: Response, next: Function): void => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'No autorizado'
    });
    return;
  }

  try {
    const decoded = tokenService.verify(token);
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

const requireRoles = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: Function): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'No autorizado'
      });
      return;
    }

    if (req.user.role && roles.includes(req.user.role)) {
      next();
      return;
    }

    authClient.getMe({ user_id: req.user.id }, (err: any, response: any) => {
      if (err || !response?.user?.role) {
        res.status(401).json({
          success: false,
          message: err?.message || 'No autorizado'
        });
        return;
      }

      const role = response.user.role as string;
      req.user = { id: req.user!.id, role };

      if (!roles.includes(role)) {
        res.status(403).json({
          success: false,
          message: 'No autorizado'
        });
        return;
      }

      next();
    });
  };
};

const resolveRestaurantId = (userId: number, callback: (err: Error | null, id?: number) => void) => {
  catalogClient.listRestaurants({ id: 0 }, (err: any, response: any) => {
    if (err) {
      callback(new Error(err.message || 'Error listando restaurantes'));
      return;
    }

    const restaurants = response?.restaurants || [];
    const found = restaurants.find((restaurant: any) => Number(restaurant.owner_id) === Number(userId));

    if (!found) {
      callback(new Error('Restaurante no encontrado'));
      return;
    }

    callback(null, Number(found.id));
  });
};

// ==================== RUTAS PÚBLICAS ====================

// Login
router.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  authClient.login({ email, password }, (err: any, response: any) => {
    if (err) {
      console.error('gRPC error:', err);
      res.status(err.code === 16 ? 401 : 500).json({
        success: false,
        message: err.message || 'Error en login'
      });
      return;
    }

    res.status(200).json(response);
  });
});

// Register
router.post('/auth/register', (req: Request, res: Response) => {
  const { email, password, role } = req.body;

  authClient.register({ email, password, role: role || 'CLIENTE' }, (err: any, response: any) => {
    if (err) {
      console.error('gRPC error:', err);
      res.status(err.code === 6 ? 400 : 500).json({
        success: false,
        message: err.message || 'Error en registro'
      });
      return;
    }

    res.status(201).json(response);
  });
});

// ==================== RUTAS PROTEGIDAS ====================

// Get Me
router.get('/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'No autorizado'
    });
    return;
  }

  authClient.getMe({ user_id: req.user.id }, (err: any, response: any) => {
    if (err) {
      console.error('gRPC error:', err);
      res.status(err.code === 5 ? 404 : 500).json({
        success: false,
        message: err.message || 'Error obteniendo usuario'
      });
      return;
    }

    res.status(200).json(response);
  });
});

// Update Profile
router.put('/auth/updateprofile', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'No autorizado'
    });
    return;
  }

  const { email, role } = req.body;

  authClient.updateProfile({ user_id: req.user.id, email, role }, (err: any, response: any) => {
    if (err) {
      console.error('gRPC error:', err);
      res.status(err.code === 5 ? 404 : 500).json({
        success: false,
        message: err.message || 'Error actualizando perfil'
      });
      return;
    }

    res.status(200).json(response);
  });
});

// Change Password
router.put('/auth/changepassword', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'No autorizado'
    });
    return;
  }

  const { currentPassword, newPassword } = req.body;

  authClient.changePassword(
    { user_id: req.user.id, current_password: currentPassword, new_password: newPassword },
    (err: any, response: any) => {
      if (err) {
        console.error('gRPC error:', err);
        res.status(err.code === 16 ? 401 : 500).json({
          success: false,
          message: err.message || 'Error cambiando contraseña'
        });
        return;
      }

      res.status(200).json(response);
    }
  );
});

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API Gateway funcionando',
    timestamp: new Date().toISOString()
  });
});

// ==================== CATALOGO ====================

router.get('/catalog/restaurants', authMiddleware, (_req: Request, res: Response) => {
  catalogClient.listRestaurants({ id: 0 }, (err: any, response: any) => {
    if (err) {
      console.error('gRPC error:', err);
      res.status(500).json({ success: false, message: err.message || 'Error listando restaurantes' });
      return;
    }
    res.status(200).json(response);
  });
});

router.post('/catalog/restaurants', authMiddleware, (req: Request, res: Response) => {
  catalogClient.createRestaurant(req.body, (err: any, response: any) => {
    if (err) {
      console.error('gRPC error:', err);
      res.status(400).json({ success: false, message: err.message || 'Error creando restaurante' });
      return;
    }
    res.status(201).json(response);
  });
});

router.get('/catalog/restaurants/:id', authMiddleware, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  catalogClient.getRestaurant({ id }, (err: any, response: any) => {
    if (err) {
      console.error('gRPC error:', err);
      res.status(404).json({ success: false, message: err.message || 'Restaurante no encontrado' });
      return;
    }
    res.status(200).json(response);
  });
});

router.put('/catalog/restaurants/:id', authMiddleware, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  catalogClient.updateRestaurant({ id, ...req.body }, (err: any, response: any) => {
    if (err) {
      console.error('gRPC error:', err);
      res.status(400).json({ success: false, message: err.message || 'Error actualizando restaurante' });
      return;
    }
    res.status(200).json(response);
  });
});

router.delete('/catalog/restaurants/:id', authMiddleware, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  catalogClient.deleteRestaurant({ id }, (err: any, response: any) => {
    if (err) {
      console.error('gRPC error:', err);
      res.status(400).json({ success: false, message: err.message || 'Error eliminando restaurante' });
      return;
    }
    res.status(200).json(response);
  });
});

router.get('/catalog/restaurants/:id/menu', authMiddleware, (req: Request, res: Response) => {
  const restaurantId = Number(req.params.id);
  const onlyAvailable = String(req.query.onlyAvailable).toLowerCase() === 'true';

  catalogClient.listMenuItemsByRestaurant(
    { restaurant_id: restaurantId, only_available: onlyAvailable },
    (err: any, response: any) => {
      if (err) {
        console.error('gRPC error:', err);
        res.status(400).json({ success: false, message: err.message || 'Error listando menu' });
        return;
      }
      res.status(200).json(response);
    }
  );
});

router.post('/catalog/menu-items', authMiddleware, (req: Request, res: Response) => {
  catalogClient.createMenuItem(req.body, (err: any, response: any) => {
    if (err) {
      console.error('gRPC error:', err);
      res.status(400).json({ success: false, message: err.message || 'Error creando item' });
      return;
    }
    res.status(201).json(response);
  });
});

router.put('/catalog/menu-items/:id', authMiddleware, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  catalogClient.updateMenuItem({ id, ...req.body }, (err: any, response: any) => {
    if (err) {
      console.error('gRPC error:', err);
      res.status(400).json({ success: false, message: err.message || 'Error actualizando item' });
      return;
    }
    res.status(200).json(response);
  });
});

router.delete('/catalog/menu-items/:id', authMiddleware, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  catalogClient.deleteMenuItem({ id }, (err: any, response: any) => {
    if (err) {
      console.error('gRPC error:', err);
      res.status(400).json({ success: false, message: err.message || 'Error eliminando item' });
      return;
    }
    res.status(200).json(response);
  });
});

router.post('/catalog/validate-items', authMiddleware, (req: Request, res: Response) => {
  catalogClient.validateItems(req.body, (err: any, response: any) => {
    if (err) {
      console.error('gRPC error:', err);
      res.status(400).json({ success: false, message: err.message || 'Error validando items' });
      return;
    }
    res.status(200).json(response);
  });
});

// ==================== ORDENES ====================

router.post('/orders', authMiddleware, requireRoles(['CLIENTE']), (req: AuthenticatedRequest, res: Response) => {
  const { restaurant_id, items } = req.body;
  orderClient.createOrder(
    { user_id: req.user?.id || 0, restaurant_id: Number(restaurant_id), items: items || [] },
    (err: any, response: any) => {
      if (err) {
        console.error('gRPC error:', err);
        res.status(400).json({ success: false, message: err.message || 'Error creando orden' });
        return;
      }
      if (!response?.success) {
        res.status(400).json(response);
        return;
      }
      res.status(201).json(response);
    }
  );
});

router.get('/orders', authMiddleware, requireRoles(['CLIENTE']), (req: AuthenticatedRequest, res: Response) => {
  orderClient.listOrdersByUser({ user_id: req.user?.id || 0 }, (err: any, response: any) => {
    if (err) {
      console.error('gRPC error:', err);
      res.status(400).json({ success: false, message: err.message || 'Error listando ordenes' });
      return;
    }
    res.status(200).json(response);
  });
});

router.put('/orders/:id/cancel', authMiddleware, requireRoles(['CLIENTE']), (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id);
  orderClient.cancelOrder({ id, user_id: req.user?.id || 0 }, (err: any, response: any) => {
    if (err) {
      console.error('gRPC error:', err);
      res.status(400).json({ success: false, message: err.message || 'Error cancelando orden' });
      return;
    }
    res.status(200).json(response);
  });
});

router.get('/orders/restaurant', authMiddleware, requireRoles(['RESTAURANTE']), (req: AuthenticatedRequest, res: Response) => {
  resolveRestaurantId(req.user?.id || 0, (resolveErr, restaurantId) => {
    if (resolveErr || !restaurantId) {
      res.status(404).json({ success: false, message: resolveErr?.message || 'Restaurante no encontrado' });
      return;
    }

    orderClient.listOrdersByRestaurant({ restaurant_id: restaurantId }, (err: any, response: any) => {
      if (err) {
        console.error('gRPC error:', err);
        res.status(400).json({ success: false, message: err.message || 'Error listando ordenes' });
        return;
      }
      res.status(200).json(response);
    });
  });
});

router.put('/orders/:id/accept', authMiddleware, requireRoles(['RESTAURANTE']), (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id);
  resolveRestaurantId(req.user?.id || 0, (resolveErr, restaurantId) => {
    if (resolveErr || !restaurantId) {
      res.status(404).json({ success: false, message: resolveErr?.message || 'Restaurante no encontrado' });
      return;
    }

    orderClient.updateOrderStatus({ id, status: 'EN_PROCESO', restaurant_id: restaurantId }, (err: any, response: any) => {
      if (err) {
        console.error('gRPC error:', err);
        res.status(400).json({ success: false, message: err.message || 'Error actualizando orden' });
        return;
      }
      res.status(200).json(response);
    });
  });
});

router.put('/orders/:id/finish', authMiddleware, requireRoles(['RESTAURANTE']), (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id);
  resolveRestaurantId(req.user?.id || 0, (resolveErr, restaurantId) => {
    if (resolveErr || !restaurantId) {
      res.status(404).json({ success: false, message: resolveErr?.message || 'Restaurante no encontrado' });
      return;
    }

    orderClient.updateOrderStatus({ id, status: 'FINALIZADA', restaurant_id: restaurantId }, (err: any, response: any) => {
      if (err) {
        console.error('gRPC error:', err);
        res.status(400).json({ success: false, message: err.message || 'Error actualizando orden' });
        return;
      }
      res.status(200).json(response);
    });
  });
});

router.put('/orders/:id/reject', authMiddleware, requireRoles(['RESTAURANTE']), (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id);
  resolveRestaurantId(req.user?.id || 0, (resolveErr, restaurantId) => {
    if (resolveErr || !restaurantId) {
      res.status(404).json({ success: false, message: resolveErr?.message || 'Restaurante no encontrado' });
      return;
    }

    orderClient.updateOrderStatus({ id, status: 'RECHAZADA', restaurant_id: restaurantId }, (err: any, response: any) => {
      if (err) {
        console.error('gRPC error:', err);
        res.status(400).json({ success: false, message: err.message || 'Error actualizando orden' });
        return;
      }
      res.status(200).json(response);
    });
  });
});

export default router;
