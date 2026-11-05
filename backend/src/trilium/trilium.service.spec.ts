import { Test } from '@nestjs/testing';
import { TriliumService } from './trilium.service';

describe('TriliumService', () => {
  let service: TriliumService;
  const mockFetch = jest.fn();

  beforeEach(async () => {
    globalThis.fetch = mockFetch;
    mockFetch.mockReset();
    const module = await Test.createTestingModule({
      providers: [TriliumService],
    }).compile();
    service = module.get(TriliumService);
  });

  it('devrait retourner reachable:true pour une réponse HTTP quelconque', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
    const result = await service.ping('https://trilium.example.fr');
    expect(result).toEqual({ reachable: true });
  });

  it('devrait retourner reachable:true même pour un status 404/500 (une réponse reçue = accessible)', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    const result = await service.ping('https://trilium.example.fr');
    expect(result).toEqual({ reachable: true });
  });

  it('devrait retourner reachable:false avec un reason sur échec réseau', async () => {
    mockFetch.mockRejectedValue(new Error('network error'));
    const result = await service.ping('https://unreachable.example.com');
    expect(result.reachable).toBe(false);
    expect(result.reason).toContain('network error');
  });

  it('devrait retourner reachable:true pour un status 500', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    const result = await service.ping('https://trilium.example.fr');
    expect(result).toEqual({ reachable: true });
  });

  it('devrait effectuer une requête HEAD avec le signal AbortController', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
    await service.ping('https://trilium.example.fr');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://trilium.example.fr',
      expect.objectContaining({
        method: 'HEAD',
        redirect: 'follow',
        signal: expect.any(AbortSignal),
      }),
    );
  });

  describe('timeout', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('abandonne la requête après 5 s et retourne reachable:false', async () => {
      mockFetch.mockImplementation(
        (_url: string, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () =>
              reject(
                new DOMException('This operation was aborted', 'AbortError'),
              ),
            );
          }),
      );

      const promise = service.ping('https://lent.example.fr');

      jest.advanceTimersByTime(4999);
      const signal = (mockFetch.mock.calls[0][1] as { signal: AbortSignal })
        .signal;
      expect(signal.aborted).toBe(false);

      jest.advanceTimersByTime(1);
      const result = await promise;

      expect(signal.aborted).toBe(true);
      expect(result.reachable).toBe(false);
      expect(result.reason).toContain('AbortError');
    });
  });
});
