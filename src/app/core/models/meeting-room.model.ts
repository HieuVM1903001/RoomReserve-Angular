export type RoomStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export interface MeetingRoom {
  id: number;
  code: string;
  name: string;
  location: string;
  capacity: number;
  equipment: string[];
  description?: string;
  status: RoomStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface MeetingRoomRequest {
  code: string;
  name: string;
  location: string;
  capacity: number;
  equipment: string[];
  description?: string;
  status: RoomStatus;
}
