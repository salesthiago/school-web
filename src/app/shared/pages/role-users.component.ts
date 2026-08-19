import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsersService } from '../../core/services/users.service';
import { AuthService } from '../../core/services/auth.service';
import { Role, ROLE_LABELS, User } from '../../core/models/user.model';
import { DashboardShellComponent } from '../components/dashboard-shell.component';
import { IconButtonComponent } from '../components/icon-button.component';
import { ADMIN_NAV_ITEMS, TEACHER_NAV_ITEMS } from '../nav-items';

/**
 * Listagem/CRUD genérica de usuários filtrada por papel — usada nas três
 * telas de admin (Alunos/Professores/Administradores) e, em modo somente
 * leitura, na tela "Alunos matriculados" do professor. O papel é fixo por
 * tela (vem da rota via `data`), então o formulário não expõe seletor de
 * perfil: cada tela só cria/edita usuários do seu próprio papel.
 */
@Component({
  selector: 'app-role-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DashboardShellComponent, IconButtonComponent],
  templateUrl: './role-users.component.html',
  styleUrl: './role-users.component.scss',
})
export class RoleUsersComponent implements OnInit {
  @Input({ required: true }) role!: Role;
  @Input() title = '';
  @Input() readOnly = false;

  loading = signal(true);
  users = signal<User[]>([]);
  searchTerm = signal('');
  onlyWithoutEnrollments = signal(false);

  formOpen = signal(false);
  editingUser = signal<User | null>(null);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  passwordUser = signal<User | null>(null);
  savingPassword = signal(false);
  passwordError = signal<string | null>(null);

  filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const onlyWithout = this.onlyWithoutEnrollments();
    return this.users().filter((u) => {
      const matchesTerm =
        !term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
      const matchesEnrollment = !onlyWithout || u.hasEnrollments === false;
      return matchesTerm && matchesEnrollment;
    });
  });

  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
    active: [true],
  });

  passwordForm = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor(
    private usersService: UsersService,
    public authService: AuthService,
  ) {}

  get navItems() {
    return this.authService.currentUser()?.role === 'teacher' ? TEACHER_NAV_ITEMS : ADMIN_NAV_ITEMS;
  }

  get roleLabel(): string {
    return ROLE_LABELS[this.role];
  }

  get isStudentScreen(): boolean {
    return this.role === 'student';
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading.set(true);
    this.usersService.list(this.role).subscribe((users) => {
      this.users.set(users);
      this.loading.set(false);
    });
  }

  openCreate() {
    this.editingUser.set(null);
    this.errorMessage.set(null);
    this.form.reset({ name: '', email: '', phone: '', password: '', active: true });
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(8)]);
    this.form.controls.password.updateValueAndValidity();
    this.formOpen.set(true);
  }

  openEdit(user: User) {
    this.editingUser.set(user);
    this.errorMessage.set(null);
    this.form.reset({
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      password: '',
      active: user.active ?? true,
    });
    this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();
    this.formOpen.set(true);
  }

  closeForm() {
    this.formOpen.set(false);
    this.editingUser.set(null);
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.errorMessage.set(null);
    const value = this.form.getRawValue();
    const editing = this.editingUser();

    const request = editing
      ? this.usersService.update(editing.id, {
          name: value.name,
          email: value.email,
          phone: value.phone,
          active: value.active,
        })
      : this.usersService.create({
          name: value.name,
          email: value.email,
          phone: value.phone,
          password: value.password,
          role: this.role,
        });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.loadUsers();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Não foi possível salvar o usuário.');
      },
    });
  }

  openPasswordChange(user: User) {
    this.passwordUser.set(user);
    this.passwordError.set(null);
    this.passwordForm.reset({ password: '' });
  }

  closePasswordForm() {
    this.passwordUser.set(null);
  }

  submitPassword() {
    if (this.passwordForm.invalid) return;
    const user = this.passwordUser();
    if (!user) return;

    this.savingPassword.set(true);
    this.passwordError.set(null);
    this.usersService.resetPassword(user.id, this.passwordForm.getRawValue().password).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.closePasswordForm();
      },
      error: (err) => {
        this.savingPassword.set(false);
        this.passwordError.set(err?.error?.message ?? 'Não foi possível alterar a senha.');
      },
    });
  }

  remove(user: User) {
    const confirmed = window.confirm(
      `Excluir ${this.roleLabel.toLowerCase()} "${user.name}"? Esta ação não pode ser desfeita pela tela.`,
    );
    if (!confirmed) return;

    this.usersService.remove(user.id).subscribe({
      next: () => this.loadUsers(),
      error: (err) => {
        window.alert(err?.error?.message ?? 'Não foi possível excluir o usuário.');
      },
    });
  }

  isSelf(user: User): boolean {
    return this.authService.currentUser()?.id === user.id;
  }
}
