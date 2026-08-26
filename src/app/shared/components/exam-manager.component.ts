import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ExamDetail,
  ExamScope,
  ExamsService,
  TeacherQuestion,
} from '../../core/services/exams.service';
import { IconButtonComponent } from './icon-button.component';

/**
 * Editor autônomo de prova/quiz: uma prova (config) + suas questões (opções com correta
 * marcada), reutilizado em três lugares — prova de aula, prova final de módulo e prova final
 * do curso (avaliação final unificada). Busca/cria/edita tudo sozinho a partir de `scope` +
 * `targetId` (lessonId, moduleId ou courseId, conforme o scope).
 */
@Component({
  selector: 'app-exam-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconButtonComponent],
  templateUrl: './exam-manager.component.html',
  styleUrl: './exam-manager.component.scss',
})
export class ExamManagerComponent implements OnInit {
  @Input({ required: true }) scope!: ExamScope;
  @Input({ required: true }) targetId!: string;

  private fb = inject(FormBuilder);
  private examsService = inject(ExamsService);

  loading = signal(true);
  exam = signal<ExamDetail | null>(null);
  examSaving = signal(false);
  examError = signal<string | null>(null);

  questions = signal<TeacherQuestion[]>([]);
  questionFormOpen = signal(false);
  editingQuestion = signal<TeacherQuestion | null>(null);
  questionSaving = signal(false);
  questionError = signal<string | null>(null);

  scopeLabel = computed(() => {
    switch (this.scope) {
      case 'lesson':
        return 'Atividade da aula';
      case 'module':
        return 'Prova final do módulo';
      default:
        return 'Prova final do curso';
    }
  });

  examForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    minScorePercent: [70, [Validators.min(0), Validators.max(100)]],
    maxAttempts: [1, [Validators.min(1)]],
    allowRetake: [false],
    showCorrectAnswers: [false],
    immediateResult: [true],
    published: [false],
  });

  questionForm = this.fb.nonNullable.group({
    text: ['', [Validators.required, Validators.minLength(3)]],
    type: this.fb.nonNullable.control<'single' | 'multiple'>('single'),
    options: this.fb.array([this.newOption(), this.newOption()]),
  });

  ngOnInit() {
    this.loadExam();
  }

  get optionControls() {
    return (this.questionForm.get('options') as FormArray).controls;
  }

  private newOption(text = '', correct = false) {
    return this.fb.nonNullable.group({
      text: [text, Validators.required],
      correct: [correct],
    });
  }

  private loadExam() {
    this.loading.set(true);
    const list$ =
      this.scope === 'lesson'
        ? this.examsService.listByLesson(this.targetId)
        : this.scope === 'module'
          ? this.examsService.listByModule(this.targetId)
          : this.examsService.listByCourseScope(this.targetId);

    list$.subscribe({
      next: (exams) => {
        const found = exams[0];
        if (!found) {
          this.loading.set(false);
          return;
        }
        this.examsService.getManage(found.id).subscribe({
          next: ({ exam, questions }) => {
            this.exam.set(exam);
            this.questions.set(questions);
            this.examForm.reset({
              title: exam.title,
              minScorePercent: exam.minScorePercent,
              maxAttempts: exam.maxAttempts,
              allowRetake: exam.allowRetake,
              showCorrectAnswers: exam.showCorrectAnswers,
              immediateResult: exam.immediateResult,
              published: exam.published,
            });
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  saveExam() {
    if (this.examForm.invalid) return;
    this.examSaving.set(true);
    this.examError.set(null);
    const value = this.examForm.getRawValue();
    const existing = this.exam();

    const request = existing
      ? this.examsService.updateExam(existing.id, value)
      : this.examsService.createExam({
          title: value.title,
          scope: this.scope,
          lessonId: this.scope === 'lesson' ? this.targetId : undefined,
          moduleId: this.scope === 'module' ? this.targetId : undefined,
          courseId: this.scope === 'course' ? this.targetId : undefined,
          minScorePercent: value.minScorePercent,
          maxAttempts: value.maxAttempts,
          allowRetake: value.allowRetake,
          showCorrectAnswers: value.showCorrectAnswers,
          immediateResult: value.immediateResult,
        });

    request.subscribe({
      next: (exam) => {
        this.exam.set(exam);
        this.examSaving.set(false);
      },
      error: (err) => {
        this.examSaving.set(false);
        this.examError.set(err?.error?.message ?? 'Não foi possível salvar a prova.');
      },
    });
  }

  deleteExam() {
    const exam = this.exam();
    if (!exam) return;
    const confirmed = window.confirm('Excluir esta prova e todas as suas questões? Essa ação não pode ser desfeita.');
    if (!confirmed) return;
    this.examsService.deleteExam(exam.id).subscribe(() => {
      this.exam.set(null);
      this.questions.set([]);
      this.examForm.reset({
        title: '',
        minScorePercent: 70,
        maxAttempts: 1,
        allowRetake: false,
        showCorrectAnswers: false,
        immediateResult: true,
        published: false,
      });
    });
  }

  openQuestionCreate() {
    this.editingQuestion.set(null);
    this.questionError.set(null);
    this.resetQuestionForm();
    this.questionFormOpen.set(true);
  }

  openQuestionEdit(question: TeacherQuestion) {
    this.editingQuestion.set(question);
    this.questionError.set(null);
    const options = this.questionForm.get('options') as FormArray;
    options.clear();
    for (const option of question.options) {
      options.push(this.newOption(option.text, option.correct));
    }
    this.questionForm.patchValue({ text: question.text, type: question.type });
    this.questionFormOpen.set(true);
  }

  closeQuestionForm() {
    this.questionFormOpen.set(false);
    this.editingQuestion.set(null);
  }

  private resetQuestionForm() {
    const options = this.questionForm.get('options') as FormArray;
    options.clear();
    options.push(this.newOption());
    options.push(this.newOption());
    this.questionForm.reset({ text: '', type: 'single' });
  }

  addOption() {
    (this.questionForm.get('options') as FormArray).push(this.newOption());
  }

  removeOption(index: number) {
    const options = this.questionForm.get('options') as FormArray;
    if (options.length <= 2) return;
    options.removeAt(index);
  }

  saveQuestion() {
    if (this.questionForm.invalid) return;
    const exam = this.exam();
    if (!exam) return;
    const value = this.questionForm.getRawValue();
    if (!value.options.some((o) => o.correct)) {
      this.questionError.set('Marque ao menos uma opção correta.');
      return;
    }

    this.questionSaving.set(true);
    this.questionError.set(null);
    const editing = this.editingQuestion();
    const request = editing
      ? this.examsService.updateQuestion(editing.id, value)
      : this.examsService.createQuestion(exam.id, value);

    request.subscribe({
      next: () => {
        this.questionSaving.set(false);
        this.closeQuestionForm();
        this.reloadQuestions();
      },
      error: (err) => {
        this.questionSaving.set(false);
        this.questionError.set(err?.error?.message ?? 'Não foi possível salvar a questão.');
      },
    });
  }

  deleteQuestion(question: TeacherQuestion) {
    const confirmed = window.confirm(`Excluir a questão "${question.text}"?`);
    if (!confirmed) return;
    this.examsService.deleteQuestion(question.id).subscribe(() => {
      this.questions.update((list) => list.filter((q) => q.id !== question.id));
    });
  }

  private reloadQuestions() {
    const exam = this.exam();
    if (!exam) return;
    this.examsService.getManage(exam.id).subscribe(({ questions }) => this.questions.set(questions));
  }
}
