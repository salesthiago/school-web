import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-video-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './video-settings.component.html',
  styleUrl: './video-settings.component.scss',
})
export class VideoSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private settingsService = inject(SettingsService);

  loading = signal(true);
  saving = signal(false);
  apiKeyConfigured = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    libraryId: ['', Validators.required],
    apiKey: [''],
    pullZoneHostname: [''],
    enabled: [false],
  });

  ngOnInit() {
    this.settingsService.getBunnySettings().subscribe({
      next: (settings) => {
        this.form.patchValue({
          libraryId: settings.libraryId ?? '',
          pullZoneHostname: settings.pullZoneHostname ?? '',
          enabled: settings.enabled,
        });
        this.apiKeyConfigured.set(settings.apiKeyConfigured);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Não foi possível carregar as configurações.');
        this.loading.set(false);
      },
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { libraryId, apiKey, pullZoneHostname, enabled } = this.form.getRawValue();
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
          this.form.patchValue({ apiKey: '' });
          this.saving.set(false);
          this.successMessage.set('Configurações salvas com sucesso.');
        },
        error: () => {
          this.saving.set(false);
          this.errorMessage.set('Não foi possível salvar as configurações.');
        },
      });
  }
}
