import { UserBusiness } from './business';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  businesses?: UserBusiness[];
  currentBusiness?: string;
  lastLogin?: string;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthError {
  message: string;
  field?: string;
}
