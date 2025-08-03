import iconsConfig from './icons-config/icons-config'
import colors from './themes'
import { defineVuesticConfig } from 'vuestic-ui'

export default defineVuesticConfig({
  colors,
  icons: iconsConfig,
  breakpoint: {
    enabled: true,
    bodyClass: true,
    thresholds: {
      xs: 0,
      sm: 640,    // Changed from 320 to 640
      md: 768,    // Changed from 640 to 768
      lg: 1024,
      xl: 1440,
    },
  },
  components: {
    VaInput: {
      preset: 'outlined',
      clearable: true,
    },

    VaSelect: {
      searchable: true,
      clearable: true,
      small: true,
    },

    VaIcon: {
      sizesConfig: {
        defaultSize: 19,
        sizes: {
          small: 14,
          medium: 19,
          large: 26,
        },
      },
    },
    VaModal: {
      mobileFullscreen: false,
      maxHeight: 'calc(100% - 2rem)',
      closeButton: true,
    },
    VaPagination: {
      activeButtonProps: {
        preset: 'primary',
      },
    },
    VaDataTable: {
      disableClientSideSorting: true,
    },
    presets: {
      VaSelect: {
        small: {
          class: 'va-select--small',
          keepAnchorWidth: false,
          placement: 'bottom-end',
          width: 'min(100%, 150px)',
          style:
            '--va-input-wrapper-min-height: 24px; --va-input-wrapper-border-radius: 2px; --va-input-wrapper-width: 100px;',
        },
      },
    },
  },
})
