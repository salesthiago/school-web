import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InstitutionsService } from '../../core/services/institutions.service';
import { ThemeService } from '../../core/services/theme.service';
import { Institution } from '../../core/models/academic.model';
import { DashboardShellComponent } from '../../shared/components/dashboard-shell.component';
import { ADMIN_NAV_ITEMS } from '../../shared/nav-items';

type ImageKind = 'logo' | 'loginBackground' | 'registerBackground' | 'studentBanner';

@Component({
  selector: 'app-branding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DashboardShellComponent],
  templateUrl: './branding.component.html',
  styleUrl: './branding.component.scss',
})
export class BrandingComponent implements OnInit {
  private fb = inject(FormBuilder);
  private institutionsService = inject(InstitutionsService);
  private themeService = inject(ThemeService);

  navItems = ADMIN_NAV_ITEMS;

  loading = signal(true);
  saving = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  institution = signal<Institution | null>(null);
  uploading = signal<ImageKind | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    primaryColor: ['#6c4bf4', Validators.required],
    secondaryColor: ['#26a69a', Validators.required],
    address: [''],
    phone: [''],
    email: ['', [Validators.email]],
    website: [''],
  });

  ngOnInit() {
    this.institutionsService.getPublic().subscribe({
      next: (institution) => {
        this.institution.set(institution);
        this.form.patchValue({
          name: institution.name,
          primaryColor: institution.primaryColor,
          secondaryColor: institution.secondaryColor,
          address: institution.address ?? '',
          phone: institution.phone ?? '',
          email: institution.email ?? '',
          website: institution.website ?? '',
        });
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Não foi possível carregar as configurações.');
        this.loading.set(false);
      },
    });
  }

  submit() {
    const institution = this.institution();
    if (this.form.invalid || !institution) return;
    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.institutionsService.update(institution.id, this.form.getRawValue()).subscribe({
      next: (updated) => {
        this.institution.set(updated);
        this.themeService.apply(updated);
        this.saving.set(false);
        this.successMessage.set('Identidade visual salva com sucesso.');
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('Não foi possível salvar as configurações.');
      },
    });
  }

  onFileSelected(kind: ImageKind, event: Event) {
    const institution = this.institution();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!institution || !file) return;

    this.uploading.set(kind);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const upload$ =
      kind === 'logo'
        ? this.institutionsService.uploadLogo(institution.id, file)
        : kind === 'loginBackground'
          ? this.institutionsService.uploadLoginBackground(institution.id, file)
          : kind === 'registerBackground'
            ? this.institutionsService.uploadRegisterBackground(institution.id, file)
            : this.institutionsService.uploadStudentBanner(institution.id, file);

    upload$.subscribe({
      next: (updated) => {
        this.institution.set(updated);
        this.uploading.set(null);
        this.successMessage.set('Imagem enviada com sucesso.');
        input.value = '';
      },
      error: () => {
        this.uploading.set(null);
        this.errorMessage.set('Não foi possível enviar a imagem.');
        input.value = '';
      },
    });
  }
}
