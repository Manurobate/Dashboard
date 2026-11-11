import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTabNav, MatTabLink, MatTabNavPanel } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { injectIsPublicShareRoute } from '../../utils/public-share-route';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatTabNav,
    MatTabLink,
    MatTabNavPanel,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
  ],
  host: { '[class.public-view]': 'isPublicView()' },
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss',
})
export class TopBarComponent {
  protected readonly themeService = inject(ThemeService);
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  /** Vue publique de partage : mini top bar de 56px (maquette 11). */
  protected readonly isPublicView = injectIsPublicShareRoute();

  protected readonly userInitial = computed(() => {
    const user = this.authService.currentUser();
    const source = user?.name?.trim() || user?.username?.trim() || '';
    const first = Array.from(source)[0];
    return first ? first.toUpperCase() : '?';
  });

  onLogout(): void {
    this.authService.logout().subscribe(() => {
      void this.router.navigate(['/login']);
    });
  }
}
