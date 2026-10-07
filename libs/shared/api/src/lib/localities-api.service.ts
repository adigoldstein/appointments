import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IsraelLocality, SearchLocalitiesQuery } from '@app/shared/types';
import { API_BASE_URL } from './api-base-url';

/** City reference data for pickers. Show `hebrewName` (ADR-0006). */
@Injectable({ providedIn: 'root' })
export class LocalitiesApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  search(search: string, limit = 10): Observable<IsraelLocality[]> {
    const query: Required<SearchLocalitiesQuery> = { search, limit };
    const params = new HttpParams().set('search', query.search).set('limit', query.limit);
    return this.http.get<IsraelLocality[]>(`${this.apiBaseUrl}/localities`, { params });
  }
}
