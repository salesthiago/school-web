import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin, of, switchMap } from 'rxjs';
import { CoursesService } from '../../core/services/courses.service';
import { LessonsService } from '../../core/services/lessons.service';
import { AttachmentsService } from '../../core/services/attachments.service';
import { ExamsService } from '../../core/services/exams.service';
import { NotesService } from '../../core/services/notes.service';
import { EnrollmentsService } from '../../core/services/enrollments.service';
import { CompletionService } from '../../core/services/completion.service';
import {
  Attachment,
  Course,
  CourseModule,
  Lesson,
  ModuleProgressSummary,
  enrollmentCourseId,
  enrollmentModuleId,
} from '../../core/models/academic.model';
import { DashboardShellComponent } from '../../shared/components/dashboard-shell.component';
import { BottomNavComponent } from '../../shared/components/bottom-nav.component';
import { STUDENT_NAV_ITEMS } from '../../shared/nav-items';

type ContentTab = 'sobre' | 'materiais' | 'anotacoes' | 'perguntas';
type SidebarTab = 'conteudo' | 'resumo';

const PROGRESS_SYNC_INTERVAL_MS = 10000;

interface PlayerJsPlayer {
  on(event: string, callback: (data: unknown) => void): void;
  setCurrentTime(seconds: number): void;
}
declare global {
  interface Window {
    playerjs?: { Player: new (target: HTMLIFrameElement) => PlayerJsPlayer };
  }
}

/**
 * Carrega o player.js do Bunny (protocolo postMessage padrão da indústria, usado pelo embed do
 * Bunny Stream) uma única vez por sessão de página — usado pra saber o segundo real do vídeo e
 * mandar progresso incremental, em vez de só no clique manual "Marcar como concluída".
 */
let playerJsLoadPromise: Promise<void> | null = null;
function loadPlayerJs(): Promise<void> {
  if (window.playerjs) return Promise.resolve();
  if (playerJsLoadPromise) return playerJsLoadPromise;
  playerJsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '//assets.mediadelivery.net/playerjs/playerjs-latest.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar player.js'));
    document.head.appendChild(script);
  });
  return playerJsLoadPromise;
}

interface SidebarSection {
  key: string; // moduleId, ou 'loose' pra trilha de aulas avulsas
  title: string;
  workloadHours?: number;
  enrolled: boolean;
  isCurrent: boolean;
}

@Component({
  selector: 'app-course-player',
  standalone: true,
  imports: [CommonModule, RouterLink, DashboardShellComponent, BottomNavComponent],
  templateUrl: './course-player.component.html',
  styleUrl: './course-player.component.scss',
})
export class CoursePlayerComponent implements OnInit {
  navItems = STUDENT_NAV_ITEMS;

  course = signal<Course | null>(null);
  /** Nulo quando o player está tocando uma aula avulsa (sem módulo). */
  module = signal<CourseModule | null>(null);
  private courseId = '';

  lessons = signal<Lesson[]>([]);
  currentLesson = signal<Lesson | null>(null);
  progress = signal<ModuleProgressSummary | null>(null);
  attachments = signal<Attachment[]>([]);
  lessonExam = signal<{ id: string; title: string } | null>(null);

  activeTab = signal<ContentTab>('sobre');
  sidebarTab = signal<SidebarTab>('conteudo');

  noteText = signal('');
  noteLoading = signal(false);
  noteSaving = signal(false);
  noteSavedAt = signal<Date | null>(null);

  allModules = signal<CourseModule[]>([]);
  enrolledModuleIds = signal<Set<string>>(new Set());
  courseTrackEnrolled = signal(false);
  hasLooseTrack = signal(false);

  sidebarSections = computed<SidebarSection[]>(() => {
    const sections: SidebarSection[] = this.allModules().map((m) => ({
      key: m.id,
      title: m.title,
      workloadHours: m.workloadHours,
      enrolled: this.enrolledModuleIds().has(m.id),
      isCurrent: this.module()?.id === m.id,
    }));
    if (this.hasLooseTrack()) {
      sections.push({
        key: 'loose',
        title: 'Aulas avulsas',
        enrolled: this.courseTrackEnrolled(),
        isCurrent: !this.module(),
      });
    }
    return sections;
  });

