import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { APP_BASE_HREF, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth } from '../../service/auth/auth';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  loginForm: FormGroup;
  submitted = false;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder, 
    private router: Router,
    private authService: Auth
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit() {
    this.submitted = true;

    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (response) => {
        console.log('Login exitoso:', response);
        this.loading = false;
        // Redirigir a home después de login exitoso
        this.router.navigate(['/home']);
      },
      error: (err) => {
        console.error('Error en login:', err);
        this.loading = false;
        this.error = err.error?.message || 'Error al iniciar sesión. Verifica tus credenciales.';
      }
    });
  }

  resetForm() {
    this.submitted = false;
    this.loginForm.reset();
    this.error = '';
  }
}
