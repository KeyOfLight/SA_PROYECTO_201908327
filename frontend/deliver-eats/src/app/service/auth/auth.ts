import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { User } from '../../interfaces/User';
import { LoginResponse } from '../../interfaces/Login'; 
import { Utils } from '../utils/utils';
import { Backend } from '../../enviroments/enviroment';



@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly TOKEN_KEY = Backend.jwt_token;
  private readonly USER_KEY = Backend.USER_KEY;
  private apiUrl = Backend.backend_route; // Cambia según tu backend
  
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  constructor(private http: HttpClient, private utils: Utils) {
    const storedUser = this.utils.getUserFromStorage();
    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}${Backend.routes.login}`, { email, password })
      .pipe(
        tap(response => {
          if (response.token) {
            this.utils.setToken(response.token);
            this.utils.setUser(response.user);
            this.currentUserSubject.next(response.user);
          }
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
  }
 
  isAuthenticated(): boolean {
    const token = this.utils.getToken();
    if (!token) return false;
    
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;
      return Date.now() < exp;
    } catch (error) {
      return false;
    }
  }
}
