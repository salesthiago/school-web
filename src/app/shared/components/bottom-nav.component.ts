import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="bottom-nav">
      <a routerLink="/student" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Início</a>
      <a routerLink="/student/certificates" routerLinkActive="active">Certificados</a>
      <a routerLink="/student/profile" routerLinkActive="active">Perfil</a>
    </nav>
  `,
  styles: [
    `
      .bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        background: #fff;
        border-top: 1px solid #e6e9f0;
        padding: 0.6rem 0 calc(0.6rem + env(safe-area-inset-bottom));
      }
      a {
        flex: 1;
        text-align: center;
        text-decoration: none;
        color: #889;
        font-size: 0.78rem;
        font-weight: 600;
      }
      a.active {
        color: #1565c0;
      }
    `,
  ],
})
export class BottomNavComponent {}
