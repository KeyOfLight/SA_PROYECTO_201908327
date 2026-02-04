const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Rutas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);

// Rutas protegidas (requieren autenticación)
router.get('/me', protect, authController.getMe);
router.put('/updateprofile', protect, authController.updateProfile);
router.put('/changepassword', protect, authController.changePassword);

module.exports = router;
