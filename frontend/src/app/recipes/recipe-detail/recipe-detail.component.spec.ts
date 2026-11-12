import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { of } from 'rxjs';
import { RecipeDetailComponent } from './recipe-detail.component';
import { RecipesService, RecipeDetail } from '../recipes.service';
import { SharingService } from '../../shared/services/sharing.service';

registerLocaleData(localeFr);

const detail = (overrides: Partial<RecipeDetail> = {}): RecipeDetail => ({
  id: 1,
  title: 'Risotto aux champignons',
  avantPropos: 'Un risotto **crémeux**.',
  category: { id: 1, name: 'Plats' },
  servings: 4,
  imageUrl: null,
  userId: 1,
  createdAt: '',
  updatedAt: '',
  ingredients: [
    { id: 1, quantity: 300, unit: 'g', name: 'Riz arborio', position: 0, recipeId: 1 },
    { id: 2, quantity: 1, unit: null, name: 'Oignon', position: 1, recipeId: 1 },
  ],
  steps: [{ id: 1, content: 'Faites revenir.', position: 0, recipeId: 1 }],
  ...overrides,
});

describe('RecipeDetailComponent', () => {
  async function setup(recipe: RecipeDetail, shares: unknown[] = []) {
    await TestBed.configureTestingModule({
      imports: [RecipeDetailComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } },
        },
        { provide: RecipesService, useValue: { getRecipe: vi.fn().mockReturnValue(of(recipe)) } },
        {
          provide: SharingService,
          useValue: { findActiveForResource: vi.fn().mockReturnValue(of(shares)) },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(RecipeDetailComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('affiche le retour, le titre et les actions Partager, Modifier, Supprimer', async () => {
    const { el } = await setup(detail());
    expect(el.querySelector('a.back-link')?.textContent).toContain('Toutes les recettes');
    expect(el.querySelector('h1.recipe-title')?.textContent).toContain('Risotto aux champignons');
    expect(el.querySelector('button[aria-label="Partager la recette"]')?.textContent).toContain(
      'Partager',
    );
    expect(el.querySelector('[aria-label="Modifier la recette"].square-btn')).toBeTruthy();
    const del = el.querySelector('button[aria-label="Supprimer la recette"]')!;
    expect(del.classList).toContain('delete-btn');
    expect(del.getAttribute('color')).toBeNull();
  });

  it('affiche la pastille de catégorie, et « Partagé » seulement si un lien est actif', async () => {
    const { el } = await setup(detail());
    expect(el.querySelector('.ember-chip-primary')?.textContent).toContain('Plats');
    expect(el.querySelector('.share-badge')).toBeNull();
    TestBed.resetTestingModule();
    const shared = await setup(detail(), [{ id: 1 }]);
    expect(shared.el.querySelector('.share-badge')?.textContent).toContain('Partagé');
  });

  it('n’affiche pas de rangée de pastilles sans catégorie ni partage', async () => {
    const { el } = await setup(detail({ category: null }));
    expect(el.querySelector('.meta-chips')).toBeNull();
  });

  it('recalcule les quantités et le libellé « Pour N personnes » avec le stepper', async () => {
    const { fixture, el } = await setup(detail());
    expect(el.querySelector('.servings-count')?.textContent).toBe('4');
    expect(el.querySelector('.ingredient-item .quantity')?.textContent).toBe('300');
    (
      el.querySelector('button[aria-label="Réduire le nombre de convives"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(el.querySelector('.servings-count')?.textContent).toBe('3');
    expect(el.querySelector('.ingredient-item .quantity')?.textContent).toBe('225');
  });

  it('accorde « personne » au singulier', async () => {
    const { el } = await setup(detail({ servings: 1 }));
    expect(el.querySelector('.servings-label')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Pour 1 personne',
    );
  });

  it('numérote les étapes et titre la colonne « Préparation »', async () => {
    const { el } = await setup(detail());
    const titles = Array.from(el.querySelectorAll('.section-title')).map((t) =>
      t.textContent?.trim(),
    );
    expect(titles).toEqual(['Ingrédients', 'Préparation']);
    expect(el.querySelector('.step-item .step-number')?.textContent).toBe('1');
  });
});
