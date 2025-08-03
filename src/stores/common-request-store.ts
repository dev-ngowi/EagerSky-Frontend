// VITE_APP_COMMON_CATEGORIES_URL

// VITE_APP_AI_GET_MCQS_FROM_TEXT_URL

import { defineStore } from 'pinia'
import makeRequest from '../services/makeRequest'

export const useCommonRequestStore = defineStore('common-request', {
  state: () => ({
    loadingCategories: false,
    loadingsStacks: false,
    categories: [] as any[],
    stacks: [] as any[],
    loadingMetaData: false,
    menuMetaData: [] as any[],
    loadingStats: false,
    stats: {} as any,
  }),

  actions: {
    async getCategories() {
      const url = import.meta.env.VITE_APP_API_BASE_URL + import.meta.env.VITE_APP_COMMON_CATEGORIES_URL
      this.loadingCategories = true
      try {
        const response = await makeRequest({
          url: url,
          method: 'get',
        })
        if (response.status === 200) {
          this.categories = response.data.map((category: any) => {
            return {
              value: category.id,
              text: category.name,
            }
          })

          this.loadingCategories = false
        }
      } catch (error) {
        console.log(error)
        this.loadingCategories = false
      }
    },

    // VITE_APP_COMMON_STACKS_URL
    async getStacks() {
      const url = import.meta.env.VITE_APP_API_BASE_URL + import.meta.env.VITE_APP_COMMON_STACKS_URL
      this.loadingsStacks = true
      try {
        const response = await makeRequest({
          url: url,
          method: 'get',
        })
        if (response.status === 200) {
          this.stacks = response.data.map((stack: any) => {
            return {
              value: stack.id,
              text: stack.name,
            }
          })

          this.loadingsStacks = false
        }
      } catch (error) {
        console.log(error)
        this.loadingsStacks = false
      }
    },

    // VITE_APP_COMMON_MENU_META_DATA_URL=common/menu_meta_data/
    async getMenuMetaData() {
      this.loadingMetaData = true
      const url = import.meta.env.VITE_APP_API_BASE_URL + import.meta.env.VITE_APP_COMMON_MENU_META_DATA_URL
      try {
        const response = await makeRequest({
          url: url,
          method: 'get',
        })
        if (response.status === 200) {
          this.menuMetaData = response.data.map((menu: any) => {
            return {
              value: menu.id,
              text: menu.icon,
            }
          })
        }
      } catch (error) {
        console.log(error)
      } finally {
        this.loadingMetaData = false
      }
    },

    // VITE_APP_STATS_URL
    async getStats() {
      this.loadingStats = true
      const url = import.meta.env.VITE_APP_API_BASE_URL + import.meta.env.VITE_APP_STATS_URL
      try {
        const response = await makeRequest({
          url: url,
          method: 'get',
        })
        if (response.status === 200) {
          this.loadingStats = false
          this.stats = response.data
          return response.data
        }
      } catch (error) {
        console.log(error)
      } finally {
        this.loadingStats = false
      }
    },
  },
})
