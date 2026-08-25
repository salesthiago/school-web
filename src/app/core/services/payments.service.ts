import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CheckoutResponse, PaymentMethod } from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  constructor(private http: HttpClient) {}

  checkout(moduleId: string, paymentMethod: PaymentMethod) {
    return this.http.post<CheckoutResponse>(`${environment.apiUrl}/payments/checkout`, {
      moduleId,
      paymentMethod,
    });
  }
}
