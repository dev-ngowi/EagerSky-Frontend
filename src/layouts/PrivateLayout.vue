<template>
  <div class="private-layout">
    <PrivateHeader @toggle-sidebar="toggleSidebar" :is-sidebar-open="isSidebarOpen" />
    <div class="private-content">
      <PrivateSidebar 
        :class="{ 'sidebar-closed': !isSidebarOpen }" 
        @close-sidebar="closeSidebar" 
        :is-sidebar-open="isSidebarOpen"
        @click.stop
      />
      <main class="main-content" :class="{ 'sidebar-closed': !isSidebarOpen }">
        <div class="content-wrapper">
          <router-view />
        </div>
      </main>
    </div>

    <div 
      v-if="isSidebarOpen && isMobile" 
      class="sidebar-overlay" 
      @click="closeSidebar"
    ></div>

    <a href="#" id="scroll-top" class="scroll-top d-flex align-items-center justify-content-center">
      <i class="bi bi-arrow-up-short"></i>
    </a>
    <div id="preloader" style="display: none;"></div>
  </div>
</template>

<script lang="ts" setup>
import { onUnmounted, ref } from 'vue';
import PrivateHeader from '../components/PrivateHeader.vue';
import PrivateSidebar from '../components/PrivateSidebar.vue';
import { useSidebarState } from '../composables/useSidebarState';

const { isSidebarOpen, isMobile, toggleSidebar, closeSidebar } = useSidebarState();
const lastToggleTime = ref(0);

const handleClickOutside = (event: Event) => {
  if (!isMobile.value) return;
  const now = Date.now();
  if (now - lastToggleTime.value < 200) {
    console.log('Ignoring click-outside due to recent toggle');
    return;
  }
  const sidebar = document.querySelector('.sidebar');
  const menuToggle = document.querySelector('.menu-toggle');
  
  if (
    isSidebarOpen.value &&
    sidebar &&
    !sidebar.contains(event.target as Node) &&
    menuToggle &&
    !menuToggle.contains(event.target as Node)
  ) {
    console.log('Click outside detected, closing sidebar', { target: (event.target as HTMLElement)?.className });
    closeSidebar();
  }
};

const closeSidebarHandler = () => {
  console.log('close-sidebar event received in PrivateLayout');
  closeSidebar();
};

document.addEventListener('click', handleClickOutside);

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style lang="scss" scoped>
@import '../scss/variables';

.private-layout {
  font-family: 'Poppins', sans-serif;
  min-height: 100vh;
  background: #f8f9fa;
  position: relative;
  overflow-x: hidden;
}

.private-content {
  display: flex;
  min-height: 100vh;
  padding-top: 60px;
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}

.sidebar-overlay:not(.hidden) {
  opacity: 1;
  visibility: visible;
}

.main-content {
  flex: 1;
  background: #f8f9fa;
  min-height: calc(100vh - 60px);
  overflow-y: auto;
  transition: margin-left 0.3s ease;

  .content-wrapper {
    padding: 30px;
    max-width: 1400px;
    margin: 0 auto;
    
    :deep(.dashboard-grid) {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
      
      .dashboard-card {
        background: white;
        padding: 24px;
        border-radius: 12px;
        border: 1px solid #e9ecef;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        transition: all 0.3s ease;
        
        &:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
          transform: translateY(-2px);
        }
        
        i {
          font-size: 2.5rem;
          color: #007bff;
          margin-bottom: 16px;
          display: block;
        }
        
        h3 {
          margin: 0 0 8px 0;
          font-size: 1.1rem;
          color: #2c3e50;
          font-weight: 600;
        }
        
        p {
          margin: 0;
          font-size: 1.8rem;
          color: #007bff;
          font-weight: 700;
        }
      }
    }
    
    :deep(.activity-section) {
      background: white;
      border-radius: 12px;
      border: 1px solid #e9ecef;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      
      h2 {
        font-size: 1.5rem;
        color: #2c3e50;
        margin: 0 0 24px 0;
        padding: 24px 24px 0 24px;
        font-weight: 600;
      }
      
      .activity-table {
        padding: 0 24px 24px 24px;
        
        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          
          thead {
            tr {
              th {
                padding: 16px 12px;
                text-align: left;
                background: #f8f9fa;
                color: #495057;
                font-weight: 600;
                font-size: 0.9rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 2px solid #e9ecef;
                
                &:first-child {
                  border-top-left-radius: 8px;
                }
                
                &:last-child {
                  border-top-right-radius: 8px;
                }
              }
            }
          }
          
          tbody {
            tr {
              transition: background-color 0.2s ease;
              
              &:hover {
                background: #f8f9fa;
              }
              
              &:not(:last-child) {
                border-bottom: 1px solid #e9ecef;
              }
              
              td {
                padding: 16px 12px;
                color: #495057;
                font-size: 0.95rem;
                vertical-align: middle;
                
                &:first-child {
                  font-weight: 500;
                  color: #6c757d;
                }
                
                &:nth-child(2) {
                  font-weight: 600;
                  color: #007bff;
                }
              }
            }
          }
        }
      }
    }
  }
}

.scroll-top {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 48px;
  height: 48px;
  background: #007bff;
  color: #fff;
  border-radius: 50%;
  z-index: 1000;
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
  transition: all 0.3s ease;
  
  &:hover {
    background: #0056b3;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 123, 255, 0.4);
  }
  
  i {
    font-size: 1.5rem;
  }
}

@media (min-width: 489px) {
  .main-content {
    margin-left: 280px;
    
    &.sidebar-closed {
      margin-left: 0;
    }
  }
}

@media (max-width: 488px) {
  .main-content {
    margin-left: 0;
    
    .content-wrapper {
      padding: 20px;
      
      :deep(.dashboard-grid) {
        grid-template-columns: 1fr;
        gap: 16px;
        margin-bottom: 24px;
      }
    }
  }
}

@media (max-width: 480px) {
  .private-content {
    flex-direction: column;
  }
  
  .main-content {
    .content-wrapper {
      padding: 16px;
      
      :deep(.activity-section) {
        h2 {
          padding: 20px 20px 0 20px;
          font-size: 1.3rem;
        }
        
        .activity-table {
          padding: 0 20px 20px 20px;
          overflow-x: auto;
          
          table {
            min-width: 500px;
            
            th, td {
              padding: 12px 8px;
              font-size: 0.85rem;
            }
          }
        }
      }
    }
  }
}

:deep(.account-home) {
  width: 100%;
  max-width: none;
}
</style>