import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  LinkCategoriesService,
  LinkCategory,
} from './link-categories.service';
import {
  CategoryDialogComponent,
  CategoryDialogData,
  CategoryDialogResult,
} from './components/category-dialog/category-dialog.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-links',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DragDropModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './links.component.html',
  styleUrl: './links.component.scss',
})
export class LinksComponent implements OnInit {
  protected readonly linkCategoriesService = inject(LinkCategoriesService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly editMode = signal(true);

  ngOnInit(): void {
    this.linkCategoriesService.loadCategories().subscribe();
  }

  openAddCategoryDialog(): void {
    const ref = this.dialog.open<CategoryDialogComponent, CategoryDialogData, CategoryDialogResult>(
      CategoryDialogComponent,
      { width: '400px', maxWidth: '95vw', data: {} },
    );
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.linkCategoriesService.createCategory(result.name, result.emoji).subscribe({
        next: () => {
          this.linkCategoriesService.loadCategories().subscribe();
          this.snackBar.open('Catégorie ajoutée', 'Fermer', { duration: 3000 });
        },
        error: () => this.snackBar.open('Erreur lors de la création', 'Fermer', { duration: 4000 }),
      });
    });
  }

  openEditCategoryDialog(cat: LinkCategory): void {
    const ref = this.dialog.open<CategoryDialogComponent, CategoryDialogData, CategoryDialogResult>(
      CategoryDialogComponent,
      { width: '400px', maxWidth: '95vw', data: { category: cat } },
    );
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.linkCategoriesService.updateCategory(cat.id, result.name, result.emoji).subscribe({
        next: (updated) => {
          this.linkCategoriesService.categories.update((cats) =>
            cats.map((c) => (c.id === cat.id ? updated : c)),
          );
          this.snackBar.open('Catégorie mise à jour', 'Fermer', { duration: 3000 });
        },
        error: () =>
          this.snackBar.open('Erreur lors de la modification', 'Fermer', { duration: 4000 }),
      });
    });
  }

  openDeleteDialog(cat: LinkCategory): void {
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        width: '400px',
        maxWidth: '95vw',
        data: {
          title: `Supprimer "${cat.name}" ?`,
          message: 'Cette action est irréversible. Tous les liens de cette catégorie seront supprimés.',
          confirmLabel: 'Supprimer',
        },
      },
    );
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.linkCategoriesService.deleteCategory(cat.id).subscribe({
        next: () => {
          this.linkCategoriesService.categories.update((cats) =>
            cats.filter((c) => c.id !== cat.id),
          );
          this.snackBar.open('Catégorie supprimée', 'Fermer', { duration: 3000 });
        },
        error: () =>
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 4000 }),
      });
    });
  }

  drop(event: CdkDragDrop<LinkCategory[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const cats = [...this.linkCategoriesService.categories()];
    moveItemInArray(cats, event.previousIndex, event.currentIndex);
    this.linkCategoriesService.categories.set(cats);

    const items = cats.map((c, i) => ({ id: c.id, position: i }));
    this.linkCategoriesService.reorderCategories(items).subscribe({
      error: () => {
        this.linkCategoriesService.loadCategories().subscribe();
        this.snackBar.open('Erreur lors de la réorganisation', 'Fermer', { duration: 3000 });
      },
    });
  }
}
