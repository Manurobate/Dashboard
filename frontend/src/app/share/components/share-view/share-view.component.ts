import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DOCUMENT, DecimalPipe } from '@angular/common';
import { Meta } from '@angular/platform-browser';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SharingService, PublicRecipeView } from '../../../shared/services/sharing.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ConvivesSteppperComponent } from '../../../recipes/recipe-detail/convives-steppper.component';
import { MarkdownLightPipe } from '../../../recipes/recipe-detail/markdown-light.pipe';

@Component({
  selector: 'app-share-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, MatProgressSpinnerModule, ConvivesSteppperComponent, MarkdownLightPipe],
  templateUrl: './share-view.component.html',
  styleUrls: ['./share-view.component.scss'],
})
export class ShareViewComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly sharingService = inject(SharingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly themeService = inject(ThemeService);

  readonly isLoading = signal(true);
  readonly recipe = signal<PublicRecipeView | null>(null);
  readonly hasError = signal(false);
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

  constructor() {
    this.meta.addTag({ name: 'robots', content: 'noindex' });
    this.doc.body.classList.remove('dark-theme');
  }

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.isLoading.set(false);
      this.hasError.set(true);
      return;
    }
    this.sharingService
      .getPublicRecipe(token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (recipe) => {
          this.recipe.set(recipe);
          this.currentServings.set(recipe.servings);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.hasError.set(true);
        },
      });
  }

  onServingsChange(value: number): void {
    this.currentServings.set(value);
  }

  ngOnDestroy(): void {
    this.meta.removeTag("name='robots'");
    this.doc.body.classList.toggle('dark-theme', this.themeService.isDark());
  }
}
