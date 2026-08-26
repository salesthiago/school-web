import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CertificatesService } from '../../core/services/certificates.service';
import { Certificate } from '../../core/models/academic.model';
import { BottomNavComponent } from '../../shared/components/bottom-nav.component';
import { DashboardShellComponent } from '../../shared/components/dashboard-shell.component';
import { STUDENT_NAV_ITEMS } from '../../shared/nav-items';

@Component({
  selector: 'app-student-certificates',
  standalone: true,
  imports: [CommonModule, RouterLink, BottomNavComponent, DashboardShellComponent],
  templateUrl: './certificates.component.html',
  styleUrl: './certificates.component.scss',
})
export class CertificatesComponent implements OnInit {
  navItems = STUDENT_NAV_ITEMS;
  certificates = signal<Certificate[]>([]);

  constructor(private certificatesService: CertificatesService) {}

  ngOnInit() {
    this.certificatesService.myCertificates().subscribe((certs) => this.certificates.set(certs));
  }

  download(cert: Certificate) {
    this.certificatesService.getDownloadUrl(cert.id).subscribe(({ url }) => {
      window.open(url, '_blank');
    });
  }
}
