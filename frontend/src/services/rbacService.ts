import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '../config/environment';

const API_BASE_URL = config.apiBaseUrl;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// Types
export interface Permission {
  _id: string;
  name: string;
  code: string;
  description: string;
  category: string;
  resource: string;
  action: string;
  isSystemPermission: boolean;
  isActive: boolean;
}

export interface Role {
  _id: string;
  name: string;
  code: string;
  description: string;
  permissions: Permission[] | string[];
  isSystemRole: boolean;
  isActive: boolean;
  isDefault: boolean;
  userCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GroupedPermissions {
  [category: string]: Permission[];
}

export interface UserPermissions {
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: {
    name: string;
    code: string;
    isLegacy: boolean;
  };
  permissions: Permission[];
}

export interface CreateRoleData {
  name: string;
  code?: string;
  description: string;
  permissions?: string[];
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  permissions?: string[];
}

// RBAC Service
export const rbacService = {
  // Role Management
  getRoles: async (): Promise<Role[]> => {
    const response = await api.get('/rbac/roles');
    return response.data.roles;
  },

  getRole: async (roleId: string): Promise<Role> => {
    const response = await api.get(`/rbac/roles/${roleId}`);
    return response.data.role;
  },

  createRole: async (data: CreateRoleData): Promise<Role> => {
    const response = await api.post('/rbac/roles', data);
    return response.data.role;
  },

  updateRole: async (roleId: string, data: UpdateRoleData): Promise<Role> => {
    const response = await api.put(`/rbac/roles/${roleId}`, data);
    return response.data.role;
  },

  deleteRole: async (roleId: string): Promise<void> => {
    await api.delete(`/rbac/roles/${roleId}`);
  },

  // Permission Management
  getPermissions: async (): Promise<GroupedPermissions> => {
    const response = await api.get('/rbac/permissions');
    return response.data.permissions;
  },

  assignPermissionsToRole: async (
    roleId: string,
    permissionIds: string[]
  ): Promise<Role> => {
    const response = await api.post(`/rbac/roles/${roleId}/permissions`, {
      permissionIds,
    });
    return response.data.role;
  },

  removePermissionFromRole: async (
    roleId: string,
    permissionId: string
  ): Promise<Role> => {
    const response = await api.delete(
      `/rbac/roles/${roleId}/permissions/${permissionId}`
    );
    return response.data.role;
  },

  // User Role Management
  getUserPermissions: async (userId: string): Promise<UserPermissions> => {
    const response = await api.get(`/rbac/users/${userId}/permissions`);
    return response.data;
  },

  assignRoleToUser: async (
    userId: string,
    roleId: string
  ): Promise<{ user: any; role: any }> => {
    const response = await api.put(`/rbac/users/${userId}/role`, { roleId });
    return response.data;
  },

  // System
  seedRBAC: async (): Promise<{
    permissions: { created: number; updated: number };
    roles: { created: number; updated: number };
  }> => {
    const response = await api.post('/rbac/seed');
    return {
      permissions: response.data.permissions,
      roles: response.data.roles,
    };
  },
};

export default rbacService;
