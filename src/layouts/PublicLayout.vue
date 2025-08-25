<template>
  <div class="public-layout">
    <PublicHeader />
    <main class="main">
      <router-view />
    </main>
    <PublicFooter />
    
    <!-- Scroll to top button -->
    <a href="#" id="scroll-top" class="scroll-top d-flex align-items-center justify-content-center">
      <i class="bi bi-arrow-up-short"></i>
    </a>
    
    <!-- Preloader (hidden by default) -->
    <div id="preloader" style="display: none;"></div>
  </div>
</template>

<script lang="ts" setup>
import PublicHeader from '../components/PublicHeader.vue';
import PublicFooter from '../components/PublicFooter.vue';
</script>

<style lang="scss" scoped>
@import '../scss/variables';

.public-layout {
  font-family: 'Poppins', sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main {
  flex: 1;
}

.scroll-top {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  background: #007bff;
  color: #fff;
  border-radius: 50%;
  z-index: 1000;
  text-decoration: none;
  
  &:hover {
    background: darken(#007bff, 10%);
  }
}
</style>