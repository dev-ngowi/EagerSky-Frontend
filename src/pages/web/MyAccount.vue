<template>
  <div class="my-account">
    <!-- This file is no longer needed since AccountHome.vue is the default route -->
    <!-- You can delete this file or redirect users to AccountHome -->
    <router-view />
  </div>
</template>

<script lang="ts" setup>
// This component is now redundant - consider removing it
</script>

<style lang="scss" scoped>
.my-account {
  // No styles needed since this just passes through to router-view
}
</style>