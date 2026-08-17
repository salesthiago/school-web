import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { EnrollmentsService } from '../../core/services/enrollments.service';
import { CertificatesService } from '../../core/services/certificates.service';
import { AuthService } from '../../core/services/auth.service';
import { CourseModule, Course, ModuleProgressSummary, Certificate } from '../../core/models/academic.model';
import { BottomNavComponent } from '../../shared/components/bottom-nav.component';

interface EnrollmentView {
  module: CourseModule;
  course: Course;
  progress: ModuleProgressSummary;
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, BottomNavComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  inProgress = signal<EnrollmentView[]>([]);
  completed = signal<EnrollmentView[]>([]);
  certificates = signal<Certificate[]>([]);

  constructor(
    public authService: AuthService,
    private enrollmentsService: EnrollmentsService,
    private certificatesService: CertificatesService,
  ) {}

  ngOnInit() {
    this.enrollmentsService
      .myEnrollments()
      .pipe(
        switchMap((enrollments) => {
          if (!enrollments.length) return of([] as EnrollmentView[]);
          const requests = enrollments.map((e) => {
            const module = e.moduleId as CourseModule;
            const course = e.courseId as Course;
            return this.enrollmentsService
              .moduleProgress(module.id)
              .pipe(switchMap((progress) => of({ module, course, progress })));
          });
          return forkJoin(requests);
        }),
      )
      .subscribe((views) => {
        this.inProgress.set(views.filter((v) => v.progress.percentage < 100));
        this.completed.set(views.filter((v) => v.progress.percentage >= 100));
        this.loading.set(false);
      });

    this.certificatesService.myCertificates().subscribe((certs) => this.certificates.set(certs));
  }

  get currentCourse(): EnrollmentView | undefined {
    return this.inProgress()[0];
  }
}
