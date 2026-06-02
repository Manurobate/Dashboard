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
import { RecipesService, RecipeDetail } from '../recipes.service';
import { ConvivesSteppperComponent } from './convives-steppper.component';

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
    ConvivesSteppperComponent,
  ],
  templateUrl: './recipe-detail.component.html',
  styleUrls: ['./recipe-detail.component.scss'],
})
export class RecipeDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recipesService = inject(RecipesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly recipeId: number = (() => {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return isNaN(id) ? -1 : id;
  })();

  readonly recipe = signal<RecipeDetail | null>(null);
  readonly isLoading = signal(true);
  readonly currentServings = signal(1);

  readonly computedIngredients = computed(() => {
    const recipe = this.recipe();
    const servings = this.currentServings();
    if (!recipe || !servings || !recipe.servings) return [];
    return recipe.ingredients.map((ing) => ({
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
  }

  onServingsChange(value: number): void {
    this.currentServings.set(value);
  }
}
