// VITE_APP_AI_GET_MCQS_FROM_TEXT_URL

import { defineStore } from 'pinia'
import makeRequest from '../services/makeRequest'

export const useAIStore = defineStore('ai', {
  state: () => ({
    loadingContent: false,
    content: '' as string,
  }),

  actions: {
    async getAiText(text: string) {
      this.loadingContent = true
      try {
        const response = await makeRequest({
          url: import.meta.env.VITE_APP_API_BASE_URL + import.meta.env.VITE_APP_AI_GET_MCQS_FROM_TEXT_URL,
          method: 'post',
          headers: {},
          data: JSON.stringify({ content: text }), // convert data to JSON string
        })

        if (response.status === 200) {
          this.content = response.data.content
          this.loadingContent = false
        } else {
          this.loadingContent = false
          console.error('Error getting Content from text')
        }
      } catch (error) {
        this.loadingContent = false
        console.error('Error getting Content from text', error)
      } finally {
        this.loadingContent = false
      }
    },
  },
})
