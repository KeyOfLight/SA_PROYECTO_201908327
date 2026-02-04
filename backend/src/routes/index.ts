import express, { Router } from "express";
import authRoutes from "./auth.routes";
import utilidades from "./utils.routes";

const router = express.Router();

// Rutas de autenticación
interface IRoute {
    path: string;
    route: Router;
}


const defaultRoutes: IRoute[] = [
    {   path: '/auth',        route: authRoutes    },
    {   path: '/api',        route:  utilidades    }
];

defaultRoutes.forEach(route => {
    router.use(route.path, route.route);
});

export default router;