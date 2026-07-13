import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RecipesService, RecipeDetail } from '../recipes.service';
import { ConvivesSteppperComponent } from './convives-steppper.component';
import { MarkdownLightPipe } from './markdown-light.pipe';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  ShareLinkDialogComponent,
  ShareLinkDialogData,
} from '../../shared/components/share-link-dialog/share-link-dialog.component';
import { SharingService } from '../../shared/services/sharing.service';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    ConvivesSteppperComponent,
    MarkdownLightPipe,
  ],
  templateUrl: './recipe-detail.component.html',
  styleUrls: ['./recipe-detail.component.scss'],
})
export class RecipeDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recipesService = inject(RecipesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly sharingService = inject(SharingService);

  readonly recipeId: number = (() => {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return isNaN(id) ? -1 : id;
  })();

  readonly recipe = signal<RecipeDetail | null>(null);
  readonly isLoading = signal(true);
  readonly currentServings = signal(1);
  readonly hasActiveShare = signal(false);

  readonly computedIngredients = computed(() => {
    const recipe = this.recipe();
    const servings = this.currentServings();
    if (!recipe || !servings || !recipe.servings) return [];
    return (recipe.ingredients ?? []).map((ing) => ({
      ...ing,
      quantity: (ing.quantity * servings) / recipe.servings,
    }));
  });

  ngOnInit(): void {
    if (this.recipeId === -1) {
      this.isLoading.set(false);
      this.router.navigate(['/recipes']);
      return;
    }
    this.recipesService
      .getRecipe(this.recipeId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (recipe) => {
          this.recipe.set(recipe);
          this.currentServings.set(recipe.servings);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.router.navigate(['/recipes']);
        },
      });
    this.refreshShareStatus();
  }

  onServingsChange(value: number): void {
    this.currentServings.set(value);
  }

  private refreshShareStatus(): void {
    this.sharingService
      .findActiveForResource('recipe', this.recipeId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tokens) => this.hasActiveShare.set(tokens.length > 0),
        error: () => {},
      });
  }

  onShare(): void {
    const recipe = this.recipe();
    if (!recipe) return;
    const ref = this.dialog.open(ShareLinkDialogComponent, {
      data: {
        resourceType: 'recipe',
        resourceId: recipe.id,
        resourceLabel: recipe.title,
      } satisfies ShareLinkDialogData,
    });
    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshShareStatus());
  }

  onDelete(): void {
    const recipe = this.recipe();
    if (!recipe) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: `Supprimer « ${recipe.title} » ?`,
        message:
          'Cette action est irréversible. La recette et tous ses ingrédients et étapes seront supprimés.',
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
            next: () => {
              this.snackBar.open('Recette supprimée', undefined, { duration: 3000 });
              this.router.navigate(['/recipes']);
            },
            error: () => {
              this.snackBar.open('Erreur lors de la suppression', undefined, { duration: 3000 });
            },
          });
      });
  }
}
