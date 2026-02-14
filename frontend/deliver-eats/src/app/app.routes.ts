import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { Home } from './pages/home/home';
import { CatalogPage } from './pages/catalog/catalog';
import { OrdersPage } from './pages/orders/orders';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'register', component: RegisterComponent },
  { path: 'catalog', component: CatalogPage, canActivate: [authGuard] },
  { path: 'orders', component: OrdersPage, canActivate: [authGuard] },
  { path: 'home', component: Home, canActivate: [authGuard] },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },
];
