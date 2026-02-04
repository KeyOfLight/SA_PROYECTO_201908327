import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Backend } from '../../enviroments/enviroment';

export interface RegisterResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class Register {
  private apiUrl = Backend.backend_route;

  constructor(private http: HttpClient) {}

  register(email: string, password: string, role: string): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}${Backend.routes.register}`, {
      email,
      password,
      role
    });
  }
} 
 