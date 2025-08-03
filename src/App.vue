<template>
  <div v-if="isLoading" class="loader" v-bind="$attrs">
    <EagerLogo :is-white-bg="true" :height="'100'" />
    <Loader />
  </div>
  <RouterView v-else />
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue';
import { RouterView } from 'vue-router';
import EagerLogo from './components/EagerLogo.vue';
import Loader from './components/Loader.vue';
import { useToast } from 'vuestic-ui';

export default defineComponent({
  name: 'App',
  components: {
    RouterView,
    EagerLogo,
    Loader,
  },
  inheritAttrs: true,
  setup() {
    const isLoading = ref(true);
    const { init } = useToast();

    onMounted(() => {
      setTimeout(() => {
        isLoading.value = false;
      }, 500); // Keep reduced loading time
    });

    return {
      isLoading,
      errorHandler(err: any) {
        console.error('Global error:', err);
        init({
          message: 'An unexpected error occurred. Please try again.',
          color: 'danger',
        });
      },
    };
  },
  errorCaptured(err) {
    this.errorHandler(err);
    return false;
  },
});
</script>

<style scoped lang="scss">
.loader {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  z-index: 1000;
}
</style>