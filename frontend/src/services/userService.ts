import api from './api';
import { User, ApiResponse, PaginationParams } from '../types';

class UserService {
  /**
   * Get all users with pagination and filters
   */
  async getAllUsers(params?: PaginationParams): Promise<any> {
    const response = await api.get('/users', { params });
    return response.data;
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User> {
    const response = await api.get<ApiResponse<{ user: User }>>(`/users/${id}`);
    if (response.data.data?.user) {
      return response.data.data.user;
    }
    throw new Error('User not found');
  }

  /**
   * Create new user
   */
  async createUser(userData: any): Promise<User> {
    const response = await api.post<ApiResponse<{ user: User }>>('/users', userData);
    if (response.data.data?.user) {
      return response.data.data.user;
    }
    throw new Error('Failed to create user');
  }

  /**
   * Update user
   */
  async updateUser(id: string, userData: any): Promise<User> {
    const response = await api.put<ApiResponse<{ user: User }>>(`/users/${id}`, userData);
    if (response.data.data?.user) {
      return response.data.data.user;
    }
    throw new Error('Failed to update user');
  }

  /**
   * Delete user (deactivate)
   */
  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: string): Promise<User[]> {
    const response = await api.get<ApiResponse<{ users: User[] }>>(`/users/role/${role}`);
    if (response.data.data?.users) {
      return response.data.data.users;
    }
    return [];
  }
}

export default new UserService();
