import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UsersService } from '../../core/services/users.service';
import { BottomNavComponent } from '../components/bottom-nav.component';
import { DashboardShellComponent } from '../components/dashboard-shell.component';
import { ROLE_LABELS } from '../../core/models/user.model';
import { ADMIN_NAV_ITEMS, STUDENT_NAV_ITEMS, TEACHER_NAV_ITEMS } from '../nav-items';

type PreferenceKey = 'emailNotifications' | 'completionNotifications';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, BottomNavComponent, DashboardShellComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);

  saving = signal(false);
  uploadingAvatar = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  editingBio = signal(false);
  bioSaving = signal(false);
  bioDraft = signal('');

  savingPreference = signal<PreferenceKey | null>(null);

  changingPassword = signal(false);
  passwordSaving = signal(false);
  passwordError = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
    birthDate: [''],
    instagram: [''],
    twitter: [''],
  });

  passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
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
        birthDate: user.birthDate ? user.birthDate.substring(0, 10) : '',
        instagram: user.socialLinks?.instagram ?? '',
        twitter: user.socialLinks?.twitter ?? '',
      });
      this.bioDraft.set(user.bio ?? '');
    }
  }

  get isStudent(): boolean {
    return this.authService.currentUser()?.role === 'student';
  }

  get navItems() {
    switch (this.authService.currentUser()?.role) {
      case 'admin':
        return ADMIN_NAV_ITEMS;
      case 'teacher':
        return TEACHER_NAV_ITEMS;
      default:
        return STUDENT_NAV_ITEMS;
    }
  }

  get homeLink(): string {
    switch (this.authService.currentUser()?.role) {
      case 'admin':
        return '/admin';
      case 'teacher':
        return '/teacher';
      default:
        return '/student';
    }
  }

  roleLabel(role: string | undefined): string {
    return role ? ((ROLE_LABELS as Record<string, string>)[role] ?? role) : '';
  }

  initial(name: string | undefined): string {
    return name?.trim()?.charAt(0)?.toUpperCase() ?? '?';
  }

  memberSince(): string {
    const iso = this.authService.currentUser()?.createdAt;
    return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';
  }

  passwordChangedLabel(): string {
    return this.relativeLabel(this.authService.currentUser()?.passwordChangedAt);
  }

  private relativeLabel(iso: string | undefined): string {
    if (!iso) return 'Nunca alterada';
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (days < 1) return 'Hoje';
    if (days === 1) return 'Há 1 dia';
    if (days < 30) return `Há ${days} dias`;
    const months = Math.floor(days / 30);
    if (months < 12) return months === 1 ? 'Há 1 mês' : `Há ${months} meses`;
    const years = Math.floor(months / 12);
    return years === 1 ? 'Há 1 ano' : `Há ${years} anos`;
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

    const { name, phone, birthDate, instagram, twitter } = this.form.getRawValue();
    this.usersService
      .updateProfile({ name, phone, instagram, twitter, ...(birthDate ? { birthDate } : {}) })
      .subscribe({
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

  startEditBio() {
    this.bioDraft.set(this.authService.currentUser()?.bio ?? '');
    this.editingBio.set(true);
  }

  cancelEditBio() {
    this.editingBio.set(false);
  }

  saveBio() {
    this.bioSaving.set(true);
    this.usersService.updateProfile({ bio: this.bioDraft() }).subscribe({
      next: (user) => {
        this.authService.currentUser.set(user);
        this.bioSaving.set(false);
        this.editingBio.set(false);
      },
      error: () => this.bioSaving.set(false),
    });
  }

  togglePreference(key: PreferenceKey, value: boolean) {
    this.savingPreference.set(key);
    this.usersService.updateProfile({ [key]: value }).subscribe({
      next: (user) => {
        this.authService.currentUser.set(user);
        this.savingPreference.set(null);
      },
      error: () => this.savingPreference.set(null),
    });
  }

  openPasswordForm() {
    this.passwordForm.reset();
    this.passwordError.set(null);
    this.changingPassword.set(true);
  }

  closePasswordForm() {
    this.changingPassword.set(false);
  }

  submitPassword() {
    if (this.passwordForm.invalid) return;
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.passwordError.set('As senhas não coincidem.');
      return;
    }
    this.passwordSaving.set(true);
    this.passwordError.set(null);
    this.usersService.changePassword({ currentPassword, newPassword }).subscribe({
      next: (user) => {
        this.authService.currentUser.set(user);
        this.passwordSaving.set(false);
        this.changingPassword.set(false);
        this.successMessage.set('Senha alterada com sucesso.');
      },
      error: (err) => {
        this.passwordSaving.set(false);
        this.passwordError.set(err?.error?.message ?? 'Não foi possível alterar a senha.');
      },
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
