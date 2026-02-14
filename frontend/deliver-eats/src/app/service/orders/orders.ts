import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Backend } from '../../enviroments/enviroment';
import { OrderItemInput, OrderResponse, OrdersResponse } from '../../interfaces/Order';

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private apiUrl = Backend.backend_route;

  constructor(private http: HttpClient) {}

  createOrder(restaurantId: number, items: OrderItemInput[]): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${this.apiUrl}${Backend.routes.orders}`, {
      restaurant_id: restaurantId,
      items
    });
  }

  listMyOrders(): Observable<OrdersResponse> {
    return this.http.get<OrdersResponse>(`${this.apiUrl}${Backend.routes.orders}`);
  }

  cancelOrder(orderId: number): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(`${this.apiUrl}${Backend.routes.orders}/${orderId}/cancel`, {});
  }

  listRestaurantOrders(): Observable<OrdersResponse> {
    return this.http.get<OrdersResponse>(`${this.apiUrl}${Backend.routes.ordersRestaurant}`);
  }

  acceptOrder(orderId: number): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(`${this.apiUrl}${Backend.routes.orders}/${orderId}/accept`, {});
  }

  finishOrder(orderId: number): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(`${this.apiUrl}${Backend.routes.orders}/${orderId}/finish`, {});
  }

  rejectOrder(orderId: number): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(`${this.apiUrl}${Backend.routes.orders}/${orderId}/reject`, {});
  }
}
