import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type ShareResourceType = 'recipe';
export type ShareExpiresIn = '24h' | '7d' | '30d' | 'permanent';

export interface PublicShareToken {
  id: number;
  token: string;
  resourceType: ShareResourceType;
  resourceId: number;
  userId: number;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class SharingService {
  private readonly http = inject(HttpClient);

  findActiveForResource(
    resourceType: ShareResourceType,
    resourceId: number,
  ): Observable<PublicShareToken[]> {
    const params = new HttpParams().set('resourceType', resourceType).set('resourceId', resourceId);
    return this.http.get<PublicShareToken[]>('/api/sharing', { params });
  }

  createShareLink(
    resourceType: ShareResourceType,
    resourceId: number,
    expiresIn: ShareExpiresIn,
  ): Observable<PublicShareToken> {
    return this.http.post<PublicShareToken>('/api/sharing', {
      resourceType,
      resourceId,
      expiresIn,
    });
  }

  revokeShareLink(id: number): Observable<PublicShareToken> {
    return this.http.patch<PublicShareToken>(`/api/sharing/${id}/revoke`, {});
  }

  buildShareUrl(token: string): string {
    return `${window.location.origin}/share/${token}`;
  }
}
