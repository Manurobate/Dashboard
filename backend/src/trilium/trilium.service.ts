import { Injectable, Logger } from '@nestjs/common';

export interface TriliumPingResult {
  reachable: boolean;
  reason?: string;
}

@Injectable()
export class TriliumService {
  private readonly logger = new Logger(TriliumService.name);

  async ping(url: string): Promise<TriliumPingResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
      });
      return { reachable: true };
    } catch (err) {
      this.logger.warn(`Trilium ping failed for ${url}: ${String(err)}`);
      return { reachable: false, reason: String(err) };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
