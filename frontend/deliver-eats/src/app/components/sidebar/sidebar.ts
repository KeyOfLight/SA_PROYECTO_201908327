import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Auth } from '../../service/auth/auth';
import { User } from '../../interfaces/User';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit {
  currentUser: User | null = null;
  isSidebarOpen = true;
  menuItems = [
    {
      label: 'Usuarios',
      icon: '👥',
      route: '/admin/users',
      roles: ['ADMINISTRADOR']
    },
    {
      label: 'Pedidos',
      icon: '📦',
      route: '/orders',
      roles: ['CLIENTE', 'RESTAURANTE', 'REPARTIDOR', 'ADMINISTRADOR']
    },
    {
      label: 'Rutas',
      icon: '🗺️',
      route: '/routes',
      roles: ['REPARTIDOR', 'ADMINISTRADOR']
    }
  ];

  constructor(private authService: Auth) {}

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  getVisibleMenuItems() {
    if (!this.currentUser) return [];
    return this.menuItems.filter(item =>
      item.roles.includes(this.currentUser!.role || '')
    );
  }

  logout(): void {
    this.authService.logout();
  }
}
