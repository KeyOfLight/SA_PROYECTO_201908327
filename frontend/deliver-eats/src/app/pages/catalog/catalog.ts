import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { RestaurantCatalogService } from '../../service/restaurant-catalog/restaurant-catalog';
import {
  CatalogItemInput,
  MenuItem,
  Restaurant,
  ValidateItemsResponse
} from '../../interfaces/RestaurantCatalog';
import { Auth } from '../../service/auth/auth';
import { User } from '../../interfaces/User';
import { OrdersService } from '../../service/orders/orders';
import { OrderItemInput } from '../../interfaces/Order';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
})
export class CatalogPage implements OnInit {
  validateForm: FormGroup;
  restaurantForm: FormGroup;
  menuItemForm: FormGroup;
  loading = false;
  loadingRestaurants = false;
  restaurantError = '';
  error = '';
  success = '';
  response: ValidateItemsResponse | null = null;
  restaurants: Restaurant[] = [];
  menuItems: MenuItem[] = [];
  cartItems: Array<{ item: MenuItem; quantity: number }> = [];
  selectedRestaurantId: number | null = null;
  editingRestaurant: Restaurant | null = null;
  editingMenuItem: MenuItem | null = null;
  currentUser: User | null = null;
  activeTab: 'restaurants' | 'menu' | 'validate' = 'restaurants';

