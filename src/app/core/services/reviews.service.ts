import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  CourseReviewsOverview,
  MyReview,
  Review,
  ReviewStatus,
} from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  constructor(private http: HttpClient) {}

  upsert(courseId: string, payload: { rating: number; comment?: string }) {
    return this.http.post<Review>(`${environment.apiUrl}/reviews/courses/${courseId}`, payload);
  }

  mine(courseId: string) {
    return this.http.get<MyReview>(`${environment.apiUrl}/reviews/courses/${courseId}/mine`);
  }

  publicOverview(courseId: string) {
    return this.http.get<CourseReviewsOverview>(`${environment.apiUrl}/reviews/courses/${courseId}`);
  }

  forModeration(courseId: string, status?: ReviewStatus) {
    return this.http.get<Review[]>(`${environment.apiUrl}/reviews/courses/${courseId}/moderation`, {
      params: status ? { status } : {},
    });
  }

  moderate(reviewId: string, payload: { status: 'approved' | 'rejected'; rejectionReason?: string }) {
    return this.http.patch<Review>(`${environment.apiUrl}/reviews/${reviewId}/moderate`, payload);
  }
}
