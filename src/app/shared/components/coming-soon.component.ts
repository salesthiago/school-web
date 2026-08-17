import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="coming-soon">
      <h1>{{ title }}</h1>
      <p>Esta tela ainda não foi implementada no frontend. A API REST correspondente já está disponível no backend.</p>
      <a routerLink="/">← Voltar</a>
    </div>
  `,
  styles: [
    `
      .coming-soon {
        max-width: 480px;
        margin: 3rem auto;
        padding: 1.5rem;
        text-align: center;
      }
      h1 {
        font-size: 1.2rem;
      }
      p {
        color: #667;
        font-size: 0.9rem;
      }
      a {
        color: #1565c0;
        text-decoration: none;
      }
    `,
  ],
})
export class ComingSoonComponent {
  @Input() title = 'Em construção';
}
