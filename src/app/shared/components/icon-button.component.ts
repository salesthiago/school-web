import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';

export type IconButtonVariant = 'default' | 'primary' | 'danger';

/**
 * Botão de ação padrão (editar/incluir/excluir/etc.) usado nas listagens.
 * Ícone sempre visível; o texto (`label`) só aparece quando `showLabel` é
 * true — usado para a ação primária ("Novo usuário"), enquanto as ações de
 * linha (editar/excluir) ficam só com o ícone + tooltip, mais compactas.
 */
@Component({
  selector: 'app-icon-button',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <button
      type="button"
      class="icon-action-btn"
      [class.primary]="variant === 'primary'"
      [class.danger]="variant === 'danger'"
      [disabled]="disabled"
      [attr.aria-label]="label"
      [title]="label"
      (click)="pressed.emit()"
    >
      <app-icon [name]="icon" [size]="18" />
      @if (label && showLabel) {
        <span>{{ label }}</span>
      }
    </button>
  `,
  styles: [
    `
      .icon-action-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        border: none;
        background: none;
        color: #6b7280;
        cursor: pointer;
        padding: 0.4rem;
        border-radius: 8px;
        font-size: 0.82rem;
        font-weight: 600;
        line-height: 1;

        &:hover {
          background: #f4f6fb;
          color: #1a1d29;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        &.primary {
          color: #fff;
          background: #6c4bf4;
          padding: 0.6rem 1.1rem;
          border-radius: 10px;

          &:hover {
            background: #5636d8;
          }
        }

        &.danger:hover {
          background: #fdecea;
          color: #c62828;
        }
      }
    `,
  ],
})
export class IconButtonComponent {
  @Input({ required: true }) icon!: string;
  @Input() label = '';
  @Input() showLabel = false;
  @Input() variant: IconButtonVariant = 'default';
  @Input() disabled = false;
  @Output() pressed = new EventEmitter<void>();
}
