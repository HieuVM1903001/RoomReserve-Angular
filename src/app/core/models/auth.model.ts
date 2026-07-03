export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: {
    id: number;
    fullName: string;
    email: string;
    username: string;
    roles: string[];
  };
}

export interface JwtPayload {
  sub: string;
  unique_name?: string;
  email?: string;
  role?: string | string[];
  exp: number;
  [key: string]: unknown;
}
