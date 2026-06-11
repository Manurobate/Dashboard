import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  RecipesService,
  Recipe,
  RecipeDetail,
  CreateRecipePayload,
  UpdateRecipePayload,
} from './recipes.service';

const mockRecipe: Recipe = {
  id: 1,
  title: 'Tarte aux pommes',
  avantPropos: null,
  category: { id: 10, name: 'Desserts' },
  servings: 4,
  imageUrl: null,
  userId: 42,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockDetail: RecipeDetail = {
  ...mockRecipe,
  ingredients: [{ id: 1, quantity: 2, unit: null, name: 'Pommes', position: 0, recipeId: 1 }],
  steps: [{ id: 1, content: 'Éplucher les pommes', position: 0, recipeId: 1 }],
};

describe('RecipesService', () => {
  let service: RecipesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RecipesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('loadRecipes()', () => {
    it('met à jour le signal recipes avec la réponse', () => {
      service.loadRecipes().subscribe();
      const req = http.expectOne('/api/recipes');
      req.flush([mockRecipe]);
      expect(service.recipes()).toEqual([mockRecipe]);
    });

    it("retourne [] en cas d'erreur HTTP", () => {
      service.loadRecipes().subscribe();
      const req = http.expectOne('/api/recipes');
      req.flush('Erreur', { status: 500, statusText: 'Server Error' });
      expect(service.recipes()).toEqual([]);
    });

    it('active isLoading pendant la requête et le remet à false après', () => {
      service.loadRecipes().subscribe();
      expect(service.isLoading()).toBe(true);
      const req = http.expectOne('/api/recipes');
      req.flush([]);
      expect(service.isLoading()).toBe(false);
    });

    it('ignore un second appel concurrent si le premier est en cours', () => {
      service.loadRecipes().subscribe();
      service.loadRecipes().subscribe();
      http.expectOne('/api/recipes').flush([mockRecipe]);
    });

    it("réinitialise le signal recipes à [] en cas d'erreur HTTP", () => {
      service.loadRecipes().subscribe();
      const req = http.expectOne('/api/recipes');
      req.flush([mockRecipe]);
      expect(service.recipes()).toEqual([mockRecipe]);

      service.loadRecipes().subscribe();
      const req2 = http.expectOne('/api/recipes');
      req2.flush('Erreur', { status: 500, statusText: 'Server Error' });
      expect(service.recipes()).toEqual([]);
    });
  });

  describe('getRecipe()', () => {
    it('appelle GET /api/recipes/:id et retourne le détail', () => {
      let result: RecipeDetail | undefined;
      service.getRecipe(1).subscribe((r) => (result = r));
      const req = http.expectOne('/api/recipes/1');
      expect(req.request.method).toBe('GET');
      req.flush(mockDetail);
      expect(result).toEqual(mockDetail);
    });
  });

  describe('createRecipe()', () => {
    it('appelle POST /api/recipes et met à jour le signal recipes', () => {
      const payload: CreateRecipePayload = {
        title: 'Tarte aux pommes',
        servings: 4,
        ingredients: [],
        steps: [],
      };

      service.createRecipe(payload).subscribe();
      const req = http.expectOne('/api/recipes');
      expect(req.request.method).toBe('POST');
      req.flush(mockDetail);
      expect(service.recipes()).toContainEqual(mockDetail);
    });
  });

  describe('updateRecipe()', () => {
    it('appelle PATCH /api/recipes/:id et met à jour le signal recipes', () => {
      service.recipes.set([mockRecipe]);
      const payload: UpdateRecipePayload = {
        title: 'Tarte modifiée',
        servings: 6,
        ingredients: [],
        steps: [],
      };
      const updated: RecipeDetail = { ...mockDetail, title: 'Tarte modifiée', servings: 6 };

      service.updateRecipe(1, payload).subscribe();
      const req = http.expectOne('/api/recipes/1');
      expect(req.request.method).toBe('PATCH');
      req.flush(updated);

      const found = service.recipes().find((r) => r.id === 1);
      expect(found?.title).toBe('Tarte modifiée');
    });
  });
});
