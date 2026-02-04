import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '../../service/auth/auth';
import { User } from '../../interfaces/User';

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  currentUser: User | null = null;

  constructor(private authService: Auth) {}

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }

  getRoleLabel(): string {
    const roleMap: { [key: string]: string } = {
      'CLIENTE': 'Cliente',
      'RESTAURANTE': 'Restaurante',
      'REPARTIDOR': 'Repartidor',
      'ADMINISTRADOR': 'Administrador'
    };
    return this.currentUser?.role ? roleMap[this.currentUser.role] || this.currentUser.role : 'Usuario';
  }

  getRoleColor(): string {
    const colorMap: { [key: string]: string } = {
      'CLIENTE': 'bg-blue-500',
      'RESTAURANTE': 'bg-green-500',
      'REPARTIDOR': 'bg-orange-500',
      'ADMINISTRADOR': 'bg-red-500'
    };
    return this.currentUser?.role ? colorMap[this.currentUser.role] || 'bg-gray-500' : 'bg-gray-500';
  }
}
