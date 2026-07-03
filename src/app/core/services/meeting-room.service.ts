import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MeetingRoom, MeetingRoomRequest } from '../models/meeting-room.model';

@Injectable({ providedIn: 'root' })
export class MeetingRoomService {
  private baseUrl = `${environment.apiUrl}/meeting-rooms`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<MeetingRoom[]> {
    return this.http.get<MeetingRoom[]>(this.baseUrl);
  }

  getById(id: number): Observable<MeetingRoom> {
    return this.http.get<MeetingRoom>(`${this.baseUrl}/${id}`);
  }

  create(payload: MeetingRoomRequest): Observable<MeetingRoom> {
    return this.http.post<MeetingRoom>(this.baseUrl, payload);
  }

  update(id: number, payload: MeetingRoomRequest): Observable<MeetingRoom> {
    return this.http.put<MeetingRoom>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
