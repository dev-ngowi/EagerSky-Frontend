import { useAuthStore } from '../stores/auth-store';

export interface SessionData {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  role_id: string;
  branch?: any;
  client_type?: string;
  nida_number?: string;
  student_registration_number?: string;
  permissions: string[];
  token: string;
  user?: any;
  expiresAt: number;
  keepLoggedIn?: boolean;
}

export class AuthMiddleware {
  private static readonly TOKEN_EXPIRY_HOURS = 1;
  private static readonly SESSION_KEY = 'userData';
  private static readonly TOKEN_KEY = 'authToken';

  static getTokenExpiration(): number {
    return new Date().getTime() + this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;
  }

  static isSessionValid(): boolean {
    try {
      const sessionData = sessionStorage.getItem(this.SESSION_KEY);
      const token = sessionStorage.getItem(this.TOKEN_KEY);

      console.log('Checking session validity:', {
        hasSessionData: !!sessionData,
        hasToken: !!token,
      });

      if (!sessionData || !token) {
        console.log('Missing session data or token');
        this.clearSession();
        return false;
      }

      const parsedData: SessionData = JSON.parse(sessionData);
      console.log('Parsed session data:', parsedData);

      if (!parsedData.id || !parsedData.token || !parsedData.expiresAt || !parsedData.role) {
        console.log('Invalid session data structure:', {
          hasId: !!parsedData.id,
          hasToken: !!parsedData.token,
          hasExpiresAt: !!parsedData.expiresAt,
          hasRole: !!parsedData.role,
        });
        this.clearSession();
        return false;
      }

      if (new Date().getTime() >= parsedData.expiresAt) {
        console.log('Session expired:', {
          expiresAt: parsedData.expiresAt,
          currentTime: new Date().getTime(),
        });
        this.clearSession();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating session:', error);
      this.clearSession();
      return false;
    }
  }

  static getUserRole(): string | null {
    try {
      if (!this.isSessionValid()) {
        console.log('No valid session, returning null role');
        return null;
      }

      const sessionData = sessionStorage.getItem(this.SESSION_KEY);
      if (!sessionData) {
        console.log('No session data found');
        return null;
      }

      const parsedData: SessionData = JSON.parse(sessionData);
      const role = parsedData.role || parsedData.user?.role;

      if (!role) {
        console.log('No role found in session data');
        return null;
      }

      const normalizedRole = role.toLowerCase();
      switch (normalizedRole) {
        case 'admin':
        case 'administrator':
        case 'super_admin':
          return 'admin';
        case 'landlord':
        case 'property_owner':
        case 'owner':
          return 'landlord';
        case 'tenant':
        case 'renter':
          return 'tenant';
        default:
          console.log('Unknown role, defaulting to null:', normalizedRole);
          return null;
      }
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  static getUserData(): Partial<SessionData> | null {
    try {
      if (!this.isSessionValid()) {
        return null;
      }

      const sessionData = sessionStorage.getItem(this.SESSION_KEY);
      if (!sessionData) return null;

      const parsedData: SessionData = JSON.parse(sessionData);

      return {
        id: parsedData.id || parsedData.user?.id,
        username: parsedData.username || parsedData.user?.username || 'User',
        first_name: parsedData.first_name || parsedData.user?.first_name,
        last_name: parsedData.last_name || parsedData.user?.last_name,
        email: parsedData.email || parsedData.user?.email,
        phone: parsedData.phone || parsedData.user?.phone,
        role: parsedData.role || parsedData.user?.role,
        role_id: parsedData.role_id || parsedData.user?.role_id,
        branch: parsedData.branch || parsedData.user?.branch,
        client_type: parsedData.client_type || parsedData.user?.client_type,
        nida_number: parsedData.nida_number || parsedData.user?.nida_number,
        student_registration_number: parsedData.student_registration_number || parsedData.user?.student_registration_number,
        permissions: parsedData.permissions || parsedData.user?.permissions || [],
        token: parsedData.token || parsedData.user?.token,
        expiresAt: parsedData.expiresAt,
        keepLoggedIn: parsedData.keepLoggedIn,
      };
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  static storeSession(userData: Partial<SessionData>): void {
    try {
      if (!userData.id || !userData.token || !userData.role) {
        throw new Error('Invalid user data: id, token, and role are required');
      }

      const sessionData: SessionData = {
        id: userData.id,
        username: userData.username || 'User',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        role: userData.role || 'tenant',
        role_id: userData.role_id || '',
        branch: userData.branch,
        client_type: userData.client_type,
        nida_number: userData.nida_number,
        student_registration_number: userData.student_registration_number,
        permissions: userData.permissions || [],
        token: userData.token,
        user: userData,
        expiresAt: this.getTokenExpiration(),
        keepLoggedIn: userData.keepLoggedIn || false,
      };

      console.log('Storing session:', sessionData);

      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
      sessionStorage.setItem(this.TOKEN_KEY, userData.token);

      if (userData.keepLoggedIn) {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
        localStorage.setItem(this.TOKEN_KEY, userData.token);
      }
    } catch (error) {
      console.error('Error storing session:', error);
      throw error;
    }
  }

  static clearSession(): void {
    try {
      sessionStorage.clear();
      localStorage.clear();
      // Explicitly remove legacy keys
      localStorage.removeItem('userProfile');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('jwt');
      console.log('Session and local storage cleared, including legacy keys');
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  static hasRole(requiredRoles: string | string[]): boolean {
    const userRole = this.getUserRole();
    if (!userRole) return false;

    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    return roles.some((role) => {
      const normalizedRequired = role.toLowerCase();
      const normalizedUser = userRole.toLowerCase();

      if (normalizedRequired === 'admin' && ['admin', 'administrator', 'super_admin'].includes(normalizedUser)) {
        return true;
      }
      if (normalizedRequired === 'landlord' && ['landlord', 'property_owner', 'owner'].includes(normalizedUser)) {
        return true;
      }
      if (normalizedRequired === 'tenant' && ['tenant', 'renter'].includes(normalizedUser)) {
        return true;
      }
      return normalizedRequired === normalizedUser;
    });
  }

  static hasPermission(permission: string): boolean {
    const userData = this.getUserData();
    if (!userData || !userData.permissions) return false;

    return userData.permissions.includes(permission);
  }

  static getDashboardRoute(): string {
    const role = this.getUserRole();
    if (!role) return 'login';

    switch (role) {
      case 'admin':
        return 'admin-dashboard';
      case 'landlord':
        return 'landlord-dashboard';
      case 'tenant':
        return 'tenant-dashboard';
      default:
        return 'login';
    }
  }

  static refreshSession(): boolean {
    try {
      const sessionData = sessionStorage.getItem(this.SESSION_KEY);
      if (!sessionData) return false;

      const parsedData: SessionData = JSON.parse(sessionData);
      parsedData.expiresAt = this.getTokenExpiration();

      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(parsedData));
      if (parsedData.keepLoggedIn) {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(parsedData));
      }

      console.log('Session refreshed, new expiry:', new Date(parsedData.expiresAt).toISOString());
      return true;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
  }

  static getTimeUntilExpiry(): number {
    try {
      const sessionData = sessionStorage.getItem(this.SESSION_KEY);
      if (!sessionData) return 0;

      const parsedData: SessionData = JSON.parse(sessionData);
      if (!parsedData.expiresAt) return 0;

      const now = new Date().getTime();
      const timeLeft = parsedData.expiresAt - now;
      return Math.max(0, Math.floor(timeLeft / (1000 * 60)));
    } catch (error) {
      console.error('Error getting time until expiry:', error);
      return 0;
    }
  }

  static autoRefreshSession(): void {
    const timeLeft = this.getTimeUntilExpiry();
    if (timeLeft > 0 && timeLeft <= 10) {
      console.log(`Session expiring in ${timeLeft} minutes, auto-refreshing...`);
      this.refreshSession();
    }
  }
}

export const isSessionValid = AuthMiddleware.isSessionValid;
export const getUserRole = AuthMiddleware.getUserRole;
export const getUserData = AuthMiddleware.getUserData;
export const storeSession = AuthMiddleware.storeSession;
export const clearSession = AuthMiddleware.clearSession;
export const hasRole = AuthMiddleware.hasRole;
export const hasPermission = AuthMiddleware.hasPermission;
export const getDashboardRoute = AuthMiddleware.getDashboardRoute;
export const refreshSession = AuthMiddleware.refreshSession;
export const autoRefreshSession = AuthMiddleware.autoRefreshSession;
export const getTimeUntilExpiry = AuthMiddleware.getTimeUntilExpiry;

export default AuthMiddleware;