import { Injectable } from '@angular/core';
import { Institution } from '../models/academic.model';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  apply(institution: Pick<Institution, 'primaryColor' | 'secondaryColor'>) {
    const root = document.documentElement.style;
    root.setProperty('--color-primary', institution.primaryColor);
    root.setProperty('--color-primary-dark', this.darken(institution.primaryColor, 0.15));
    root.setProperty('--color-secondary', institution.secondaryColor);
    root.setProperty('--color-secondary-dark', this.darken(institution.secondaryColor, 0.15));
  }

  private darken(hex: string, amount: number): string {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!match) return hex;
    const [, r, g, b] = match;
    const channel = (value: string) =>
      Math.max(0, Math.round(parseInt(value, 16) * (1 - amount)))
        .toString(16)
        .padStart(2, '0');
    return `#${channel(r)}${channel(g)}${channel(b)}`;
  }
}
