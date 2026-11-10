import { Component, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { TopBarComponent } from './core/components/top-bar/top-bar.component';
import { BottomNavComponent } from './core/components/bottom-nav/bottom-nav.component';
import { FooterComponent } from './core/components/footer/footer.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TopBarComponent, BottomNavComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly title = inject(Title);
  private readonly authService = inject(AuthService);

  constructor() {
    // Titre de la fenêtre : « Dashboard de {nom} » une fois connecté, « Dashboard » sinon.
    effect(() => {
      const user = this.authService.currentUser();
      this.title.setTitle(
        user ? `Dashboard de ${user.name?.trim() || user.username}` : 'Dashboard',
      );
    });
  }
}
