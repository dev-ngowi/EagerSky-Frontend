import { defineStore } from 'pinia'

export const useGlobalStore = defineStore('global', {
  state: () => ({
    // State for desktop minimized sidebar
    isSidebarMinimized: false,
    // NEW: State for mobile sidebar visibility
    isSidebarOpen: false,
    // NEW: State for tracking mobile view
    isMobile: false,
  }),

  actions: {
    // This is now the main toggle function for everything
    toggleSidebar() {
      if (this.isMobile) {
        // On mobile, this toggles the overlay
        this.isSidebarOpen = !this.isSidebarOpen
      } else {
        // On desktop, this toggles the minimized state
        this.isSidebarMinimized = !this.isSidebarMinimized
      }
    },

    // NEW: Action to specifically set the mobile status
    setMobile(isMobile: boolean) {
      this.isMobile = isMobile
      // When we switch to mobile, always ensure the sidebar is closed
      if (isMobile) {
        this.isSidebarOpen = false
      }
    },

    // NEW: Action to close the sidebar (for the overlay click)
    closeSidebar() {
      if (this.isMobile) {
        this.isSidebarOpen = false
      }
    },
  },
})