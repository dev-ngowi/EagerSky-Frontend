<template>
  <div class="auth-layout">
    <main
      class="auth-content"
      :class="{
        'w-login': $route.name === 'login',
        'w-signup': $route.name === 'signup',
      }"
    >
      <RouterView />
    </main>
  </div>
</template>

<script lang="ts" setup>
// No logic needed here
</script>

<style scoped>
.auth-layout {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--va-background-secondary);
  min-height: 100vh;
  padding: 1rem;
  box-sizing: border-box;
}

.auth-content {
  width: 100%;
  background-color: white;
  padding: 2rem;
  border-radius: 0.75rem;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}

/* Route-specific widths */
.w-login {
  max-width: 480px;
}
.w-signup {
  max-width: 680px;
}

/* Responsive tweaks */
@media (max-width: 480px) {
  .auth-content {
    padding: 1.25rem;
    border-radius: 0.5rem;
  }
}

@media (max-width: 360px) {
  .auth-content {
    padding: 1rem;
    border-radius: 0.4rem;
    max-width: 90vw;
  }

  .w-login {
    max-width: 90vw;
  }

  .w-signup {
    max-width: 95vw;
  }
}
</style>