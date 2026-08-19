import { Component, Input } from '@angular/core';

/**
 * Nome do ícone do Material Icons (estilo "outlined"), ex.: 'home', 'edit',
 * 'delete', 'add'. Catálogo completo: https://fonts.google.com/icons
 */
export type IconName = string;

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `<span class="material-icons-outlined" [style.font-size.px]="size">{{ name }}</span>`,
  styles: [
    `
      :host {
        display: inline-flex;
        line-height: 0;
      }
    `,
  ],
})
export class IconComponent {
  @Input({ required: true }) name!: IconName;
  @Input() size = 20;
}
