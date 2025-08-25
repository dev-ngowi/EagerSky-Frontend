<template>
  <header class="private-header">
    <div class="header-left">
      <router-link to="/home" class="logo" aria-label="EagerSky Home">
        <EagerLogo :width="isMobile ? '36px' : '50px'" class="rounded-0" style="border-radius: 50px;" :height="isMobile ? '32px' : '50px'" />
        <h1 class="sitename">Eager<span>Sky</span></h1>
      </router-link>
      <button class="menu-toggle" @click.stop="emitToggleSidebar" :aria-label="isSidebarOpen ? 'Close sidebar' : 'Open sidebar'">
        <svg v-if="isSidebarOpen" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
    <div class="header-right">
      <div class="user-info">
        <span v-if="userName">Welcome, {{ userName }}</span>
        <span v-else>Welcome</span>
        <button class="logout-btn" @click.prevent="handleLogout">
          <i class="bi bi-box-arrow-right"></i> Logout
        </button>
      </div>
    </div>
  </header>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';
import { ref, onMounted } from 'vue';
import EagerLogo from './EagerLogo.vue';
import { useSidebarState } from '../composables/useSidebarState';

defineProps<{
  isSidebarOpen: boolean;
}>();
const emit = defineEmits(['toggle-sidebar']);

const router = useRouter();
const { isMobile } = useSidebarState();
const userName = ref('');

const emitToggleSidebar = (event: Event) => {
  console.log('Emitting toggle-sidebar from PrivateHeader');
  emit('toggle-sidebar');
};

onMounted(() => {
  const storedData = localStorage.getItem('userData');
  if (storedData) {
    try {
      const parsed = JSON.parse(storedData);
      const first = parsed.first_name || parsed.user?.first_name || '';
      const last = parsed.last_name || parsed.user?.last_name || '';
      userName.value = `${first} ${last}`.trim();
    } catch (e) {
      console.error('Error parsing userData from localStorage:', e);
    }
  }
});

const handleLogout = () => {
  localStorage.clear();
  sessionStorage.clear();
  router.push('/home');
};
</script>

<style lang="scss" scoped>
.private-header {
  background: #2c3e50;
  color: white;
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 1001;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  box-sizing: border-box;

  .header-left {
    display: flex;
    align-items: center;
    flex: 1;

    .logo {
      color: white;
      text-decoration: none;
      font-size: 1.6rem;
      font-weight: 700;
      transition: opacity 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;

      &:hover {
        opacity: 0.9;
      }

      span {
        background: linear-gradient(45deg, #007bff, #00d4ff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }

    .menu-toggle {
      background: none;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      font-size: 1.8rem;
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      margin-left: 12px;
      z-index: 1003;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: scale(1.05);
      }

      &:active {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(0.98);
      }

      svg {
        width: 24px;
        height: 24px;
        stroke: white;
      }
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    flex: 1;
    justify-content: flex-end;

    .user-info {
      display: flex;
      align-items: center;
      gap: 20px;

      span {
        font-size: 0.95rem;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.9);
      }

      .logout-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        cursor: pointer;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 0.9rem;
        font-weight: 500;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 6px;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }

        &:active {
          transform: translateY(0);
        }

        i {
          font-size: 1rem;
        }
      }
    }
  }
}

@media (max-width: 488px) {
  .private-header {
    padding: 0 16px;

    .header-left {
      .logo {
        font-size: 1.4rem;
      }

      .menu-toggle {
        width: 36px;
        height: 36px;
      }
    }

    .header-right .user-info {
      gap: 12px;

      span {
        display: none;
      }

      .logout-btn {
        padding: 6px 12px;
        font-size: 0.85rem;
      }
    }
  }
}

@media (max-width: 480px) {
  .private-header {
    .header-right .user-info .logout-btn {
      span {
        display: none;
      }
    }
  }
}
</style>