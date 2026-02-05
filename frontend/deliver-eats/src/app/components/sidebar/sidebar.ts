import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Auth } from '../../service/auth/auth';
import { User } from '../../interfaces/User';

const usuario_icon: string = 'https://img.icons8.com/?size=100&id=undefined&format=png&color=000000';
const package_icon: string = 'https://img.icons8.com/?size=100&id=11229&format=png&color=000000';
const map_icon: string = 'https://img.icons8.com/?size=100&id=110445&format=png&color=000000';

@Component({
  selector: 'app-sidebar',
  standalone: true,
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
      icon: usuario_icon,
      route: '/admin/users',
      roles: ['ADMINISTRADOR']
    },
    {
      label: 'Pedidos',
      icon: package_icon,
      route: '/orders',
      roles: ['CLIENTE', 'RESTAURANTE', 'REPARTIDOR', 'ADMINISTRADOR']
    },
    {
      label: 'Rutas',
      icon: map_icon,
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
