import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { OrdersService } from '../../service/orders/orders';
import { Order, OrderItemInput } from '../../interfaces/Order';
import { Auth } from '../../service/auth/auth';
import { User } from '../../interfaces/User';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class OrdersPage implements OnInit {
  orderForm: FormGroup;
  orders: Order[] = [];
  loading = false;
  error = '';
  success = '';
  currentUser: User | null = null;
  activeTab: 'create' | 'list' = 'list';

  constructor(
    private fb: FormBuilder,
    private ordersService: OrdersService,
    private authService: Auth
  ) {
    this.orderForm = this.fb.group({
      restaurant_id: ['', [Validators.required, Validators.min(1)]],
      items: this.fb.array([this.createItem()])
    });
  }

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      this.activeTab = this.isClient ? 'create' : 'list';
    });

    this.loadOrders();
  }

  get isClient(): boolean {
    return this.currentUser?.role === 'CLIENTE';
  }

  get isRestaurant(): boolean {
    return this.currentUser?.role === 'RESTAURANTE';
  }

  get items(): FormArray {
    return this.orderForm.get('items') as FormArray;
  }

  setTab(tab: 'create' | 'list'): void {
    this.activeTab = tab;
  }

  createItem(): FormGroup {
    return this.fb.group({
      menu_item_id: ['', [Validators.required, Validators.min(1)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      price: ['', [Validators.required, Validators.min(0)]]
    });
  }

  addItem(): void {
    this.items.push(this.createItem());
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  submitOrder(): void {
    this.error = '';
    this.success = '';

    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      return;
    }

    const restaurantId = Number(this.orderForm.value.restaurant_id);
    const items = this.orderForm.value.items as OrderItemInput[];

    this.loading = true;
    this.ordersService.createOrder(restaurantId, items).subscribe({
      next: (response) => {
        this.loading = false;
        if (!response.success) {
          this.error = response.message || 'No se pudo crear la orden.';
          return;
        }
        this.success = response.message || 'Orden creada.';
        this.orderForm.reset();
        this.items.clear();
        this.items.push(this.createItem());
        this.loadOrders();
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'No se pudo crear la orden.';
      }
    });
  }

  loadOrders(): void {
    if (this.isRestaurant) {
      this.loadRestaurantOrders();
      return;
    }

    this.ordersService.listMyOrders().subscribe({
      next: (response) => {
        this.orders = response.orders || [];
      },
      error: () => {
        this.orders = [];
      }
    });
  }

  loadRestaurantOrders(): void {
    this.ordersService.listRestaurantOrders().subscribe({
      next: (response) => {
        this.orders = response.orders || [];
      },
      error: () => {
        this.orders = [];
      }
    });
  }

  cancelOrder(order: Order): void {
    this.error = '';
    this.success = '';
    this.ordersService.cancelOrder(order.id).subscribe({
      next: (response) => {
        if (!response.success) {
          this.error = response.message || 'No se pudo cancelar la orden.';
          return;
        }
        this.success = response.message || 'Orden cancelada.';
        this.loadOrders();
      },
      error: (err) => {
        this.error = err.error?.message || 'No se pudo cancelar la orden.';
      }
    });
  }

  updateStatus(order: Order, status: 'accept' | 'finish' | 'reject'): void {
    this.error = '';
    this.success = '';

    const request = status === 'accept'
      ? this.ordersService.acceptOrder(order.id)
      : status === 'finish'
        ? this.ordersService.finishOrder(order.id)
        : this.ordersService.rejectOrder(order.id);

    request.subscribe({
      next: (response) => {
        if (!response.success) {
          this.error = response.message || 'No se pudo actualizar la orden.';
          return;
        }
        this.success = response.message || 'Orden actualizada.';
        this.loadOrders();
      },
      error: (err) => {
        this.error = err.error?.message || 'No se pudo actualizar la orden.';
      }
    });
  }

  canCancel(order: Order): boolean {
    return order.status === 'CREADA' || order.status === 'EN_PROCESO';
  }
}