  constructor(
    private fb: FormBuilder,
    private catalogService: RestaurantCatalogService,
    private authService: Auth,
    private ordersService: OrdersService
  ) {
    this.validateForm = this.fb.group({
      restaurantId: ['', [Validators.required, Validators.min(1)]],
      items: this.fb.array([this.createValidateItem()])
    });

    this.restaurantForm = this.fb.group({
      name: ['', [Validators.required]],
      address: ['', [Validators.required]],
      cuisine_type: ['General', [Validators.required]],
      opening_hours: ['09:00-21:00', [Validators.required]],
      contact_phone: ['N/A', [Validators.required]],
      rating: [0, [Validators.min(0), Validators.max(5)]],
      owner_id: ['', [Validators.required, Validators.min(1)]]
    });

    this.menuItemForm = this.fb.group({
      restaurant_id: ['', [Validators.required, Validators.min(1)]],
      name: ['', [Validators.required]],
      description: [''],
      price: ['', [Validators.required, Validators.min(0)]],
      available: [true]
    });
  }

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      if (this.isAdmin || this.isClient) {
        this.activeTab = 'restaurants';
      } else {
        this.activeTab = 'menu';
      }
      this.applyRestaurantContext();
    });
    this.loadRestaurants();
  }

  get validateItems(): FormArray {
    return this.validateForm.get('items') as FormArray;
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === 'ADMINISTRADOR';
  }

  get isRestaurant(): boolean {
    return this.currentUser?.role === 'RESTAURANTE';
  }

  get isClient(): boolean {
    return this.currentUser?.role === 'CLIENTE';
  }

  private createValidateItem(): FormGroup {
    return this.fb.group({
      product_id: ['', [Validators.required, Validators.min(1)]],
      price: ['', [Validators.required, Validators.min(0)]]
    });
  }

  addValidateItem(): void {
    this.validateItems.push(this.createValidateItem());
  }

  removeValidateItem(index: number): void {
    if (this.validateItems.length > 1) {
      this.validateItems.removeAt(index);
    }
  }

  setTab(tab: 'restaurants' | 'menu' | 'validate'): void {
    this.activeTab = tab;
    if (tab === 'restaurants') {
      this.loadRestaurants();
    }
    if (tab === 'menu' && this.isRestaurant && this.selectedRestaurantId) {
      this.loadMenuItems(this.selectedRestaurantId, this.isClient);
    }
  }

  submitValidation(): void {
    this.error = '';
    this.response = null;

    if (this.validateForm.invalid) {
      this.validateForm.markAllAsTouched();
      return;
    }

    const restaurantId = Number(this.validateForm.value.restaurantId);
    const items = this.validateForm.value.items as CatalogItemInput[];

    this.loading = true;
    this.catalogService.validateItems(restaurantId, items).subscribe({
      next: (response) => {
        this.response = response;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'No se pudo validar el catalogo.';
        this.loading = false;
      }
    });
  }

  loadRestaurants(): void {
    this.restaurantError = '';
    this.loadingRestaurants = true;
    this.catalogService.listRestaurants().subscribe({
      next: (response) => {
        if (!response.success) {
          this.restaurantError = response.message || 'No se pudo obtener el listado de restaurantes.';
          this.restaurants = [];
        } else {
          this.restaurants = response.restaurants || [];
          this.applyRestaurantContext();
        }
        this.loadingRestaurants = false;
      },
      error: (err) => {
        this.restaurants = [];
        this.restaurantError = err.error?.message || 'No se pudo obtener el listado de restaurantes.';
        this.loadingRestaurants = false;
      }
    });
  }

  selectRestaurant(restaurantId: number): void {
    if (this.selectedRestaurantId && this.selectedRestaurantId !== restaurantId) {
      this.clearCart();
    }
    this.selectedRestaurantId = restaurantId;
    this.menuItemForm.patchValue({ restaurant_id: restaurantId });
    if (this.isClient) {
      this.activeTab = 'menu';
    }
    this.loadMenuItems(restaurantId, this.isClient);
  }

  get selectedRestaurantName(): string {
    if (!this.selectedRestaurantId) {
      return '';
    }
    return this.restaurants.find(r => r.id === this.selectedRestaurantId)?.name || '';
  }

  loadMenuItems(restaurantId: number, onlyAvailable: boolean): void {
    this.catalogService.listMenuItemsByRestaurant(restaurantId, onlyAvailable).subscribe({
      next: (response) => {
        this.menuItems = response.items || [];
      },
      error: () => {
        this.menuItems = [];
      }
    });
  }

  submitRestaurant(): void {
    this.error = '';
    this.success = '';

    if (this.isRestaurant) {
      if (!this.currentUser?.id) {
        this.error = 'No se pudo determinar el propietario del restaurante.';
        return;
      }
      this.restaurantForm.patchValue({ owner_id: Number(this.currentUser.id) });
    }

    if (this.restaurantForm.invalid) {
      this.restaurantForm.markAllAsTouched();
      return;
    }

    const payload = this.restaurantForm.value as Omit<Restaurant, 'id'>;

    const request = this.editingRestaurant
      ? this.catalogService.updateRestaurant(this.editingRestaurant.id, payload)
      : this.catalogService.createRestaurant(payload);

    request.subscribe({
      next: (response) => {
        if (!response.success) {
          this.error = response.message || 'No se pudo guardar el restaurante.';
          return;
        }
        this.success = response.message || 'Restaurante guardado.';
        this.editingRestaurant = null;
        this.restaurantForm.reset({
          cuisine_type: 'General',
          opening_hours: '09:00-21:00',
          contact_phone: 'N/A',
          rating: 0
        });
        this.loadRestaurants();
      },
      error: (err) => {
        this.error = err.error?.message || 'No se pudo guardar el restaurante.';
      }
    });
  }

  editRestaurant(restaurant: Restaurant): void {
    this.editingRestaurant = restaurant;
    this.restaurantForm.patchValue(restaurant);
    this.setTab('restaurants');
  }

  deleteRestaurant(restaurant: Restaurant): void {
    this.error = '';
    this.success = '';
    this.catalogService.deleteRestaurant(restaurant.id).subscribe({
      next: (response) => {
        if (!response.success) {
          this.error = response.message || 'No se pudo eliminar el restaurante.';
          return;
        }
        this.success = response.message || 'Restaurante eliminado.';
        this.loadRestaurants();
      },
      error: (err) => {
        this.error = err.error?.message || 'No se pudo eliminar el restaurante.';
      }
    });
  }

  submitMenuItem(): void {
    this.error = '';
    this.success = '';

    if (this.isRestaurant) {
      if (!this.selectedRestaurantId) {
        this.error = 'No se encontro un restaurante asociado a tu usuario.';
        return;
      }
      this.menuItemForm.patchValue({ restaurant_id: this.selectedRestaurantId });
    }

    if (this.menuItemForm.invalid) {
      this.menuItemForm.markAllAsTouched();
      return;
    }

    const payload = this.menuItemForm.value as Omit<MenuItem, 'id'>;
    const effectiveRestaurantId = this.isRestaurant
      ? this.selectedRestaurantId
      : payload.restaurant_id;

    if (!effectiveRestaurantId) {
      this.error = 'No se pudo determinar el restaurante para el item.';
      return;
    }

    payload.restaurant_id = effectiveRestaurantId;
    const request = this.editingMenuItem
      ? this.catalogService.updateMenuItem(this.editingMenuItem.id, payload)
      : this.catalogService.createMenuItem(payload);

    request.subscribe({
      next: (response) => {
        if (!response.success) {
          this.error = response.message || 'No se pudo guardar el item.';
          return;
        }
        this.success = response.message || 'Item guardado.';
        this.editingMenuItem = null;
        this.menuItemForm.reset({ available: true, restaurant_id: effectiveRestaurantId });
        this.loadMenuItems(effectiveRestaurantId, this.isClient);
      },
      error: (err) => {
        this.error = err.error?.message || 'No se pudo guardar el item.';
      }
    });
  }

  editMenuItem(item: MenuItem): void {
    this.editingMenuItem = item;
    this.menuItemForm.patchValue(item);
    this.selectedRestaurantId = item.restaurant_id;
    this.setTab('menu');
  }

  deleteMenuItem(item: MenuItem): void {
    this.error = '';
    this.success = '';
    this.catalogService.deleteMenuItem(item.id).subscribe({
      next: (response) => {
        if (!response.success) {
          this.error = response.message || 'No se pudo eliminar el item.';
          return;
        }
        this.success = response.message || 'Item eliminado.';
        if (this.selectedRestaurantId) {
          this.loadMenuItems(this.selectedRestaurantId, this.isClient);
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'No se pudo eliminar el item.';
      }
    });
  }

  addToCart(item: MenuItem): void {
    const existing = this.cartItems.find(entry => entry.item.id === item.id);
    if (existing) {
      existing.quantity += 1;
      return;
    }
    this.cartItems.push({ item, quantity: 1 });
  }

  removeFromCart(itemId: number): void {
    this.cartItems = this.cartItems.filter(entry => entry.item.id !== itemId);
  }

  updateCartQuantity(itemId: number, quantity: number): void {
    const target = this.cartItems.find(entry => entry.item.id === itemId);
    if (!target) {
      return;
    }
    if (quantity <= 0) {
      this.removeFromCart(itemId);
      return;
    }
    target.quantity = quantity;
  }

  get cartTotal(): number {
    return this.cartItems.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0);
  }

  submitOrderFromCatalog(): void {
    this.error = '';
    this.success = '';

    if (!this.selectedRestaurantId) {
      this.error = 'Selecciona un restaurante antes de enviar la orden.';
      return;
    }

    if (this.cartItems.length === 0) {
      this.error = 'Agrega al menos un item al carrito.';
      return;
    }

    const items: OrderItemInput[] = this.cartItems.map(entry => ({
      menu_item_id: entry.item.id,
      quantity: entry.quantity,
      price: entry.item.price
    }));

    this.loading = true;
    this.ordersService.createOrder(this.selectedRestaurantId, items).subscribe({
      next: (response) => {
        this.loading = false;
        if (!response.success) {
          this.error = response.message || 'No se pudo enviar la orden.';
          return;
        }
        this.success = response.message || 'Orden enviada.';
        this.clearCart();
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'No se pudo enviar la orden.';
      }
    });
  }

  private clearCart(): void {
    this.cartItems = [];
  }

  private applyRestaurantContext(): void {
    if (!this.isRestaurant || !this.currentUser) {
      return;
    }

    const ownerId = Number(this.currentUser.id);
    const ownedRestaurant = this.restaurants.find(r => Number(r.owner_id) === ownerId);

    if (!ownedRestaurant) {
      this.error = 'No se encontro un restaurante asociado a tu usuario.';
      return;
    }

    this.selectedRestaurantId = ownedRestaurant.id;
    this.menuItemForm.patchValue({ restaurant_id: ownedRestaurant.id });

    if (this.activeTab === 'menu') {
      this.loadMenuItems(ownedRestaurant.id, this.isClient);
    }
  }
}