  statusLabel = computed(() => {
    const p = this.progress();
    if (!p || p.percentage === 0) return 'Não iniciado';
    if (p.percentage >= 100) return 'Concluído';
    return 'Em andamento';
  });

  hasNextLesson = computed(() => {
    const current = this.currentLesson();
    const list = this.lessons();
    if (!current) return false;
    const idx = list.findIndex((l) => l.id === current.id);
    return idx >= 0 && idx < list.length - 1;
  });

  /**
   * Memoizado por aula: `bypassSecurityTrustResourceUrl` cria um objeto novo a cada chamada, e
   * chamar isso direto no template (`[src]="embedUrl(...)"`) recalculava a cada ciclo de change
   * detection (ex.: clicar numa aba) — trocando a referência do `[src]` do iframe e reiniciando o
   * vídeo do zero. `computed()` só reavalia quando `currentLesson()` muda de fato.
   */
  videoUrl = computed<SafeResourceUrl | null>(() => {
    const playbackUrl = this.currentLesson()?.video?.playbackUrl;
    return playbackUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(playbackUrl) : null;
  });

  private lastSyncedAt = 0;
  private lastKnownSeconds = 0;
  private currentLessonDuration = 0;
  /** Segundo salvo da última sessão — usado pra retomar o vídeo em vez de sempre começar do zero. */
  private resumeSeconds = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private coursesService: CoursesService,
    private lessonsService: LessonsService,
    private attachmentsService: AttachmentsService,
    private examsService: ExamsService,
    private notesService: NotesService,
    private enrollmentsService: EnrollmentsService,
    private completionService: CompletionService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const moduleId = params.get('moduleId');
          const paramCourseId = params.get('courseId');

          if (moduleId) {
            return this.coursesService.getModule(moduleId);
          }

