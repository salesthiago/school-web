import { Component, Input } from '@angular/core';

export type IconName =
  | 'home'
  | 'book'
  | 'compass'
  | 'award'
  | 'heart'
  | 'clock'
  | 'user'
  | 'settings'
  | 'help'
  | 'bell'
  | 'chevron-down'
  | 'log-out'
  | 'camera'
  | 'search'
  | 'users'
  | 'graduation-cap'
  | 'credit-card'
  | 'bar-chart'
  | 'palette'
  | 'video'
  | 'layers'
  | 'clipboard';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      @switch (name) {
        @case ('home') {
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M9.5 21v-6.5h5V21" />
        }
        @case ('book') {
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        }
        @case ('compass') {
          <circle cx="12" cy="12" r="9" />
          <path d="m14.5 9.5-2 5-5 2 2-5z" />
        }
        @case ('award') {
          <circle cx="12" cy="8" r="5.5" />
          <path d="m8.2 12.8-1.6 8 5.4-2.6 5.4 2.6-1.6-8" />
        }
        @case ('heart') {
          <path
            d="M12 20.5s-7.5-4.6-9.8-9A5.3 5.3 0 0 1 12 6.3 5.3 5.3 0 0 1 21.8 11.5c-2.3 4.4-9.8 9-9.8 9Z"
          />
        }
        @case ('clock') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
        }
        @case ('user') {
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
        }
        @case ('settings') {
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V20a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H4a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10a1.7 1.7 0 0 0 1.04-1.56V4a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10a1.7 1.7 0 0 0 1.56 1.04H20a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04Z"
          />
        }
        @case ('help') {
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.3a2.5 2.5 0 0 1 4.86.8c0 1.7-2.36 2-2.36 3.4" />
          <path d="M12 17.5h.01" />
        }
        @case ('bell') {
          <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        }
        @case ('chevron-down') {
          <path d="m6 9 6 6 6-6" />
        }
        @case ('log-out') {
          <path d="M9 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" />
          <path d="M16 17.5 21.5 12 16 6.5" />
          <path d="M21.5 12h-13" />
        }
        @case ('camera') {
          <path
            d="M4 8a2 2 0 0 1 2-2h1.2l1-1.6h7.6l1 1.6H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
          />
          <circle cx="12" cy="13" r="3.5" />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        }
        @case ('users') {
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
          <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
          <path d="M18.5 13.2a6.5 6.5 0 0 1 3 6.8" />
        }
        @case ('graduation-cap') {
          <path d="m2 8 10-4.5L22 8l-10 4.5Z" />
          <path d="M6 10.3V16c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5.7" />
          <path d="M22 8v6.5" />
        }
        @case ('credit-card') {
          <rect x="2.5" y="5" width="19" height="14" rx="2.2" />
          <path d="M2.5 10h19" />
          <path d="M6 14.5h4" />
        }
        @case ('bar-chart') {
          <path d="M4 20V10" />
          <path d="M12 20V4" />
          <path d="M20 20v-7" />
          <path d="M2.5 20h19" />
        }
        @case ('palette') {
          <path
            d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2s-.5-1.4-.5-2 .5-1 1.5-1h1.7A4.3 4.3 0 0 0 21 13.7C21 7.8 17 3 12 3Z"
          />
          <circle cx="7.5" cy="12" r="1.2" />
          <circle cx="9" cy="8" r="1.2" />
          <circle cx="14" cy="7.5" r="1.2" />
          <circle cx="17" cy="11" r="1.2" />
        }
        @case ('video') {
          <rect x="2.5" y="5.5" width="13" height="13" rx="2" />
          <path d="m15.5 10.5 6-3.5v10l-6-3.5" />
        }
        @case ('layers') {
          <path d="m12 3 9 5-9 5-9-5Z" />
          <path d="m3 13 9 5 9-5" />
        }
        @case ('clipboard') {
          <rect x="5" y="4.5" width="14" height="17" rx="2" />
          <path d="M9 4.5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5" />
          <path d="M8.5 11h7" />
          <path d="M8.5 15h7" />
        }
      }
    </svg>
  `,
})
export class IconComponent {
  @Input({ required: true }) name!: IconName;
}
