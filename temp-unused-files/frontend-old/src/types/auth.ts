export interface User {
  id: string;
  name: string;
  email: string;
  userType: 'super_admin' | 'business_admin' | 'manager' | 'normal_user';
  businessId?: string;
  roleInfo?: {
    name: string;
    description: string;
    level: number;
  };
  capabilities?: {
    canManageSettings: boolean;
    canManageTeam: boolean;
    canManageCampaigns: boolean;
    canManageTemplates: boolean;
    canAccessInbox: boolean;
    canViewAnalytics: boolean;
    canManageAutomations: boolean;
    canManageFlows: boolean;
  };
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
