import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { RecipesService, Recipe } from './recipes.service';

const mockRecipe: Recipe = {
  id: 1,
  title: 'Tarte aux pommes',
  category: 'Desserts',
  servings: 4,
  imageUrl: null,
  userId: 42,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
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

    it('retourne [] en cas d\'erreur HTTP', () => {
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

    it('réinitialise le signal recipes à [] en cas d\'erreur HTTP', () => {
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
});
