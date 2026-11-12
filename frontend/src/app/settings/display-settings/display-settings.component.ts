import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MotionService } from '../../core/services/motion.service';

/** Carte « Affichage » de /settings : réglage « Animations » (FR51, A16), mémorisé sur l'appareil. */
@Component({
  selector: 'app-display-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatSlideToggleModule, MatIconModule],
  templateUrl: './display-settings.component.html',
  styles: ':host { display: block; }',
})
export class DisplaySettingsComponent {
  readonly motion = inject(MotionService);

  onToggle(event: MatSlideToggleChange): void {
    this.motion.setEnabled(event.checked);
  }
}
