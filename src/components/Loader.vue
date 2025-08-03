<template>
  <div class="loader-container" v-bind="$attrs">
    <div class="spinner"></div>
    <div class="loader-text">
      <p>{{ loadingText }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Loader',
  props: {
    loadingText: {
      type: String,
      default: 'Please wait while the page is loading.',
    },
  },
  inheritAttrs: true, // Allow non-prop attributes to be inherited
  setup() {
    return {};
  },
});
</script>

<style scoped lang="scss">
.loader-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.spinner {
  width: 4rem;
  height: 4rem;
  border: 5px solid rgb(0, 102, 255);
  border-top: 5px solid #a8024f;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.loader-text {
  text-align: center;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>