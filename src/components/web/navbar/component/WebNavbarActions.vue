<template>
  <div class="actions">
    <VaButton v-if="isAuthenticated" :to="{ name: 'my-account' }" preset="primary" size="small">
      My Account
    </VaButton>
    <VaButton v-else :to="{ name: 'login' }" preset="primary" size="small">
      Login
    </VaButton>
  </div>
</template>

<script lang="ts" setup>
import { useAuth } from '../../../../composables/useAuth';

defineProps<{
  isMobile: boolean;
}>();

const { isAuthenticated } = useAuth();
</script>

<style lang="scss" scoped>
.actions {
  display: flex;
  gap: 0.5rem;
}
</style>