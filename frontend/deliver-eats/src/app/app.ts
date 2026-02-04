import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Sidebar } from './components/sidebar/sidebar';
import { Auth } from './service/auth/auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Sidebar, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('deliver-eats');
  private authService = inject(Auth);
  currentUser$ = this.authService.currentUser;
}
