import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize, catchError, of } from 'rxjs';

export interface Link {
  id: number;
  url: string;
  title: string;
  description: string | null;
  faviconUrl: string | null;
  position: number;
  categoryId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface OgPreview {
  title: string | null;
  faviconUrl: string | null;
}

export interface CreateLinkPayload {
  url: string;
  title: string;
  description?: string | null;
  faviconUrl?: string | null;
  categoryId: number;
}

@Injectable({ providedIn: 'root' })
export class LinksService {
  private readonly http = inject(HttpClient);

  readonly links = signal<Link[]>([]);
  readonly isLoadingLinks = signal(false);

  loadLinks(): Observable<Link[]> {
    this.isLoadingLinks.set(true);
    return this.http.get<Link[]>('/api/links').pipe(
      tap((links) => this.links.set(links)),
      catchError(() => of([])),
      finalize(() => this.isLoadingLinks.set(false)),
    );
  }

  createLink(dto: CreateLinkPayload): Observable<Link> {
    return this.http.post<Link>('/api/links', dto);
  }

  updateLink(id: number, dto: Partial<Omit<CreateLinkPayload, 'categoryId'>>): Observable<Link> {
    return this.http.patch<Link>(`/api/links/${id}`, dto);
  }

  deleteLink(id: number): Observable<void> {
    return this.http.delete<void>(`/api/links/${id}`);
  }

  reorderLinks(items: { id: number; position: number }[]): Observable<void> {
    return this.http.patch<void>('/api/links/reorder', { items });
  }

  moveLink(id: number, categoryId: number): Observable<Link> {
    return this.http.patch<Link>(`/api/links/${id}`, { categoryId });
  }

  fetchOgPreview(url: string): Observable<OgPreview> {
    return this.http.get<OgPreview>('/api/links/og-preview', { params: { url } });
  }
}
