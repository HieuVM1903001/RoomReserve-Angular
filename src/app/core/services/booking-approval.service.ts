import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BookingRejectRequest, BookingSearchParams, RoomBooking } from '../models/booking.model';
import { PagedResult } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class BookingApprovalService {
  private baseUrl = `${environment.apiUrl}/booking-approvals`;

  constructor(private http: HttpClient) {}

  getAll(params: BookingSearchParams = {}): Observable<PagedResult<RoomBooking>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') httpParams = httpParams.set(k, String(v));
    });
    return this.http.get<PagedResult<RoomBooking>>(this.baseUrl, { params: httpParams });
  }

  approve(id: number): Observable<RoomBooking> {
    return this.http.put<RoomBooking>(`${this.baseUrl}/${id}/approve`, {});
  }

  reject(id: number, payload: BookingRejectRequest): Observable<RoomBooking> {
    return this.http.put<RoomBooking>(`${this.baseUrl}/${id}/reject`, payload);
  }
}
