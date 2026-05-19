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
import { LinksService, Link } from './links.service';
import {
  CategoryDialogComponent,
  CategoryDialogData,
  CategoryDialogResult,
} from './components/category-dialog/category-dialog.component';
import {
  LinkDialogComponent,
  LinkDialogData,
  LinkDialogResult,
} from './components/link-dialog/link-dialog.component';
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
  protected readonly linksService = inject(LinksService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly editMode = signal(true);
  readonly failedFavicons = signal(new Set<number>());

  onFaviconError(linkId: number): void {
    this.failedFavicons.update((s) => new Set([...s, linkId]));
  }

  ngOnInit(): void {
    this.linkCategoriesService.loadCategories().subscribe();
    this.linksService.loadLinks().subscribe();
  }

  linksForCategory(categoryId: number): Link[] {
    return this.linksService.links().filter((l) => l.categoryId === categoryId);
  }

  openAddLinkDialog(categoryId: number): void {
    const ref = this.dialog.open<LinkDialogComponent, LinkDialogData, LinkDialogResult>(
      LinkDialogComponent,
      { width: '480px', maxWidth: '95vw', data: { categoryId } },
    );
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.linksService.createLink(result).subscribe({
        next: (link) => {
          this.linksService.links.update((links) => [...links, link]);
          this.snackBar.open('Lien ajouté', 'Fermer', { duration: 3000 });
        },
        error: () => this.snackBar.open('Erreur lors de la création', 'Fermer', { duration: 4000 }),
      });
    });
  }

  openEditLinkDialog(link: Link): void {
    const ref = this.dialog.open<LinkDialogComponent, LinkDialogData, LinkDialogResult>(
      LinkDialogComponent,
      { width: '480px', maxWidth: '95vw', data: { link, categoryId: link.categoryId } },
    );
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      const { categoryId: _, ...dto } = result;
      this.linksService.updateLink(link.id, dto).subscribe({
        next: (updated) => {
          this.linksService.links.update((links) =>
            links.map((l) => (l.id === link.id ? updated : l)),
          );
          this.failedFavicons.update((s) => {
            const next = new Set(s);
            next.delete(link.id);
            return next;
          });
          this.snackBar.open('Lien mis à jour', 'Fermer', { duration: 3000 });
        },
        error: () =>
          this.snackBar.open('Erreur lors de la modification', 'Fermer', { duration: 4000 }),
      });
    });
  }

  openDeleteLinkDialog(link: Link): void {
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        width: '400px',
        maxWidth: '95vw',
        data: {
          title: `Supprimer "${link.title}" ?`,
          message: 'Cette action est irréversible.',
          confirmLabel: 'Supprimer',
        },
      },
    );
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.linksService.deleteLink(link.id).subscribe({
        next: () => {
          this.linksService.links.update((links) => links.filter((l) => l.id !== link.id));
          this.snackBar.open('Lien supprimé', 'Fermer', { duration: 3000 });
        },
        error: () =>
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 4000 }),
      });
    });
  }

  dropLink(event: CdkDragDrop<Link[]>, categoryId: number): void {
    if (event.previousIndex === event.currentIndex) return;
    const categoryLinks = [...this.linksForCategory(categoryId)];
    moveItemInArray(categoryLinks, event.previousIndex, event.currentIndex);
    this.linksService.links.update((all) => [
      ...all.filter((l) => l.categoryId !== categoryId),
      ...categoryLinks,
    ]);
    const items = categoryLinks.map((l, i) => ({ id: l.id, position: i }));
    this.linksService.reorderLinks(items).subscribe({
      error: () => {
        this.linksService.loadLinks().subscribe();
        this.snackBar.open('Erreur lors de la réorganisation', 'Fermer', { duration: 3000 });
      },
    });
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
