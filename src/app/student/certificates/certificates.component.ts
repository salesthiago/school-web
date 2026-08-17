import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CertificatesService } from '../../core/services/certificates.service';
import { Certificate } from '../../core/models/academic.model';
import { BottomNavComponent } from '../../shared/components/bottom-nav.component';

@Component({
  selector: 'app-student-certificates',
  standalone: true,
  imports: [CommonModule, RouterLink, BottomNavComponent],
  templateUrl: './certificates.component.html',
  styleUrl: './certificates.component.scss',
})
export class CertificatesComponent implements OnInit {
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
