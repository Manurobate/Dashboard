import { Test } from '@nestjs/testing';
import { OgFetchService } from './og-fetch.service';

describe('OgFetchService', () => {
  let service: OgFetchService;
  const mockFetch = jest.fn();

  beforeEach(async () => {
    globalThis.fetch = mockFetch;
    mockFetch.mockReset();
    const module = await Test.createTestingModule({ providers: [OgFetchService] }).compile();
    service = module.get(OgFetchService);
  });

  it('should extract og:title and favicon from HTML', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          '<html><head><meta property="og:title" content="GitHub"/>' +
            '<link rel="icon" href="/favicon.ico"></head></html>',
        ),
    });
    const result = await service.fetchOgData('https://github.com');
    expect(result.title).toBe('GitHub');
    expect(result.faviconUrl).toBe('https://github.com/favicon.ico');
  });

  it('should fallback to <title> if no og:title', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<html><head><title>My Page</title></head></html>'),
    });
    const result = await service.fetchOgData('https://example.com');
    expect(result.title).toBe('My Page');
    expect(result.faviconUrl).toBe('https://example.com/favicon.ico');
  });

  it('should return nulls on fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('network error'));
    const result = await service.fetchOgData('https://unreachable.example.com');
    expect(result).toEqual({ title: null, faviconUrl: null });
  });

  it('should return nulls when response is not ok', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const result = await service.fetchOgData('https://example.com/404');
    expect(result).toEqual({ title: null, faviconUrl: null });
  });

  it('should handle og:title in alternate attribute order', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          '<html><head><meta content="Alt Title" property="og:title"/></head></html>',
        ),
    });
    const result = await service.fetchOgData('https://example.com');
    expect(result.title).toBe('Alt Title');
  });

  it('should handle absolute favicon URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          '<html><head><link rel="shortcut icon" href="https://cdn.example.com/icon.png"/></head></html>',
        ),
    });
    const result = await service.fetchOgData('https://example.com');
    expect(result.faviconUrl).toBe('https://cdn.example.com/icon.png');
  });
});
