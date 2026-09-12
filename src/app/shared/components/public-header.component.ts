import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Cabeçalho das páginas públicas (landing + detalhe de curso) — sem a casca autenticada. */
@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="pub-header">
      <div class="pub-header-inner">
        <a class="brand" routerLink="/">
          @if (logoUrl) {
            <img [src]="logoUrl" [alt]="name" class="brand-logo" />
          } @else {
            <span class="ds-well brand-well">{{ initial() }}</span>
          }
          <span class="brand-name">{{ name }}</span>
        </a>
        <nav class="pub-actions">
          <a class="ds-btn ds-btn-ghost" [routerLink]="['/auth/login']">Entrar</a>
          <a class="ds-btn ds-btn-metal" [routerLink]="['/auth/register']">Criar conta</a>
        </nav>
      </div>
    </header>
  `,
  styles: [
    `
      .pub-header {
        position: sticky;
        top: 0;
        z-index: 10;
        background: var(--ds-bg);
        border-bottom: 1px solid var(--ds-border);
      }

      .pub-header-inner {
        max-width: 1240px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.85rem 20px;
      }

      @media (min-width: 960px) {
        .pub-header-inner {
          padding: 1rem 40px;
        }
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        text-decoration: none;
        color: var(--ds-fg);
        min-width: 0;
      }

      .brand-logo {
        width: 40px;
        height: 40px;
        border-radius: var(--ds-radius-pill);
        object-fit: cover;
        flex-shrink: 0;
      }

      .brand-well {
        width: 40px;
        height: 40px;
        font-weight: 700;
        font-size: 0.9rem;
      }

      .brand-name {
        font-weight: 500;
        font-size: 1.05rem;
        letter-spacing: -0.02em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .pub-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
      }

      .pub-actions .ds-btn {
        padding: 0 1rem;
        height: 2.5rem;
      }

      @media (max-width: 400px) {
        .pub-actions .ds-btn:first-child {
          display: none;
        }
      }
    `,
  ],
})
export class PublicHeaderComponent {
  @Input() name = 'GPschool';
  @Input() logoUrl?: string;

  initial(): string {
    return this.name.trim().charAt(0).toUpperCase() || '?';
  }
}
