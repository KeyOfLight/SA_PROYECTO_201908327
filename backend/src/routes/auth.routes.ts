import express, { Router } from 'express';
import * as authController from '../modules/auth/auth.controller';
import { protect } from '../middleware/auth';

const router: Router = express.Router();

// Rutas públicas
router
    .route('/register')
    .post(authController.register);
router
    .route('/login')
    .post(authController.login);

 
// Rutas protegidas (requieren autenticación)
router
    .route('/me')
    .get(protect, authController.getMe);

router
    .route('/updateprofile')
    .put(protect, authController.updateProfile);
router
    .route('/changepassword')
    .put(protect, authController.changePassword);
 
export default router;
