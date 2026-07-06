import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppUser, UserCreateRequest, UserSearchParams, UserUpdateRequest } from '../models/user.model';
import { PagedResult } from '../models/api-response.model';
import { Role } from '../models/role.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private baseUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getAll(params: UserSearchParams = {}): Observable<PagedResult<AppUser>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') httpParams = httpParams.set(k, String(v));
    });
    return this.http.get<PagedResult<AppUser>>(this.baseUrl, { params: httpParams });
  }

  getById(id: number): Observable<AppUser> {
    return this.http.get<AppUser>(`${this.baseUrl}/${id}`);
  }

  create(payload: UserCreateRequest): Observable<AppUser> {
    return this.http.post<AppUser>(this.baseUrl, payload);
  }

  update(id: number, payload: UserUpdateRequest): Observable<AppUser> {
    return this.http.put<AppUser>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  lock(id: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/lock`, {});
  }

  unlock(id: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/unlock`, {});
  }

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${environment.apiUrl}/roles`);
  }

  /**
   * Replaces a user's full set of roles in one call, matching the backend's
   * `AssignRolesRequest { RoleCodes: List<string> }` contract. Meant to be sent
   * once (on a form submit), not per-checkbox-toggle.
   */
  assignRoles(userId: number, roleCodes: string[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${userId}/roles`, { roleCodes });
  }
}
