import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UsersService } from '../../core/services/users.service';
import { BottomNavComponent } from '../../shared/components/bottom-nav.component';
import { DashboardShellComponent } from '../../shared/components/dashboard-shell.component';
import { STUDENT_NAV_ITEMS } from '../../shared/nav-items';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, BottomNavComponent, DashboardShellComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  navItems = STUDENT_NAV_ITEMS;
  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);

  saving = signal(false);
  uploadingAvatar = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
    instagram: [''],
    twitter: [''],
  });

  constructor(
    public authService: AuthService,
    private router: Router,
  ) {
    const user = this.authService.currentUser();
    if (user) {
      this.form.patchValue({
        name: user.name,
        phone: user.phone ?? '',
        instagram: user.socialLinks?.instagram ?? '',
        twitter: user.socialLinks?.twitter ?? '',
      });
    }
  }

  onAvatarSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.uploadingAvatar.set(true);
    this.errorMessage.set(null);
    this.usersService.uploadAvatar(file).subscribe({
      next: (user) => {
        this.authService.currentUser.set(user);
        this.uploadingAvatar.set(false);
      },
      error: (err) => {
        this.uploadingAvatar.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Não foi possível enviar a foto.');
      },
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.usersService.updateProfile(this.form.getRawValue()).subscribe({
      next: (user) => {
        this.authService.currentUser.set(user);
        this.saving.set(false);
        this.successMessage.set('Perfil atualizado com sucesso.');
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Não foi possível salvar o perfil.');
      },
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
