import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BookingCancelRequest,
  BookingCreateRequest,
  BookingSearchParams,
  BookingUpdateRequest,
  RoomBooking,
} from '../models/booking.model';
import { PagedResult } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private baseUrl = `${environment.apiUrl}/bookings`;

  constructor(private http: HttpClient) {}

  getMy(params: BookingSearchParams = {}): Observable<PagedResult<RoomBooking>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') httpParams = httpParams.set(k, String(v));
    });
    return this.http.get<PagedResult<RoomBooking>>(`${this.baseUrl}/my`, { params: httpParams });
  }

  getCalendar(fromDate: string, toDate: string, roomId?: number): Observable<RoomBooking[]> {
    let httpParams = new HttpParams().set('fromDate', fromDate).set('toDate', toDate);
    if (roomId) httpParams = httpParams.set('roomId', String(roomId));
    return this.http.get<RoomBooking[]>(`${this.baseUrl}/calendar`, { params: httpParams });
  }

  getById(id: number): Observable<RoomBooking> {
    return this.http.get<RoomBooking>(`${this.baseUrl}/${id}`);
  }

  create(payload: BookingCreateRequest): Observable<RoomBooking> {
    return this.http.post<RoomBooking>(this.baseUrl, payload);
  }

  update(id: number, payload: BookingUpdateRequest): Observable<RoomBooking> {
    return this.http.put<RoomBooking>(`${this.baseUrl}/${id}`, payload);
  }

  cancel(id: number, payload: BookingCancelRequest): Observable<RoomBooking> {
    return this.http.put<RoomBooking>(`${this.baseUrl}/${id}/cancel`, payload);
  }
}
