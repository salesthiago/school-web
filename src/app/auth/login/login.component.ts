import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { InstitutionsService } from '../../core/services/institutions.service';
import { Institution } from '../../core/models/academic.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private institutionsService = inject(InstitutionsService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  institution = signal<Institution | null>(null);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit() {
    this.institutionsService.getPublic().subscribe((institution) => this.institution.set(institution));
  }

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.form.getRawValue();
    this.authService.login(email, password).subscribe({
      next: () => {
        const role = this.authService.currentUser()?.role;
        this.router.navigate([role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/student']);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('E-mail ou senha inválidos.');
      },
    });
  }
}
