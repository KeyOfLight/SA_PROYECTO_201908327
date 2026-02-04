const jwt = require('jsonwebtoken');
const User = require('../models/User');
 
exports.protect = async (req, res, next) => {
  let token;

  // Verificar si el token existe en el header Authorization
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
        
      token = req.headers.authorization.split(' ')[1];

      // Verificar token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'deliver-eats-secret-key-2026'
      );

      // Obtener usuario del token 
      req.user = await User.findById(decoded.id);

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      next();
    } catch (error) {
      console.error('Error de autenticación:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token inválido'
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'No autorizado para acceder a esta ruta'
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: 'No se proporcionó token de autenticación'
    });
  }
};

// Middleware para autorizar roles específicos
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `El rol '${req.user.role}' no tiene permisos para acceder a esta ruta`
      });
    }
    next();
  };
};
