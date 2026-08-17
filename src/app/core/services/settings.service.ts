import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BunnySettings, UpdateBunnySettings } from '../models/settings.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  constructor(private http: HttpClient) {}

  getBunnySettings() {
    return this.http.get<BunnySettings>(`${environment.apiUrl}/settings/bunny`);
  }

  updateBunnySettings(payload: UpdateBunnySettings) {
    return this.http.put<BunnySettings>(`${environment.apiUrl}/settings/bunny`, payload);
  }
}
