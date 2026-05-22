import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { LinkCategoriesService, LinkCategory } from './link-categories.service';

const mockCat: LinkCategory = {
  id: 1,
  name: 'Dev',
  icon: null,
  position: 0,
  userId: 42,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('LinkCategoriesService', () => {
  let service: LinkCategoriesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LinkCategoriesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('loadCategories()', () => {
    it('charge les catégories et met à jour le signal', () => {
      service.loadCategories().subscribe();
      const req = httpMock.expectOne('/api/link-categories');
      expect(req.request.method).toBe('GET');
      req.flush([mockCat]);
      expect(service.categories()).toEqual([mockCat]);
      expect(service.isLoading()).toBe(false);
    });

    it('met isLoading à true pendant la requête', () => {
      service.loadCategories().subscribe();
      expect(service.isLoading()).toBe(true);
      httpMock.expectOne('/api/link-categories').flush([]);
    });

    it('met error si la requête échoue', () => {
      service.loadCategories().subscribe();
      httpMock.expectOne('/api/link-categories').flush(null, { status: 500, statusText: 'Server Error' });
      expect(service.error()).toBe('Impossible de charger les catégories.');
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('createCategory()', () => {
    it('envoie POST /api/link-categories avec name et icon', () => {
      service.createCategory('Dev', 'home').subscribe();
      const req = httpMock.expectOne('/api/link-categories');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ name: 'Dev', icon: 'home' });
      req.flush(mockCat);
    });

    it('envoie POST sans icon si non fourni', () => {
      service.createCategory('Dev').subscribe();
      const req = httpMock.expectOne('/api/link-categories');
      expect(req.request.body).toEqual({ name: 'Dev', icon: undefined });
      req.flush(mockCat);
    });
  });

  describe('updateCategory()', () => {
    it('envoie PATCH /api/link-categories/:id', () => {
      service.updateCategory(1, 'Nouveau', 'star').subscribe();
      const req = httpMock.expectOne('/api/link-categories/1');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ name: 'Nouveau', icon: 'star' });
      req.flush({ ...mockCat, name: 'Nouveau' });
    });
  });

  describe('deleteCategory()', () => {
    it('envoie DELETE /api/link-categories/:id', () => {
      service.deleteCategory(1).subscribe();
      const req = httpMock.expectOne('/api/link-categories/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('reorderCategories()', () => {
    it('envoie PATCH /api/link-categories/reorder avec items', () => {
      const items = [{ id: 1, position: 0 }, { id: 2, position: 1 }];
      service.reorderCategories(items).subscribe();
      const req = httpMock.expectOne('/api/link-categories/reorder');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ items });
      req.flush(null);
    });
  });
});
