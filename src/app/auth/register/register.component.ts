import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { InstitutionsService } from '../../core/services/institutions.service';
import { Institution } from '../../core/models/academic.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private institutionsService = inject(InstitutionsService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  institution = signal<Institution | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit() {
    this.institutionsService.getPublic().subscribe((institution) => this.institution.set(institution));
  }

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.register(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/student']),
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err?.error?.message ?? 'Não foi possível concluir o cadastro.',
        );
      },
    });
  }
}
