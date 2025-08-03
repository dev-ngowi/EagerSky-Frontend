<template>
  <img :src="getUrl" :style="{ width: width, height: height }" alt="Logo" class="admin_logo" />
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'EagerLogo',

  props: {
    width: {
      type: String,
      default: '3.5rem', // 120px equivalent
    },
    isWhiteBg: {
      type: Boolean,
      default: false,
    },
    height: {
      type: String,
      default: '1.875rem', // 30px equivalent
    },
  },

  computed: {
    getUrl() {
      return '/images/ESRCLogo.png' // Ensure this path is correct
    },
  },
})
</script>

<style scoped>
.admin_logo {
  display: block;
  margin: 0 auto;
  max-width: 40%;
  height: auto;
}
</style>
