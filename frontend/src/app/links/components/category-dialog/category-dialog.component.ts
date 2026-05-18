import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { LinkCategory } from '../../link-categories.service';

export interface CategoryDialogData {
  category?: LinkCategory;
}

export interface CategoryDialogResult {
  name: string;
  emoji?: string | null;
}

@Component({
  selector: 'app-category-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './category-dialog.component.html',
  styleUrl: './category-dialog.component.scss',
})
export class CategoryDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<CategoryDialogComponent>);
  readonly data = inject<CategoryDialogData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly isEdit = !!this.data?.category;

  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [
        this.data?.category?.name ?? '',
        [Validators.required, Validators.maxLength(255)],
      ],
      emoji: [
        this.data?.category?.emoji ?? '',
        [Validators.maxLength(10)],
      ],
    });
  }

  confirm(): void {
    if (this.form.invalid) return;
    const { name, emoji } = this.form.value as { name: string; emoji: string };
    const trimmedEmoji = emoji?.trim() || null;
    this.dialogRef.close({ name: name.trim(), emoji: trimmedEmoji });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
