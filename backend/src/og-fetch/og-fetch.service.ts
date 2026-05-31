import { Injectable, Logger } from '@nestjs/common';

export interface OgData {
  title: string | null;
  faviconUrl: string | null;
}

@Injectable()
export class OgFetchService {
  private readonly logger = new Logger(OgFetchService.name);

  async fetchOgData(url: string): Promise<OgData> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Dashboard/1.0)' },
        redirect: 'follow',
      });
      if (!response.ok) return { title: null, faviconUrl: null };
      const MAX_HTML_SIZE = 512 * 1024;
      const contentLength = parseInt(
        response.headers?.get('content-length') ?? '0',
        10,
      );
      if (contentLength > MAX_HTML_SIZE)
        return { title: null, faviconUrl: null };
      const html = await response.text();
      return {
        title: this.extractOgTitle(html) ?? this.extractHtmlTitle(html),
        faviconUrl: this.extractFaviconUrl(html, url),
      };
    } catch (err) {
      this.logger.warn(`OG fetch failed for ${url}: ${String(err)}`);
      return { title: null, faviconUrl: null };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private extractOgTitle(html: string): string | null {
    const m =
      html.match(
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      ) ??
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
      );
    return m?.[1]?.trim() ?? null;
  }

  private extractHtmlTitle(html: string): string | null {
    return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;
  }

  private extractFaviconUrl(html: string, pageUrl: string): string | null {
    const origin = new URL(pageUrl).origin;
    const m =
      html.match(
        /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
      ) ??
      html.match(
        /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i,
      );
    if (m?.[1]) {
      const href = m[1];
      if (href.startsWith('http')) return href;
      if (href.startsWith('//')) return `https:${href}`;
      return `${origin}${href.startsWith('/') ? '' : '/'}${href}`;
    }
    return `${origin}/favicon.ico`;
  }
}
