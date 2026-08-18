import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AppNotification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  constructor(private http: HttpClient) {}

  mine() {
    return this.http.get<AppNotification[]>(`${environment.apiUrl}/notifications`);
  }

  markRead(id: string) {
    return this.http.patch(`${environment.apiUrl}/notifications/${id}/read`, {});
  }
}
