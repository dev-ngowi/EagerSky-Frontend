import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

export function useSidebarState() {
  const windowWidth = ref(window.innerWidth);
  const isMobile = computed(() => windowWidth.value <= 488);
  const isSidebarOpen = ref(!isMobile.value);

  const handleResize = () => {
    windowWidth.value = window.innerWidth;
  };

  watch(isMobile, (newIsMobile, oldIsMobile) => {
    if (newIsMobile && !oldIsMobile) {
      isSidebarOpen.value = false;
    } else if (!newIsMobile && oldIsMobile) {
      isSidebarOpen.value = true;
    }
  });

  watch(isSidebarOpen, (newVal) => {
    if (isMobile.value) {
      document.body.style.overflow = newVal ? 'hidden' : 'auto';
      document.documentElement.style.overflow = newVal ? 'hidden' : 'auto';
    } else {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
    }
  }, { immediate: true });

  const toggleSidebar = () => {
    isSidebarOpen.value = !isSidebarOpen.value;
  };

  const closeSidebar = () => {
    if (isSidebarOpen.value) {
      isSidebarOpen.value = false;
    }
  };

  onMounted(() => {
    window.addEventListener('resize', handleResize);
    if (isMobile.value) {
      isSidebarOpen.value = false;
    } else {
      isSidebarOpen.value = true;
    }
  });

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
  });

  return {
    isSidebarOpen,
    isMobile,
    toggleSidebar,
    closeSidebar,
  };
}