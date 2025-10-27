import { defineStore } from 'pinia';
import { AuthMiddleware } from '../utils/authMiddleware';

export const useGlobalStore = defineStore('global', {
  state: () => ({
    isSidebarMinimized: false,
    isSidebarOpen: false,
    isMobile: false,
    userRole: AuthMiddleware.getUserRole() ?? 'guest', // NEW: Store user role
  }),

  actions: {
    toggleSidebar() {
      if (this.isMobile) {
        this.isSidebarOpen = !this.isSidebarOpen;
      } else {
        this.isSidebarMinimized = !this.isSidebarMinimized;
      }
    },

    setMobile(isMobile: boolean) {
      this.isMobile = isMobile;
      if (isMobile) {
        this.isSidebarOpen = false;
      }
    },

    closeSidebar() {
      if (this.isMobile) {
        this.isSidebarOpen = false;
      }
    },

    // NEW: Update user role
    setUserRole(role: string) {
      this.userRole = role;
    },
  },
});