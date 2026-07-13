import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SharingService, PublicShareToken } from './sharing.service';

const mockToken: PublicShareToken = {
  id: 100,
  token: 'abc123',
  resourceType: 'recipe',
  resourceId: 1,
  userId: 42,
  expiresAt: '2026-08-01T00:00:00.000Z',
  createdAt: '2026-07-13T00:00:00.000Z',
  revokedAt: null,
};

describe('SharingService', () => {
  let service: SharingService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SharingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('findActiveForResource()', () => {
    it('appelle GET /api/sharing avec les query params resourceType et resourceId', () => {
      let result: PublicShareToken[] | undefined;
      service.findActiveForResource('recipe', 1).subscribe((r) => (result = r));
      const req = http.expectOne(
        (r) =>
          r.url === '/api/sharing' &&
          r.params.get('resourceType') === 'recipe' &&
          r.params.get('resourceId') === '1',
      );
      expect(req.request.method).toBe('GET');
      req.flush([mockToken]);
      expect(result).toEqual([mockToken]);
    });
  });

  describe('createShareLink()', () => {
    it('appelle POST /api/sharing avec le payload', () => {
      let result: PublicShareToken | undefined;
      service.createShareLink('recipe', 1, '7d').subscribe((r) => (result = r));
      const req = http.expectOne('/api/sharing');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ resourceType: 'recipe', resourceId: 1, expiresIn: '7d' });
      req.flush(mockToken);
      expect(result).toEqual(mockToken);
    });
  });

  describe('revokeShareLink()', () => {
    it('appelle PATCH /api/sharing/:id/revoke', () => {
      service.revokeShareLink(100).subscribe();
      const req = http.expectOne('/api/sharing/100/revoke');
      expect(req.request.method).toBe('PATCH');
      req.flush({ ...mockToken, revokedAt: '2026-07-13T12:00:00.000Z' });
    });
  });

  describe('buildShareUrl()', () => {
    it("compose l'URL publique à partir de window.location.origin", () => {
      expect(service.buildShareUrl('abc123')).toBe(`${window.location.origin}/share/abc123`);
    });
  });
});
