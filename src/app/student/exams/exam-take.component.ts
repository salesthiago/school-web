import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { AttemptResult, ExamQuestion, ExamsService } from '../../core/services/exams.service';

@Component({
  selector: 'app-exam-take',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './exam-take.component.html',
  styleUrl: './exam-take.component.scss',
})
export class ExamTakeComponent implements OnInit {
  examId = '';
  questions = signal<ExamQuestion[]>([]);
  answers = new Map<string, Set<number>>();
  result = signal<AttemptResult | null>(null);
  submitting = signal(false);

  constructor(
    private route: ActivatedRoute,
    private examsService: ExamsService,
  ) {}

  ngOnInit() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.examId = params.get('examId')!;
          return this.examsService.getQuestions(this.examId);
        }),
      )
      .subscribe((questions) => this.questions.set(questions));
  }

  toggleOption(question: ExamQuestion, optionIndex: number) {
    const current = this.answers.get(question.id) ?? new Set<number>();
    if (question.type === 'single') {
      current.clear();
      current.add(optionIndex);
    } else if (current.has(optionIndex)) {
      current.delete(optionIndex);
    } else {
      current.add(optionIndex);
    }
    this.answers.set(question.id, current);
  }

  isSelected(questionId: string, optionIndex: number): boolean {
    return this.answers.get(questionId)?.has(optionIndex) ?? false;
  }

  submit() {
    this.submitting.set(true);
    const payload = this.questions().map((q) => ({
      questionId: q.id,
      selectedOptionIndexes: Array.from(this.answers.get(q.id) ?? []),
    }));

    this.examsService.submit(this.examId, payload).subscribe({
      next: (result) => {
        this.result.set(result);
        this.submitting.set(false);
      },
      error: () => this.submitting.set(false),
    });
  }
}
