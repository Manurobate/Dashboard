import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DisplaySettingsComponent } from './display-settings/display-settings.component';
import { NotesSettingsComponent } from './notes-settings/notes-settings.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NotesSettingsComponent, DisplaySettingsComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {}
