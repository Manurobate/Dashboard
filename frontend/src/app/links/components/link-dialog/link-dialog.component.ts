import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  signal,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, EMPTY, switchMap, catchError } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Link, LinksService } from '../../links.service';

export interface LinkDialogData {
  link?: Link;
  categoryId: number;
}

export interface LinkDialogResult {
  url: string;
  title: string;
  description?: string | null;
  faviconUrl?: string | null;
  categoryId: number;
}

@Component({
  selector: 'app-link-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './link-dialog.component.html',
  styleUrl: './link-dialog.component.scss',
})
export class LinkDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<LinkDialogComponent>);
  readonly data = inject<LinkDialogData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  private readonly linksService = inject(LinksService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly urlBlur$ = new Subject<string>();

  readonly isEdit = !!this.data?.link;
  readonly isFetchingOg = signal(false);

  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      url: [this.data?.link?.url ?? '', [Validators.required, Validators.maxLength(2048)]],
      title: [this.data?.link?.title ?? '', [Validators.required, Validators.maxLength(255)]],
      description: [this.data?.link?.description ?? '', [Validators.maxLength(1000)]],
      faviconUrl: [this.data?.link?.faviconUrl ?? ''],
    });

    this.urlBlur$
      .pipe(
        switchMap((url) =>
          this.linksService.fetchOgPreview(url).pipe(
            catchError(() => {
              this.isFetchingOg.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((og) => {
        if (og.title && !this.form.get('title')?.dirty) {
          this.form.patchValue({ title: og.title, faviconUrl: og.faviconUrl ?? '' });
        }
        this.isFetchingOg.set(false);
      });
  }

  onUrlBlur(): void {
    const raw = (this.form.get('url')?.value as string)?.trim();
    if (!raw) return;

    const url = this.normalizeUrl(raw);
    if (url !== raw) {
      this.form.get('url')?.setValue(url, { emitEvent: false });
    }

    if (this.isEdit) return;

    try {
      new URL(url);
    } catch {
      return;
    }

    this.isFetchingOg.set(true);
    this.urlBlur$.next(url);
  }

  confirm(): void {
    if (this.form.invalid) return;
    const { url, title, description, faviconUrl } = this.form.value as Record<string, string>;
    this.dialogRef.close({
      url: this.normalizeUrl(url.trim()),
      title: title.trim(),
      description: description?.trim() || null,
      faviconUrl: faviconUrl?.trim() || null,
      categoryId: this.data.categoryId,
    });
  }

  private normalizeUrl(url: string): string {
    if (!url || url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
