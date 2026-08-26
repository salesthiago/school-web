import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InstitutionsService } from '../../core/services/institutions.service';
import { SettingsService } from '../../core/services/settings.service';
import { ThemeService } from '../../core/services/theme.service';
import { Institution } from '../../core/models/academic.model';
import { DashboardShellComponent } from '../../shared/components/dashboard-shell.component';
import { ADMIN_NAV_ITEMS } from '../../shared/nav-items';

type SettingsTab = 'identidade' | 'bunny' | 'pagamento' | 'certificado';
type ImageKind = 'logo' | 'loginBackground' | 'registerBackground' | 'studentBanner';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DashboardShellComponent],
  templateUrl: './configuracoes.component.html',
  styleUrl: './configuracoes.component.scss',
})
export class ConfiguracoesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private institutionsService = inject(InstitutionsService);
  private settingsService = inject(SettingsService);
  private themeService = inject(ThemeService);

  navItems = ADMIN_NAV_ITEMS;
  activeTab = signal<SettingsTab>('identidade');

  // ---------- Identidade visual ----------
  institution = signal<Institution | null>(null);
  brandingLoading = signal(true);
  brandingSaving = signal(false);
  brandingError = signal<string | null>(null);
  brandingSuccess = signal<string | null>(null);
  uploadingImage = signal<ImageKind | null>(null);

  brandingForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    primaryColor: ['#6c4bf4', Validators.required],
    secondaryColor: ['#26a69a', Validators.required],
    address: [''],
    phone: [''],
    email: ['', [Validators.email]],
    website: [''],
  });

  // ---------- Integração Bunny ----------
  bunnyLoading = signal(true);
  bunnySaving = signal(false);
  bunnyError = signal<string | null>(null);
  bunnySuccess = signal<string | null>(null);
  apiKeyConfigured = signal(false);

  bunnyForm = this.fb.nonNullable.group({
    libraryId: ['', Validators.required],
    apiKey: [''],
    pullZoneHostname: [''],
    enabled: [false],
  });

  // ---------- Template do certificado ----------
  certUploading = signal(false);
  certError = signal<string | null>(null);
  certSuccess = signal<string | null>(null);

  ngOnInit() {
    this.loadBranding();
    this.loadBunny();
  }

  setTab(tab: SettingsTab) {
    this.activeTab.set(tab);
  }

  // ---------- Identidade visual ----------
  private loadBranding() {
    this.institutionsService.getPublic().subscribe({
      next: (institution) => {
        this.institution.set(institution);
        this.brandingForm.patchValue({
          name: institution.name,
          primaryColor: institution.primaryColor,
          secondaryColor: institution.secondaryColor,
          address: institution.address ?? '',
          phone: institution.phone ?? '',
          email: institution.email ?? '',
          website: institution.website ?? '',
        });
        this.brandingLoading.set(false);
      },
      error: () => {
        this.brandingError.set('Não foi possível carregar as configurações.');
        this.brandingLoading.set(false);
      },
    });
  }

  submitBranding() {
    const institution = this.institution();
    if (this.brandingForm.invalid || !institution) return;
    this.brandingSaving.set(true);
    this.brandingError.set(null);
    this.brandingSuccess.set(null);

    this.institutionsService.update(institution.id, this.brandingForm.getRawValue()).subscribe({
      next: (updated) => {
        this.institution.set(updated);
        this.themeService.apply(updated);
        this.brandingSaving.set(false);
        this.brandingSuccess.set('Identidade visual salva com sucesso.');
      },
      error: () => {
        this.brandingSaving.set(false);
        this.brandingError.set('Não foi possível salvar as configurações.');
      },
    });
  }

  onImageSelected(kind: ImageKind, event: Event) {
    const institution = this.institution();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!institution || !file) return;

    this.uploadingImage.set(kind);
    this.brandingError.set(null);
    this.brandingSuccess.set(null);

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
        this.uploadingImage.set(null);
        this.brandingSuccess.set('Imagem enviada com sucesso.');
        input.value = '';
      },
      error: () => {
        this.uploadingImage.set(null);
        this.brandingError.set('Não foi possível enviar a imagem.');
        input.value = '';
      },
    });
  }

  // ---------- Integração Bunny ----------
  private loadBunny() {
    this.settingsService.getBunnySettings().subscribe({
      next: (settings) => {
        this.bunnyForm.patchValue({
          libraryId: settings.libraryId ?? '',
          pullZoneHostname: settings.pullZoneHostname ?? '',
          enabled: settings.enabled,
        });
        this.apiKeyConfigured.set(settings.apiKeyConfigured);
        this.bunnyLoading.set(false);
      },
      error: () => {
        this.bunnyError.set('Não foi possível carregar as configurações.');
        this.bunnyLoading.set(false);
      },
    });
  }

  submitBunny() {
    if (this.bunnyForm.invalid) return;
    this.bunnySaving.set(true);
    this.bunnyError.set(null);
    this.bunnySuccess.set(null);

    const { libraryId, apiKey, pullZoneHostname, enabled } = this.bunnyForm.getRawValue();
    this.settingsService
      .updateBunnySettings({
        libraryId,
        pullZoneHostname,
        enabled,
        ...(apiKey ? { apiKey } : {}),
      })
      .subscribe({
        next: (settings) => {
          this.apiKeyConfigured.set(settings.apiKeyConfigured);
          this.bunnyForm.patchValue({ apiKey: '' });
          this.bunnySaving.set(false);
          this.bunnySuccess.set('Configurações salvas com sucesso.');
        },
        error: () => {
          this.bunnySaving.set(false);
          this.bunnyError.set('Não foi possível salvar as configurações.');
        },
      });
  }

  // ---------- Template do certificado ----------
  onCertTemplateSelected(event: Event) {
    const institution = this.institution();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!institution || !file) return;

    this.certUploading.set(true);
    this.certError.set(null);
    this.certSuccess.set(null);

    this.institutionsService.uploadCertificateTemplate(institution.id, file).subscribe({
      next: (updated) => {
        this.institution.set(updated);
        this.certUploading.set(false);
        this.certSuccess.set('Template enviado com sucesso.');
        input.value = '';
      },
      error: () => {
        this.certUploading.set(false);
        this.certError.set('Não foi possível enviar o template.');
        input.value = '';
      },
    });
  }
}
