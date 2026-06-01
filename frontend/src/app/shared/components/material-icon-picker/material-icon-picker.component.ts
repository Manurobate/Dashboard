import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, catchError, of } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

export interface IconPickerDialogData {
  currentIcon: string | null;
}

export interface MaterialIcon {
  name: string;
  label: string;
}

@Component({
  selector: 'app-material-icon-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    FormsModule,
  ],
  templateUrl: './material-icon-picker.component.html',
  styleUrl: './material-icon-picker.component.scss',
})
export class MaterialIconPickerComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<MaterialIconPickerComponent>);
  readonly data = inject<IconPickerDialogData>(MAT_DIALOG_DATA);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  private readonly searchInput$ = new Subject<string>();

  readonly allIcons = signal<MaterialIcon[]>([]);
  readonly searchTerm = signal('');
  readonly selectedIcon = signal<string | null>(this.data.currentIcon);
  readonly isLoading = signal(true);
  readonly loadError = signal(false);

  readonly filteredIcons = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.allIcons();
    return this.allIcons().filter(
      (icon) => icon.name.toLowerCase().includes(term) || icon.label.toLowerCase().includes(term),
    );
  });

  ngOnInit(): void {
    this.http
      .get<MaterialIcon[]>('/material-icons.json')
      .pipe(
        catchError(() => {
          this.loadError.set(true);
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((icons) => {
        this.allIcons.set(icons);
        this.isLoading.set(false);
      });

    this.searchInput$
      .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => this.searchTerm.set(term));
  }

  onSearchChange(term: string): void {
    this.searchInput$.next(term);
  }

  select(name: string): void {
    this.selectedIcon.set(name);
  }

  confirm(): void {
    this.dialogRef.close(this.selectedIcon());
  }

  clear(): void {
    this.dialogRef.close(null);
  }

  cancel(): void {
    this.dialogRef.close(undefined); // undefined = dismissed sans changement
  }
}
