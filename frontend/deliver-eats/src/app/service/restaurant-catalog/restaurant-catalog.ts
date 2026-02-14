import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Backend } from '../../enviroments/enviroment';
import {
  CatalogItemInput,
  MenuItem,
  MenuItemResponse,
  MenuItemsResponse,
  Restaurant,
  RestaurantResponse,
  RestaurantsResponse,
  ValidateItemsResponse
} from '../../interfaces/RestaurantCatalog';

@Injectable({
  providedIn: 'root',
})
export class RestaurantCatalogService {
  private apiUrl = Backend.backend_route;

  constructor(private http: HttpClient) {}

  validateItems(restaurantId: number, items: CatalogItemInput[]): Observable<ValidateItemsResponse> {
    return this.http.post<ValidateItemsResponse>(`${this.apiUrl}${Backend.routes.catalogValidate}`, {
      restaurant_id: restaurantId,
      items
    });
  }

  listRestaurants(): Observable<RestaurantsResponse> {
    return this.http.get<RestaurantsResponse>(`${this.apiUrl}${Backend.routes.catalogRestaurants}`);
  }

  createRestaurant(payload: Omit<Restaurant, 'id'>): Observable<RestaurantResponse> {
    return this.http.post<RestaurantResponse>(`${this.apiUrl}${Backend.routes.catalogRestaurants}`, payload);
  }

  updateRestaurant(id: number, payload: Omit<Restaurant, 'id'>): Observable<RestaurantResponse> {
    return this.http.put<RestaurantResponse>(`${this.apiUrl}${Backend.routes.catalogRestaurants}/${id}`, payload);
  }

  deleteRestaurant(id: number): Observable<RestaurantResponse> {
    return this.http.delete<RestaurantResponse>(`${this.apiUrl}${Backend.routes.catalogRestaurants}/${id}`);
  }

  listMenuItemsByRestaurant(restaurantId: number, onlyAvailable: boolean): Observable<MenuItemsResponse> {
    const param = onlyAvailable ? 'true' : 'false';
    return this.http.get<MenuItemsResponse>(
      `${this.apiUrl}${Backend.routes.catalogRestaurants}/${restaurantId}/menu?onlyAvailable=${param}`
    );
  }

  createMenuItem(payload: Omit<MenuItem, 'id'>): Observable<MenuItemResponse> {
    return this.http.post<MenuItemResponse>(`${this.apiUrl}${Backend.routes.catalogMenuItems}`, payload);
  }

  updateMenuItem(id: number, payload: Omit<MenuItem, 'id'>): Observable<MenuItemResponse> {
    return this.http.put<MenuItemResponse>(`${this.apiUrl}${Backend.routes.catalogMenuItems}/${id}`, payload);
  }

  deleteMenuItem(id: number): Observable<MenuItemResponse> {
    return this.http.delete<MenuItemResponse>(`${this.apiUrl}${Backend.routes.catalogMenuItems}/${id}`);
  }
}
