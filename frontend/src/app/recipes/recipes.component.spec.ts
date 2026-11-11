import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of } from 'rxjs';
import { RecipesComponent } from './recipes.component';
import { RecipesService, Recipe } from './recipes.service';

const recipe = (
  id: number,
  title: string,
  category: string | null,
  imageUrl: string | null = null,
): Recipe => ({
  id,
  title,
  avantPropos: null,
  category: category ? { id: id * 10, name: category } : null,
  servings: 4,
  imageUrl,
  userId: 1,
  createdAt: '',
  updatedAt: '',
});

describe('RecipesComponent', () => {
  async function setup(recipes: Recipe[], isLoading = false) {
    const service = {
      recipes: signal(recipes),
      isLoading: signal(isLoading),
      loadRecipes: vi.fn().mockReturnValue(of(recipes)),
    };
    await TestBed.configureTestingModule({
      imports: [RecipesComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        { provide: RecipesService, useValue: service },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(RecipesComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, component: fixture.componentInstance, el };
  }

  it('place la recherche et « Nouvelle recette » sur la même ligne (maquette 05)', async () => {
    const { el } = await setup([recipe(1, 'Risotto', 'Plats')]);
    const actions = el.querySelector('.page-actions')!;
    expect(actions.querySelector('input[aria-label="Rechercher une recette"]')).toBeTruthy();
    expect(actions.querySelector('.new-recipe-btn')?.textContent).toContain('Nouvelle recette');
  });

  it('affiche des squelettes Ember pendant le chargement', async () => {
    const { el } = await setup([], true);
    const list = el.querySelector('.skeleton-list')!;
    expect(list.getAttribute('aria-busy')).toBe('true');
    expect(list.querySelectorAll('.skeleton-card')).toHaveLength(3);
  });

  it("affiche l'état vide avec « Ajouter une recette » (maquette 26)", async () => {
    const { el } = await setup([]);
    expect(el.querySelector('.empty-message')?.textContent).toContain('Aucune recette enregistrée');
    expect(el.querySelector('.empty-cta')?.textContent).toContain('Ajouter une recette');
    expect(el.querySelector('.page-actions .new-recipe-btn')).toBeTruthy();
  });

  it('affiche « Aucun résultat » et le bouton effacer pour une recherche vide (maquette 27)', async () => {
    const { fixture, component, el } = await setup([recipe(1, 'Risotto', 'Plats')]);
    component.searchQuery.set('auj');
    fixture.detectChanges();
    expect(el.querySelector('.no-results')?.textContent).toContain('Aucun résultat pour « auj »');
    expect(el.querySelector('button[aria-label="Effacer la recherche"]')).toBeTruthy();
  });

  it('accorde le compteur de recettes (1 recette, N recettes)', async () => {
    const { el } = await setup([
      recipe(1, 'Risotto', 'Plats'),
      recipe(2, 'Caramel', 'Sauce'),
      recipe(3, 'Mayonnaise', 'Sauce'),
    ]);
    const counts = Array.from(el.querySelectorAll('.category-count')).map((c) =>
      c.textContent?.trim(),
    );
    expect(counts).toEqual(['1 recette', '2 recettes']);
    expect(el.querySelector('mat-panel-title')?.textContent).toContain('Plats');
  });

  it('range une recette sans catégorie dans le groupe « Sans catégorie »', async () => {
    const { el } = await setup([recipe(1, 'Pâtes', null)]);
    expect(el.querySelector('mat-panel-title .category-name')?.textContent).toBe('Sans catégorie');
  });

  it("affiche la miniature de la photo, ou l'icône générique sans photo", async () => {
    const { el } = await setup([
      recipe(1, 'Risotto', 'Plats', 'https://example.com/risotto.jpg'),
      recipe(2, 'Caramel', 'Plats'),
    ]);
    const tiles = el.querySelectorAll('.recipe-item .recipe-tile');
    const thumb = tiles[0].querySelector('img.recipe-thumb') as HTMLImageElement;
    expect(thumb.getAttribute('src')).toBe('https://example.com/risotto.jpg');
    expect(thumb.getAttribute('alt')).toBe('');
    expect(thumb.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(tiles[1].querySelector('img')).toBeNull();
    expect(tiles[1].querySelector('mat-icon')?.textContent).toContain('restaurant');
  });

  it("repasse sur l'icône générique si la photo ne charge pas", async () => {
    const { fixture, el } = await setup([
      recipe(1, 'Brioche', 'Pain', 'https://example.com/404.jpg'),
    ]);
    el.querySelector('img.recipe-thumb')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    const tile = el.querySelector('.recipe-item .recipe-tile')!;
    expect(tile.querySelector('img')).toBeNull();
    expect(tile.querySelector('mat-icon')?.textContent).toContain('restaurant');
  });

  it('filtre à la saisie (debounce 200ms) puis revient aux groupes avec « Effacer »', async () => {
    vi.useFakeTimers();
    try {
      const { fixture, el } = await setup([
        recipe(1, 'Caramel', 'Sauce'),
        recipe(2, 'Risotto', 'Plats'),
      ]);
      const input = el.querySelector('.search-input') as HTMLInputElement;
      input.value = 'cara';
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(200);
      fixture.detectChanges();
      const titles = Array.from(el.querySelectorAll('.results-card .recipe-title')).map(
        (t) => t.textContent,
      );
      expect(titles).toEqual(['Caramel']);

      (el.querySelector('button[aria-label="Effacer la recherche"]') as HTMLButtonElement).click();
      vi.advanceTimersByTime(200);
      fixture.detectChanges();
      expect(el.querySelector('.results-card')).toBeNull();
      expect(el.querySelectorAll('mat-expansion-panel')).toHaveLength(2);
      expect((el.querySelector('.search-input') as HTMLInputElement).value).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('bascule le chevron du groupe au repli et au dépli', async () => {
    const { fixture, el } = await setup([recipe(1, 'Risotto', 'Plats')]);
    const chevron = () => el.querySelector('.group-chevron')?.textContent?.trim();
    expect(chevron()).toBe('expand_less');
    const header = el.querySelector('mat-expansion-panel-header') as HTMLElement;
    header.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(chevron()).toBe('expand_more');
    header.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(chevron()).toBe('expand_less');
  });

  it('garde la pastille de catégorie dans les résultats de recherche', async () => {
    const { fixture, component, el } = await setup([recipe(1, 'Caramel', 'Sauce')]);
    component.searchQuery.set('cara');
    fixture.detectChanges();
    expect(el.querySelector('.results-card .recipe-title')?.textContent).toContain('Caramel');
    expect(el.querySelector('.results-card .recipe-category-badge')?.textContent).toContain(
      'Sauce',
    );
  });
});
