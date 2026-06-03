import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';
import { RouterModule } from '@angular/router';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RecipesService, Recipe } from './recipes.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-recipes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './recipes.component.html',
  styleUrl: './recipes.component.scss',
})
export class RecipesComponent implements OnInit {
  protected readonly recipesService = inject(RecipesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly searchSubject = new Subject<string>();

  readonly searchQuery = signal('');

  readonly categorizedRecipes = computed(() => {
    const map = new Map<string, ReturnType<typeof this.recipesService.recipes>[number][]>();
    for (const r of this.recipesService.recipes()) {
      const key = r.category ?? 'Sans catégorie';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'fr'))
      .map(([category, recipes]) => ({ category, recipes }));
  });

  readonly filteredRecipes = computed(() => {
    const term = this.searchQuery().toLowerCase().trim();
    if (!term) return [];
    return this.recipesService
      .recipes()
      .filter(
        (r) =>
          r.title.toLowerCase().includes(term) || (r.category ?? '').toLowerCase().includes(term),
      );
  });

  readonly isSearching = computed(() => this.searchQuery().trim().length > 0);

  constructor() {
    this.searchSubject
      .pipe(debounceTime(200), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => this.searchQuery.set(term));
  }

  ngOnInit(): void {
    this.recipesService.loadRecipes().subscribe();
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchSubject.next('');
  }

  onDeleteRecipe(recipe: Recipe, event: Event): void {
    event.stopPropagation();
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: `Supprimer « ${recipe.title} » ?`,
        message: 'Cette action est irréversible.',
        confirmLabel: 'Supprimer',
      } satisfies ConfirmDialogData,
    });
    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.recipesService
          .deleteRecipe(recipe.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.snackBar.open('Recette supprimée', undefined, { duration: 3000 }),
            error: () =>
              this.snackBar.open('Erreur lors de la suppression', undefined, { duration: 3000 }),
          });
      });
  }
}
