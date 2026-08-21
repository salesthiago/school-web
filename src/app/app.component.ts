import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InstitutionsService } from './core/services/institutions.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private institutionsService = inject(InstitutionsService);
  private themeService = inject(ThemeService);

  ngOnInit() {
    this.institutionsService.getPublic().subscribe((institution) => this.themeService.apply(institution));
  }
}
