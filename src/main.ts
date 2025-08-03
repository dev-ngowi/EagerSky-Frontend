import { createApp } from 'vue'
import App from './App.vue'
import i18n from './i18n'
import { createVuestic } from 'vuestic-ui'
import { createGtm } from '@gtm-support/vue-gtm'
import stores from './stores'
import router from './router'
import vuesticGlobalConfig from './services/vuestic-ui/global-config'
import './services/interceptors/interceptors'
import './scss/main.scss'
import 'md-editor-v3/lib/style.css'

const app = createApp(App)

// Register Pinia stores
app.use(stores)

// Register Vue Router
app.use(router)

// Register i18n for internationalization
app.use(i18n)

// Register Vuestic UI with global configuration
// This includes VaToast for notifications
app.use(createVuestic({ config: vuesticGlobalConfig }))

// Conditionally register Google Tag Manager if enabled
if (import.meta.env.VITE_APP_GTM_ENABLED) {
  app.use(
    createGtm({
      id: import.meta.env.VITE_APP_GTM_KEY,
      debug: false,
      vueRouter: router,
    }),
  )
}

// Mount the app
app.mount('#app')