          this.courseId = paramCourseId!;
          this.module.set(null);
          this.loadLooseLessons(this.courseId);
          this.refreshCourseTrackProgress(this.courseId);
          this.loadCourseContext(this.courseId);
          return of(null);
        }),
      )
      .subscribe((module) => {
        if (!module) return;
        this.module.set(module);
        this.courseId = module.courseId;
        this.loadModuleLessons(module.id);
        this.refreshModuleProgress(module.id);
        this.loadCourseContext(module.courseId);
      });
  }

  private loadCourseContext(courseId: string) {
    this.coursesService.getCourse(courseId).subscribe((course) => this.course.set(course));
    this.coursesService
      .listModules(courseId)
      .subscribe((modules) => this.allModules.set(modules.filter((m) => m.published)));
    this.enrollmentsService.myEnrollments().subscribe((enrollments) => {
      const active = enrollments.filter((e) => e.status === 'active' && enrollmentCourseId(e) === courseId);
      this.enrolledModuleIds.set(
        new Set(active.map(enrollmentModuleId).filter((id): id is string => !!id)),
      );
      this.courseTrackEnrolled.set(active.some((e) => enrollmentModuleId(e) === null));
    });
    // Só existe trilha de aulas avulsas se essa chamada não vier vazia (matriculado) ou 403 (existe, mas não comprou ainda).
    if (this.module()) {
      this.lessonsService.listByCourse(courseId).subscribe({
        next: (lessons) => this.hasLooseTrack.set(lessons.length > 0),
        error: (err) => this.hasLooseTrack.set(err?.status === 403),
      });
    } else {
      this.hasLooseTrack.set(true);
    }
  }

  private loadModuleLessons(moduleId: string) {
    this.coursesService.listLessons(moduleId).subscribe((lessons) => this.selectLessonFromRoute(lessons));
  }

  private loadLooseLessons(courseId: string) {
    this.lessonsService.listByCourse(courseId).subscribe((lessons) => this.selectLessonFromRoute(lessons));
  }

  private selectLessonFromRoute(lessons: Lesson[]) {
    this.lessons.set(lessons);
    const lessonId = this.route.snapshot.paramMap.get('lessonId');
    const selected = lessons.find((l) => l.id === lessonId) ?? lessons[0] ?? null;
    this.currentLesson.set(selected);
    if (selected) this.onLessonSelected(selected);
  }

  private onLessonSelected(lesson: Lesson) {
    this.activeTab.set('sobre');
    this.resumeSeconds = 0;
    this.attachmentsService.listByLesson(lesson.id).subscribe((attachments) => this.attachments.set(attachments));
    this.examsService.listByLesson(lesson.id).subscribe((exams) => {
      const exam = exams[0];
      this.lessonExam.set(exam ? { id: exam.id, title: exam.title } : null);
    });
    this.enrollmentsService.lessonProgress(lesson.id).subscribe((p) => (this.resumeSeconds = p.watchedSeconds));
    this.loadNote(lesson.id);
  }

  private loadNote(lessonId: string) {
    this.noteLoading.set(true);
    this.noteSavedAt.set(null);
    this.notesService.getForLesson(lessonId).subscribe({
      next: (note) => {
        this.noteText.set(note.text);
        this.noteLoading.set(false);
      },
      error: () => this.noteLoading.set(false),
    });
  }

  saveNote() {
    const lesson = this.currentLesson();
    if (!lesson) return;
    this.noteSaving.set(true);
    this.notesService.save(lesson.id, this.noteText()).subscribe({
      next: () => {
        this.noteSaving.set(false);
        this.noteSavedAt.set(new Date());
      },
      error: () => this.noteSaving.set(false),
    });
  }

  private refreshModuleProgress(moduleId: string) {
    this.enrollmentsService.moduleProgress(moduleId).subscribe((p) => {
      this.progress.set(p);
      if (p.percentage >= 100) {
        this.completionService.checkModule(moduleId).subscribe(() => {
          this.completionService.checkCourseFull(this.courseId).subscribe();
        });
      }
    });
  }

  private refreshCourseTrackProgress(courseId: string) {
    this.enrollmentsService.courseTrackProgress(courseId).subscribe((p) => {
      this.progress.set(p);
      if (p.percentage >= 100) {
        this.completionService.checkCourseTrack(courseId).subscribe(() => {
          this.completionService.checkCourseFull(courseId).subscribe();
        });
      }
    });
  }

  /**
   * Instancia o player.js contra o iframe recém-criado (chamado pelo (load) do template — um
   * iframe novo por troca de aula, já que `videoUrl()` só muda quando a aula muda). Sem isso,
   * a única forma de progresso era o clique manual "Marcar como concluída".
   */
  attachPlayer(iframeEl: HTMLIFrameElement) {
    this.lastSyncedAt = 0;
    this.lastKnownSeconds = 0;
    this.currentLessonDuration = 0;
    let gotFirstTimeupdate = false;

    loadPlayerJs()
      .then(() => {
        const PlayerCtor = window.playerjs?.Player;
        if (!PlayerCtor) {
          console.warn('[player-progress] script carregou mas window.playerjs.Player não existe');
          return;
        }
        const player = new PlayerCtor(iframeEl);
        console.debug('[player-progress] player.js anexado, aguardando eventos do iframe');

        player.on('ready', () => {
          console.debug('[player-progress] evento "ready" recebido');
          if (this.resumeSeconds > 5) {
            console.debug('[player-progress] retomando em', this.resumeSeconds, 's');
            player.setCurrentTime(this.resumeSeconds);
          }
        });

        player.on('timeupdate', (raw) => {
          if (!gotFirstTimeupdate) {
            gotFirstTimeupdate = true;
            console.debug('[player-progress] primeiro "timeupdate" recebido', raw);
          }
          const data = (typeof raw === 'string' ? JSON.parse(raw) : raw) as
            | { seconds?: number; duration?: number }
            | undefined;
          if (typeof data?.seconds !== 'number') return;
          this.lastKnownSeconds = data.seconds;
          if (typeof data.duration === 'number' && data.duration > 0) {
            this.currentLessonDuration = data.duration;
          }
          const now = Date.now();
          if (now - this.lastSyncedAt >= PROGRESS_SYNC_INTERVAL_MS) {
            this.lastSyncedAt = now;
            this.syncProgress(this.lastKnownSeconds);
          }
        });

        player.on('ended', () => {
          this.syncProgress(this.currentLessonDuration || this.lastKnownSeconds);
        });
      })
      .catch((err) => {
        // Sem player.js (bloqueado, rede etc.) o rastreio automático fica desligado; o botão
        // "Marcar como concluída" continua funcionando normalmente.
        console.warn('[player-progress] falha ao carregar/anexar player.js', err);
      });
  }

  private syncProgress(seconds: number) {
    const lesson = this.currentLesson();
    if (!lesson || seconds <= 0) return;
    const module = this.module();
    console.debug('[player-progress] enviando progresso', { lessonId: lesson.id, seconds: Math.round(seconds) });
    this.enrollmentsService.recordProgress(lesson.id, Math.round(seconds), module?.id).subscribe({
      next: () => {
        if (module) {
          this.refreshModuleProgress(module.id);
        } else {
          this.refreshCourseTrackProgress(this.courseId);
        }
      },
      error: (err) => console.warn('[player-progress] falha ao registrar progresso', err),
    });
  }

  setTab(tab: ContentTab) {
    this.activeTab.set(tab);
  }

  setSidebarTab(tab: SidebarTab) {
    this.sidebarTab.set(tab);
  }

  isLessonCompleted(lessonId: string): boolean {
    return this.progress()?.completedLessonIds?.includes(lessonId) ?? false;
  }

  selectLesson(lesson: Lesson) {
    this.currentLesson.set(lesson);
    this.onLessonSelected(lesson);
  }

  nextLesson() {
    const current = this.currentLesson();
    const list = this.lessons();
    if (!current) return;
    const idx = list.findIndex((l) => l.id === current.id);
    if (idx >= 0 && idx < list.length - 1) {
      this.selectLesson(list[idx + 1]);
    }
  }

  goToSection(section: SidebarSection) {
    if (section.isCurrent) return;
    if (!section.enrolled) {
      this.router.navigate(['/student/cursos', this.courseId]);
      return;
    }
    if (section.key === 'loose') {
      forkJoin({
        lessons: this.lessonsService.listByCourse(this.courseId),
        progress: this.enrollmentsService.courseTrackProgress(this.courseId),
      }).subscribe(({ lessons, progress }) => {
        const lessonId = progress.nextLessonId ?? lessons[0]?.id;
        if (lessonId) this.router.navigate(['/student/course-player/curso', this.courseId, lessonId]);
      });
    } else {
      forkJoin({
        lessons: this.coursesService.listLessons(section.key),
        progress: this.enrollmentsService.moduleProgress(section.key),
      }).subscribe(({ lessons, progress }) => {
        const lessonId = progress.nextLessonId ?? lessons[0]?.id;
        if (lessonId) this.router.navigate(['/student/course-player', section.key, lessonId]);
      });
    }
  }

  markWatched() {
    const lesson = this.currentLesson();
    if (!lesson) return;
    this.syncProgress(lesson.video?.durationSeconds ?? 0);
  }

  /** Descrições de aula/curso vêm do editor Quill do professor (HTML), não texto puro. */
  safeHtml(html: string | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html ?? '');
  }

  teacherName(): string {
    const teacher = this.course()?.teacherId as unknown;
    if (teacher && typeof teacher === 'object' && 'name' in teacher) {
      return (teacher as { name: string }).name;
    }
    return '';
  }

  formatDuration(seconds: number | undefined): string {
    if (!seconds) return '—';
    const minutes = Math.round(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours > 0 ? `${hours}h ${rest}min` : `${minutes} min`;
  }

  formatDate(iso: string | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR');
  }
}
