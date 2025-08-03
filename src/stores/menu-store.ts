import { defineStore } from 'pinia'
import makeRequest from '../services/makeRequest'
import type { INavigationRoute } from '../components/sidebar/navigation-types'

interface MenuResponse {
  routes?: INavigationRoute[] // Optional routes array
  message?: string // Optional error message
}

interface ErrorResponse {
  message?: string
  [key: string]: any
}

export const useMenuStore = defineStore('menu', {
  state: () => ({
    navigationRoutes: {
      root: {
        name: '/',
        displayName: 'navigationRoutes.home',
        meta: { icon: 'home' },
      },
      routes: [
        {
          name: 'dashboard',
          displayName: 'menu.dashboard',
          meta: {
            icon: 'vuestic-iconset-dashboard',
          },
        },
      ] as INavigationRoute[],
    },
    loadingMenu: false,
    error: null as ErrorResponse | null,
  }),

  actions: {
    async fetchMenu() {
      this.loadingMenu = true
      this.error = null
      const url = `${import.meta.env.VITE_APP_API_BASE_URL}/v1/menu`

      try {
        const response = await makeRequest<{
          status: number
          data: MenuResponse
        }>({
          url,
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          requiresAuth: true,
        })

        // Explicitly check if response.data has routes
        if (response.status === 200 && 'routes' in response.data && Array.isArray(response.data.routes)) {
          this.navigationRoutes.routes = [
            ...this.navigationRoutes.routes.filter((route) => route.name === 'dashboard'),
            ...response.data.routes, // TypeScript should now recognize routes as INavigationRoute[]
          ]
        } else {
          // Use type assertion or fallback for message
          const message = (response.data as any).message || 'Failed to fetch menu'
          this.error = { message }
        }
      } catch (error: any) {
        this.error = { message: error.message || 'Network error' }
      } finally {
        this.loadingMenu = false
      }
    },
  },
})