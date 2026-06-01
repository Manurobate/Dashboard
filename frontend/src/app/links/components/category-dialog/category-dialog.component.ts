import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  signal,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
  MatDialog,
} from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LinkCategory } from '../../link-categories.service';
import {
  MaterialIconPickerComponent,
  IconPickerDialogData,
} from '../../../shared/components/material-icon-picker/material-icon-picker.component';

export interface CategoryDialogData {
  category?: LinkCategory;
}

export interface CategoryDialogResult {
  name: string;
  icon?: string | null;
}

@Component({
  selector: 'app-category-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './category-dialog.component.html',
  styleUrl: './category-dialog.component.scss',
})
export class CategoryDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<CategoryDialogComponent>);
  readonly data = inject<CategoryDialogData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly isEdit = !!this.data?.category;
  readonly selectedIcon = signal<string | null>(null);

  private iconPickerOpen = false;

  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [this.data?.category?.name ?? '', [Validators.required, Validators.maxLength(255)]],
    });
    this.selectedIcon.set(this.data?.category?.icon ?? null);
  }

  openIconPicker(): void {
    if (this.iconPickerOpen) return; // guard double-clic
    this.iconPickerOpen = true;
    const ref = this.dialog.open<
      MaterialIconPickerComponent,
      IconPickerDialogData,
      string | null | undefined
    >(MaterialIconPickerComponent, {
      width: '520px',
      maxWidth: '95vw',
      data: { currentIcon: this.selectedIcon() },
    });
    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.iconPickerOpen = false;
        if (result === undefined) return; // dismissed sans changement
        this.selectedIcon.set(result); // null = effacé, string = nouvelle icône
      });
  }

  confirm(): void {
    if (this.form.invalid) return;
    const { name } = this.form.value as { name: string };
    this.dialogRef.close({ name: name.trim(), icon: this.selectedIcon() });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
