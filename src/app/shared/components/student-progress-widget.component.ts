import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { EnrollmentsService } from '../../core/services/enrollments.service';
import { Course, enrollmentModuleId } from '../../core/models/academic.model';

@Component({
  selector: 'app-student-progress-widget',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './student-progress-widget.component.html',
  styleUrl: './student-progress-widget.component.scss',
})
export class StudentProgressWidgetComponent implements OnInit {
  loaded = signal(false);
  percentage = signal(0);
  inProgressCount = signal(0);
  hasEnrollments = signal(false);

  constructor(private enrollmentsService: EnrollmentsService) {}

  ngOnInit() {
    this.enrollmentsService
      .myEnrollments()
      .pipe(
        switchMap((enrollments) => {
          const active = enrollments.filter((e) => e.status === 'active' && typeof e.courseId === 'object');
          if (!active.length) return of([] as number[]);

          const requests = active.map((e) => {
            const moduleId = enrollmentModuleId(e);
            const progress$ = moduleId
              ? this.enrollmentsService.moduleProgress(moduleId)
              : this.enrollmentsService.courseTrackProgress((e.courseId as Course).id);
            return progress$.pipe(switchMap((p) => of(p.percentage)));
          });
          return forkJoin(requests);
        }),
      )
      .subscribe((percentages) => {
        this.hasEnrollments.set(percentages.length > 0);
        this.inProgressCount.set(percentages.filter((p) => p < 100).length);
        const overall = percentages.length
          ? Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length)
          : 0;
        this.percentage.set(overall);
        this.loaded.set(true);
      });
  }
}
