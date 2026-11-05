import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TriliumPingResult {
  reachable: boolean;
  reason?: string;
}

@Injectable({ providedIn: 'root' })
export class TriliumService {
  private readonly http = inject(HttpClient);

  ping(url: string): Observable<TriliumPingResult> {
    return this.http.get<TriliumPingResult>('/api/trilium/ping', { params: { url } });
  }
}
