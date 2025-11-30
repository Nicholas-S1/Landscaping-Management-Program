import api from './api';
import {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  UpdateProfileData,
  ChangePasswordData,
  ApiResponse,
} from '../types';

class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    if (response.data.data) {
      this.setAuthData(
        response.data.data.accessToken,
        response.data.data.refreshToken,
        response.data.data.user
      );
    }
    return response.data;
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    if (response.data.data) {
      this.setAuthData(
        response.data.data.accessToken,
        response.data.data.refreshToken,
        response.data.data.user
      );
    }
    return response.data;
  }

  /**
   * Logout user
   */
  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  /**
   * Get current user profile
   */
  async getMe(): Promise<User> {
    const response = await api.get<ApiResponse<{ user: User }>>('/auth/me');
    if (response.data.data?.user) {
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
      return response.data.data.user;
    }
    throw new Error('Failed to get user profile');
  }

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileData): Promise<User> {
    const response = await api.put<ApiResponse<{ user: User }>>('/auth/update-profile', data);
    if (response.data.data?.user) {
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
      return response.data.data.user;
    }
    throw new Error('Failed to update profile');
  }

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordData): Promise<void> {
    await api.put('/auth/change-password', data);
  }

  /**
   * Get current user from localStorage
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  /**
   * Set auth data in localStorage
   */
  private setAuthData(accessToken: string, refreshToken: string, user: User): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
  }
}

export default new AuthService();
