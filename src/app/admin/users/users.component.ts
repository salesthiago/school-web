import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsersService } from '../../core/services/users.service';
import { AuthService } from '../../core/services/auth.service';
import { Role, ROLE_LABELS, ROLE_OPTIONS, User } from '../../core/models/user.model';
import { DashboardShellComponent, ShellNavItem } from '../../shared/components/dashboard-shell.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DashboardShellComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class AdminUsersComponent implements OnInit {
  loading = signal(true);
  users = signal<User[]>([]);
  roleFilter = signal<Role | ''>('');
  searchTerm = signal('');

  formOpen = signal(false);
  editingUser = signal<User | null>(null);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  roleOptions = ROLE_OPTIONS;
  roleLabels = ROLE_LABELS;

  navItems: ShellNavItem[] = [
    { label: 'Dashboard', link: '/admin', exact: true, icon: 'home' },
    { label: 'Usuários', link: '/admin/users', exact: false, icon: 'users' },
    { label: 'Cursos', link: '/admin/courses', exact: false, icon: 'book' },
    { label: 'Professores', link: '/admin/teachers', exact: false, icon: 'graduation-cap' },
    { label: 'Pagamentos', link: '/admin/payments', exact: false, icon: 'credit-card' },
    { label: 'Relatórios', link: '/admin/reports', exact: false, icon: 'bar-chart' },
    { label: 'Identidade visual', link: '/admin/settings', exact: false, icon: 'palette' },
    { label: 'Integração de vídeos', link: '/admin/video-settings', exact: false, icon: 'video' },
  ];

  filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const role = this.roleFilter();
    return this.users().filter((u) => {
      const matchesRole = !role || u.role === role;
      const matchesTerm =
        !term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
      return matchesRole && matchesTerm;
    });
  });

  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    role: ['student' as Role, Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
    active: [true],
  });

  constructor(
    private usersService: UsersService,
    public authService: AuthService,
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading.set(true);
    this.usersService.list().subscribe((users) => {
      this.users.set(users);
      this.loading.set(false);
    });
  }

  openCreate() {
    this.editingUser.set(null);
    this.errorMessage.set(null);
    this.form.reset({ name: '', email: '', phone: '', role: 'student', password: '', active: true });
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
      role: user.role,
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
          role: value.role,
          active: value.active,
        })
      : this.usersService.create({
          name: value.name,
          email: value.email,
          phone: value.phone,
          password: value.password,
          role: value.role,
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

  remove(user: User) {
    const confirmed = window.confirm(`Excluir o usuário "${user.name}"? Esta ação não pode ser desfeita pela tela.`);
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
