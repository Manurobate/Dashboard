import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TriliumService } from './trilium.service';

describe('TriliumService', () => {
  let service: TriliumService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TriliumService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('ping()', () => {
    it('GET /api/trilium/ping avec le param url', () => {
      service.ping('https://trilium.example.fr').subscribe();
      const req = http.expectOne((r) => r.url === '/api/trilium/ping');
      expect(req.request.params.get('url')).toBe('https://trilium.example.fr');
      req.flush({ reachable: true });
    });

    it('retourne reachable:false avec reason', () => {
      let result: { reachable: boolean; reason?: string } | undefined;
      service.ping('https://unreachable.example.com').subscribe((res) => (result = res));
      const req = http.expectOne((r) => r.url === '/api/trilium/ping');
      req.flush({ reachable: false, reason: 'fetch failed' });
      expect(result).toEqual({ reachable: false, reason: 'fetch failed' });
    });
  });
});
