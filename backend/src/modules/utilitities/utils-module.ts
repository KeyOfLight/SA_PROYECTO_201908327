
import { Response } from 'express';

const utilidades: { health: (res: Response) => Promise<void> } = {

    health: async (res: Response) => {
  
        res.json({
        success: true,
        message: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString()
    });
    }
};

export default utilidades;