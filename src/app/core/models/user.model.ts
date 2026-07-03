import { Role } from './role.model';

export interface AppUser {
  id: number;
  fullName: string;
  email: string;
  phoneNumber?: string;
  department?: string;
  position?: string;
  username: string;
  isActive: boolean;
  roles: Role[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserCreateRequest {
  fullName: string;
  email: string;
  phoneNumber?: string;
  department?: string;
  position?: string;
  username: string;
  password: string;
  roleCodes?: string[];
}

export interface UserUpdateRequest {
  fullName: string;
  email: string;
  phoneNumber?: string;
  department?: string;
  position?: string;
}

export interface UserSearchParams {
  keyword?: string;
  department?: string;
  page?: number;
  pageSize?: number;
}
