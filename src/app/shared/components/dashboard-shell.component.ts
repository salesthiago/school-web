import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { InstitutionsService } from '../../core/services/institutions.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { Institution } from '../../core/models/academic.model';
import { AppNotification } from '../../core/models/notification.model';
import { ROLE_LABELS } from '../../core/models/user.model';
import { IconComponent, IconName } from './icon.component';

export interface ShellNavItem {
  label: string;
  link: string;
  exact: boolean;
  icon: IconName;
}

@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './dashboard-shell.component.html',
  styleUrl: './dashboard-shell.component.scss',
})
export class DashboardShellComponent implements OnInit {
  @Input({ required: true }) navItems: ShellNavItem[] = [];
  @Input() profileLink?: string;
  @Input() searchPlaceholder?: string;
  @Input() searchLink?: string;
  @Input() mobileSubtitle = '';

  institution = signal<Institution | null>(null);
  notifications = signal<AppNotification[]>([]);
  unreadCount = computed(() => this.notifications().filter((n) => !n.read).length);

  userMenuOpen = signal(false);
  notifMenuOpen = signal(false);

  constructor(
    public authService: AuthService,
    private institutionsService: InstitutionsService,
    private notificationsService: NotificationsService,
  ) {}

  ngOnInit() {
    this.institutionsService.getPublic().subscribe((institution) => this.institution.set(institution));
    this.notificationsService.mine().subscribe((notifications) => this.notifications.set(notifications));
  }

  initial(name: string | undefined): string {
    return name?.trim()?.charAt(0)?.toUpperCase() ?? '?';
  }

  roleLabel(role: string | undefined): string {
    return role ? ((ROLE_LABELS as Record<string, string>)[role] ?? role) : '';
  }

  toggleUserMenu() {
    this.userMenuOpen.update((open) => !open);
    this.notifMenuOpen.set(false);
  }

  toggleNotifMenu() {
    this.notifMenuOpen.update((open) => !open);
    this.userMenuOpen.set(false);
  }

  markNotificationRead(notification: AppNotification) {
    if (notification.read) return;
    this.notificationsService.markRead(notification.id).subscribe(() => {
      this.notifications.update((list) =>
        list.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
    });
  }
}
