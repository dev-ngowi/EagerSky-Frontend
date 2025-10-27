<template>
  <div class="home-page">
    <HeroSection />
    <NewListings />
    <ServicesSection />
    <TestimonialsSection />
  </div>
</template>

<script lang="ts" setup>
import HeroSection from '../../components/HeroSection.vue';
import NewListings from '../../components/NewListings.vue';
import ServicesSection from '../../components/ServicesSection.vue';
import TestimonialsSection from '../../components/TestimonialsSection.vue';
</script>

<style lang="scss" scoped>
@import '../../scss/variables';
.home-page {
  font-family: 'Poppins', sans-serif;
}
</style>