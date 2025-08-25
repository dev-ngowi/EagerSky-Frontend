<template>
  <div id="app">
    <!-- Loading Screen -->
    <div v-if="isLoading" class="loader">
      <EagerLogo />
      <Loader />
    </div>
    
    <!-- Main App Content - Just render router-view, let layouts handle themselves -->
    <div v-else>
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToast } from 'vuestic-ui';
import EagerLogo from './components/EagerLogo.vue';
import Loader from './components/Loader.vue';

const isLoading = ref(true);
const { init } = useToast();

onMounted(() => {
  setTimeout(() => {
    isLoading.value = false;
  }, 500);
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

#app {
  font-family: 'Poppins', sans-serif;
  margin: 0;
  padding: 0;
}
</style>