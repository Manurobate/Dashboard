import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../core/services/auth.service';

const LOAD_TIMEOUT_MS = 15000;

@Component({
  selector: 'app-trilium-embed',
  imports: [MatProgressBarModule, MatIconModule, MatButtonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trilium-embed.component.html',
  styleUrl: './trilium-embed.component.scss',
})
export class TriliumEmbedComponent {
  private readonly authService = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly isLoading = signal(true);
  readonly loadTimedOut = signal(false);
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  /** URL validée (http/https uniquement) ou null. Ne jamais bypass une valeur non validée. */
  readonly validUrl = computed<string | null>(() => {
    const raw = this.authService.currentUser()?.triliumUrl?.trim();
    if (!raw) return null;
    try {
      const { protocol } = new URL(raw);
      return protocol === 'http:' || protocol === 'https:' ? raw : null;
    } catch {
      return null;
    }
  });

  readonly safeUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.validUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  constructor() {
    effect(() => {
      const url = this.validUrl();
      this.clearTimer();
      this.isLoading.set(true);
      this.loadTimedOut.set(false);
      if (url) {
        this.timeoutId = setTimeout(() => {
          this.isLoading.set(false);
          this.loadTimedOut.set(true);
        }, LOAD_TIMEOUT_MS);
      }
    });
    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  onLoad(): void {
    this.clearTimer();
    this.isLoading.set(false);
    this.loadTimedOut.set(false);
  }

  private clearTimer(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
