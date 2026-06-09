import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormArray,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { finalize, forkJoin, catchError, of } from 'rxjs';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { RecipesService, RecipeIngredientItem, RecipeStepItem, RecipeCategory } from '../recipes.service';
import { RecipeIngredientRowComponent } from './recipe-ingredient-row.component';
import { MarkdownLightEditorComponent } from './markdown-light-editor.component';

@Component({
  selector: 'app-recipe-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DragDropModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    RecipeIngredientRowComponent,
    MarkdownLightEditorComponent,
  ],
  templateUrl: './recipe-editor.component.html',
  styleUrls: ['./recipe-editor.component.scss'],
})
export class RecipeEditorComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly recipesService = inject(RecipesService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly categories = signal<RecipeCategory[]>([]);
  readonly categoryQuery = signal('');
  readonly filteredCategories = computed(() => {
    const q = this.categoryQuery().toLowerCase();
    if (!q) return this.categories();
    return this.categories().filter((c) => c.name.toLowerCase().includes(q));
  });

  readonly ingredientSuggestions = signal<string[]>([]);
  readonly unitSuggestions = signal<string[]>([]);

  readonly recipeId: number | null = (() => {
    const id = this.route.snapshot.paramMap.get('id');
    const parsed = id ? Number(id) : null;
    return parsed !== null && !isNaN(parsed) ? parsed : null;
  })();
  readonly isEditMode = signal(this.recipeId !== null);
  readonly isSubmitting = signal(false);
  readonly isLoading = signal(false);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    category: ['', [Validators.required, Validators.maxLength(100)]],
    servings: [4, [Validators.required, Validators.min(1)]],
    imageUrl: [''],
    ingredients: this.fb.array<FormGroup>([]),
    steps: this.fb.array<FormGroup>([]),
  });

  get ingredients(): FormArray {
    return this.form.get('ingredients') as FormArray;
  }

  get steps(): FormArray {
    return this.form.get('steps') as FormArray;
  }

  private createIngredientGroup(data?: Partial<RecipeIngredientItem>): FormGroup {
    return this.fb.nonNullable.group({
      quantity: [data?.quantity ?? null, [Validators.required, Validators.min(0.001)]],
      unit: [data?.unit ?? ''],
      name: [data?.name ?? '', [Validators.required, Validators.maxLength(255)]],
    });
  }

  private createStepGroup(data?: Partial<RecipeStepItem>): FormGroup {
    return this.fb.nonNullable.group({
      content: [data?.content ?? '', Validators.required],
    });
  }

  ngOnInit(): void {
    forkJoin({
      cats: this.recipesService.getCategories().pipe(catchError(() => of([]))),
      ings: this.recipesService.getIngredientSuggestions().pipe(catchError(() => of([]))),
      units: this.recipesService.getUnitSuggestions().pipe(catchError(() => of([]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ cats, ings, units }) => {
        this.categories.set(cats);
        this.ingredientSuggestions.set(ings);
        this.unitSuggestions.set(units);
      });

    if (!this.isEditMode()) {
      for (let i = 0; i < 3; i++) this.ingredients.push(this.createIngredientGroup());
      this.steps.push(this.createStepGroup());
      return;
    }

    if (this.isEditMode() && this.recipeId) {
      this.isLoading.set(true);
      this.recipesService
        .getRecipe(this.recipeId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (recipe) => {
            this.form.patchValue({
              title: recipe.title,
              category: recipe.category?.name ?? '',
              servings: recipe.servings,
              imageUrl: recipe.imageUrl ?? '',
            });
            recipe.ingredients.forEach((ing) =>
              this.ingredients.push(this.createIngredientGroup(ing)),
            );
            recipe.steps.forEach((step) => this.steps.push(this.createStepGroup(step)));
            this.isLoading.set(false);
          },
          error: () => {
            this.snackBar.open('Erreur lors du chargement de la recette', 'Fermer', {
              duration: 3000,
            });
            this.isLoading.set(false);
            this.router.navigate(['/recipes']);
          },
        });
    }
  }

  addIngredient(): void {
    this.ingredients.push(this.createIngredientGroup());
  }

  removeIngredient(i: number): void {
    this.ingredients.removeAt(i);
  }

  addStep(): void {
    this.steps.push(this.createStepGroup());
  }

  removeStep(i: number): void {
    this.steps.removeAt(i);
  }

  dropIngredient(event: CdkDragDrop<AbstractControl[]>): void {
    moveItemInArray(this.ingredients.controls, event.previousIndex, event.currentIndex);
    this.ingredients.updateValueAndValidity();
  }

  dropStep(event: CdkDragDrop<AbstractControl[]>): void {
    moveItemInArray(this.steps.controls, event.previousIndex, event.currentIndex);
    this.steps.updateValueAndValidity();
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    const raw = this.form.getRawValue();
    const payload = {
      title: raw.title,
      categoryName: raw.category,
      servings: raw.servings,
      imageUrl: raw.imageUrl || null,
      ingredients: (
        raw.ingredients as Array<{ quantity: unknown; unit: string; name: string }>
      ).map((ing, i) => ({
        quantity: Number(ing.quantity),
        unit: ing.unit || null,
        name: ing.name,
        position: i,
      })),
      steps: (raw.steps as Array<{ content: string }>).map((s, i) => ({
        content: s.content,
        position: i,
      })),
    };

    const request$ =
      this.isEditMode() && this.recipeId
        ? this.recipesService.updateRecipe(this.recipeId, payload)
        : this.recipesService.createRecipe(payload);

    request$.pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
      next: (recipe) => {
        const msg = this.isEditMode() ? 'Recette modifiée' : 'Recette créée';
        this.snackBar.open(msg, 'Fermer', { duration: 3000 });
        this.router.navigate(['/recipes', recipe.id]);
      },
      error: () => {
        this.snackBar.open("Erreur lors de l'enregistrement", 'Fermer', { duration: 3000 });
      },
    });
  }
}
