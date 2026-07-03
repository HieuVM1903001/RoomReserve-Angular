export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export interface BookingParticipant {
  id?: number;
  userId?: number;
  fullName: string;
  email: string;
}

export interface BookingHistory {
  id: number;
  action: string;
  oldStatus?: BookingStatus;
  newStatus: BookingStatus;
  note?: string;
  createdByUserName?: string;
  createdAt: string;
}

export interface RoomBooking {
  id: number;
  roomId: number;
  roomName?: string;
  roomLocation?: string;
  createdByUserId: number;
  createdByUserName?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  numberOfParticipants: number;
  participants: BookingParticipant[];
  status: BookingStatus;
  note?: string;
  cancelReason?: string;
  rejectReason?: string;
  approvedByUserName?: string;
  approvedAt?: string;
  rejectedByUserName?: string;
  rejectedAt?: string;
  cancelledByUserName?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt?: string;
  histories?: BookingHistory[];
}

export interface BookingCreateRequest {
  roomId: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  numberOfParticipants: number;
  participants: BookingParticipant[];
  note?: string;
}

export interface BookingUpdateRequest {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  numberOfParticipants: number;
  participants: BookingParticipant[];
  note?: string;
}

export interface BookingCancelRequest {
  cancelReason: string;
}

export interface BookingRejectRequest {
  rejectReason: string;
  note?: string;
}

export interface BookingSearchParams {
  status?: BookingStatus;
  roomId?: number;
  createdByUserId?: number;
  fromDate?: string;
  toDate?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}
