
import express from 'express'; 
import utilidades from '../modules/utilitities/utils-module';

const router = express.Router();

router
    .route('/health', )
    .get(utilidades.health);

export default router;
