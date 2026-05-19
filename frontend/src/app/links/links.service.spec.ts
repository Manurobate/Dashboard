import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { LinksService, Link } from './links.service';

const mockLink: Link = {
  id: 1,
  url: 'https://example.com',
  title: 'Example',
  description: null,
  faviconUrl: null,
  position: 0,
  categoryId: 10,
  userId: 42,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('LinksService', () => {
  let service: LinksService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LinksService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('loadLinks()', () => {
    it('met à jour le signal links avec la réponse', () => {
      service.loadLinks().subscribe();
      const req = http.expectOne('/api/links');
      req.flush([mockLink]);
      expect(service.links()).toEqual([mockLink]);
    });

    it('gère les erreurs sans crash (retourne [])', () => {
      service.loadLinks().subscribe();
      const req = http.expectOne('/api/links');
      req.flush('Erreur', { status: 500, statusText: 'Server Error' });
      expect(service.links()).toEqual([]);
    });

    it('active isLoadingLinks pendant la requête', () => {
      service.loadLinks().subscribe();
      expect(service.isLoadingLinks()).toBe(true);
      const req = http.expectOne('/api/links');
      req.flush([]);
      expect(service.isLoadingLinks()).toBe(false);
    });
  });

  describe('createLink()', () => {
    it('POST /api/links avec le payload', () => {
      const payload = { url: 'https://example.com', title: 'Example', categoryId: 10 };
      service.createLink(payload).subscribe();
      const req = http.expectOne('/api/links');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockLink);
    });
  });

  describe('updateLink()', () => {
    it('PATCH /api/links/:id avec le DTO', () => {
      service.updateLink(1, { title: 'Updated' }).subscribe();
      const req = http.expectOne('/api/links/1');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ title: 'Updated' });
      req.flush({ ...mockLink, title: 'Updated' });
    });
  });

  describe('deleteLink()', () => {
    it('DELETE /api/links/:id', () => {
      service.deleteLink(1).subscribe();
      const req = http.expectOne('/api/links/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('reorderLinks()', () => {
    it('PATCH /api/links/reorder avec les items', () => {
      const items = [{ id: 1, position: 0 }];
      service.reorderLinks(items).subscribe();
      const req = http.expectOne('/api/links/reorder');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ items });
      req.flush(null);
    });
  });

  describe('fetchOgPreview()', () => {
    it('GET /api/links/og-preview avec le param url', () => {
      service.fetchOgPreview('https://github.com').subscribe();
      const req = http.expectOne((r) => r.url === '/api/links/og-preview');
      expect(req.request.params.get('url')).toBe('https://github.com');
      req.flush({ title: 'GitHub', faviconUrl: 'https://github.com/favicon.ico' });
    });
  });
});
