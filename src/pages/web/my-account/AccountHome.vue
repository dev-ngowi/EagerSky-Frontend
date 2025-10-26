<template>
  <div class="account-home">
    <!-- Welcome Header -->
    <div class="welcome-header">
      <h1>Welcome back!</h1>
      <p>Here's what's happening with your account today.</p> 
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading text-center p-6">
      <div class="spinner"></div>
      <p>Loading dashboard...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="showError" class="error-message text-center p-6">
      <div class="error-content bg-white rounded-2xl shadow-xl p-6 max-w-md mx-auto">
        <i class="bi bi-exclamation-triangle text-4xl text-yellow-500 mb-4" aria-hidden="true"></i>
        <h3 class="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h3>
        <p class="text-gray-600 mb-6">{{ errorMessage }}</p>
        <button
          class="cta-button bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          @click="fetchDashboard"
          aria-label="Retry loading dashboard"
        >
          Try Again
        </button>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div v-else>
      <!-- Dashboard Cards -->
      <div class="dashboard-grid">
        <div class="dashboard-card" v-for="item in dashboardItems" :key="item.id" :class="item.type">
          <i :class="item.icon"></i>
          <h3>{{ item.title }}</h3>
          <p>{{ item.value }}</p>
        </div>
      </div>
      
      <!-- Lease Counters Section -->
      <div class="lease-counters-section">
        <div class="lease-counter" v-for="lease in leaseCounters" :key="lease.id">
          <div class="lease-info">
            <h3>{{ lease.title }}</h3>
            <p class="due-date">Due Date ( {{ lease.dueDate }} )</p>
          </div>
          <div class="countdown-display">
            <div class="time-group">
              <span class="time-label">Days</span>
              <div class="time-value">{{ lease.countdown.days }}</div>
            </div>
            <div class="separator">:</div>
            <div class="time-group">
              <span class="time-label">Hours</span>
              <div class="time-value">{{ lease.countdown.hours }}</div>
            </div>
            <div class="separator">:</div>
            <div class="time-group">
              <span class="time-label">Minutes</span>
              <div class="time-value">{{ lease.countdown.minutes }}</div>
            </div>
            <div class="separator">:</div>
            <div class="time-group">
              <span class="time-label">Seconds</span>
              <div class="time-value">{{ lease.countdown.seconds }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Recent Activity Section -->
      <div class="activity-section">
        <h2>Recent Activity</h2>
        <div class="activity-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="activity in recentActivities" :key="activity.id">
                <td>{{ activity.date }}</td>
                <td>{{ activity.action }}</td>
                <td>{{ activity.details }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import makeRequest from '../../../services/makeRequest';

// Interface for countdown object
interface Countdown {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

// Interface for lease counter
interface LeaseCounter {
  id: number;
  title: string;
  dueDate: string;
  leaseEndDate: Date;
  countdown: Countdown;
}

// Interface for dashboard item
interface DashboardItem {
  id: number;
  icon: string;
  title: string;
  value: string;
  type: string;
}

// Interface for recent activity
interface RecentActivity {
  id: number;
  date: string;
  action: string;
  details: string;
}

interface UserData {
  id: number;
  token: string;
  expiresAt: number;
}

const router = useRouter();
const isLoading = ref(true);
const showError = ref(false);
const errorMessage = ref('');
const dashboardItems = ref<DashboardItem[]>([]);
const leaseCounters = ref<LeaseCounter[]>([]);
const recentActivities = ref<RecentActivity[]>([]);

let countdownInterval: number | NodeJS.Timeout | null = null;

// Calculate countdown
const updateCountdown = () => {
  leaseCounters.value.forEach(lease => {
    const now = new Date().getTime();
    const endDate = new Date(lease.leaseEndDate).getTime();
    const difference = endDate - now;

    if (difference > 0) {
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      lease.countdown = {
        days: days.toString().padStart(2, '0'),
        hours: hours.toString().padStart(2, '0'),
        minutes: minutes.toString().padStart(2, '0'),
        seconds: seconds.toString().padStart(2, '0')
      };
    } else {
      lease.countdown = { days: '00', hours: '00', minutes: '00', seconds: '00' };
    }
  });
};

const getUserData = (): UserData | null => {
  const userDataString = localStorage.getItem('userData');
  if (!userDataString) return null;

  try {
    const userData = JSON.parse(userDataString);
    if (!userData.id || !userData.token || !userData.expiresAt) return null;
    if (userData.expiresAt < Date.now()) {
      localStorage.removeItem('userData');
      return null;
    }
    return userData;
  } catch (error) {
    console.error('Error parsing userData:', error);
    return null;
  }
};

const fetchDashboard = async () => {
  isLoading.value = true;
  showError.value = false;
  errorMessage.value = '';

  const userData = getUserData();
  if (!userData) {
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
    return;
  }

  try {
    const response = await makeRequest({
      method: 'GET',
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/private-dashboard`,
      headers: { Authorization: `Bearer ${userData.token}` },
      requiresAuth: true,
    });

    if (!response.data.success) {
      throw new Error('Invalid response format');
    }

    const dashboardData = response.data.data;
    dashboardItems.value = dashboardData.dashboardItems || [];
    recentActivities.value = dashboardData.recentActivities || [];
    leaseCounters.value = (dashboardData.leaseCounters || []).map((lease: any) => ({
      ...lease,
      leaseEndDate: new Date(lease.leaseEndDate),
      countdown: { days: '00', hours: '00', minutes: '00', seconds: '00' }
    }));

    updateCountdown();
  } catch (error: any) {
    console.error('Error fetching dashboard:', error);
    showError.value = true;
    errorMessage.value = error.response?.data?.message || 'Failed to fetch dashboard data.';
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  const userData = getUserData();
  if (!userData) {
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
    return;
  }
  fetchDashboard();
  countdownInterval = setInterval(updateCountdown, 1000);
});

onUnmounted(() => {
  if (countdownInterval !== null) {
    clearInterval(countdownInterval);
  }
});
</script>

<style lang="scss" scoped>
.account-home {
  width: 100%;
  
  .welcome-header {
    margin-bottom: 32px;
    padding-bottom: 24px;
    border-bottom: 1px solid #e9ecef;
    
    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      color: #2c3e50;
      margin: 0 0 8px 0;
      line-height: 1.2;
    }
    
    p {
      font-size: 1.1rem;
      color: #6c757d;
      margin: 0;
      font-weight: 400;
    }
  }
  
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 24px;
    margin-bottom: 40px;
    
    .dashboard-card {
      background: white;
      padding: 32px 24px;
      border-radius: 16px;
      border: 1px solid #e9ecef;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
      text-align: center;
      
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #007bff, #0056b3);
      }
      
      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      }
      
      i {
        font-size: 3rem;
        color: #007bff;
        margin-bottom: 16px;
        display: block;
      }
      
      h3 {
        margin: 0 0 12px 0;
        font-size: 0.9rem;
        color: #495057;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      p {
        margin: 0;
        font-size: 2.2rem;
        color: #2c3e50;
        font-weight: 700;
        line-height: 1;
      }
    }
  }
  
  .lease-counters-section {
    background: #4a5568;
    border-radius: 16px;
    padding: 32px;
    margin-bottom: 40px;
    display: flex;
    gap: 32px;
    
    .lease-counter {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      
      .lease-info {
        text-align: center;
        margin-bottom: 24px;
        
        h3 {
          color: white;
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .due-date {
          color: #cbd5e0;
          font-size: 0.9rem;
          margin: 0;
        }
      }
      
      .countdown-display {
        display: flex;
        align-items: center;
        gap: 16px;
        
        .time-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          
          .time-label {
            color: #a0aec0;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          
          .time-value {
            background: #2d3748;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 1.5rem;
            font-weight: 700;
            min-width: 60px;
            text-align: center;
            border: 1px solid #4a5568;
          }
        }
        
        .separator {
          color: #718096;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 4px;
          margin-top: 20px;
        }
      }
      
      &:not(:last-child)::after {
        content: '';
        position: absolute;
        right: -16px;
        top: 50%;
        transform: translateY(-50%);
        width: 1px;
        height: 60%;
        background: #718096;
      }
    }
  }
  
  .activity-section {
    background: white;
    border-radius: 16px;
    border: 1px solid #e9ecef;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    
    h2 {
      font-size: 1.5rem;
      color: #2c3e50;
      margin: 0;
      padding: 32px 32px 0 32px;
      font-weight: 600;
    }
    
    .activity-table {
      padding: 24px 32px 32px 32px;
      
      table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        
        thead {
          tr {
            th {
              padding: 16px 16px;
              text-align: left;
              background: #f8f9fa;
              color: #495057;
              font-weight: 600;
              font-size: 0.85rem;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border: none;
              position: relative;
              
              &:first-child {
                border-top-left-radius: 8px;
                border-bottom-left-radius: 8px;
              }
              
              &:last-child {
                border-top-right-radius: 8px;
                border-bottom-right-radius: 8px;
              }
              
              &:not(:last-child)::after {
                content: '';
                position: absolute;
                right: 0;
                top: 20%;
                bottom: 20%;
                width: 1px;
                background: #dee2e6;
              }
            }
          }
        }
        
        tbody {
          tr {
            transition: all 0.2s ease;
            
            &:hover {
              background: #f8f9fa;
            }
            
            td {
              padding: 20px 16px;
              color: #495057;
              font-size: 0.95rem;
              vertical-align: middle;
              border-bottom: 1px solid #f1f3f4;
              
              &:first-child {
                font-weight: 500;
                color: #6c757d;
                font-size: 0.9rem;
              }
              
              &:nth-child(2) {
                font-weight: 600;
                color: #007bff;
              }
              
              &:last-child {
                color: #6c757d;
              }
            }
            
            &:last-child td {
              border-bottom: none;
            }
          }
        }
      }
    }
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .account-home {
    .welcome-header {
      text-align: center;
      margin-bottom: 24px;
      
      h1 {
        font-size: 2rem;
      }
      
      p {
        font-size: 1rem;
      }
    }
    
    .dashboard-grid {
      grid-template-columns: 1fr;
      gap: 16px;
      margin-bottom: 32px;
      
      .dashboard-card {
        padding: 24px 20px;
        
        i {
          font-size: 2.5rem;
        }
        
        p {
          font-size: 1.8rem;
        }
      }
    }
    
    .lease-counters-section {
      flex-direction: column;
      gap: 24px;
      padding: 24px;
      
      .lease-counter {
        .countdown-display {
          gap: 8px;
          
          .time-group .time-value {
            padding: 8px 12px;
            font-size: 1.2rem;
            min-width: 50px;
          }
          
          .separator {
            font-size: 1.2rem;
          }
        }
        
        &:not(:last-child)::after {
          display: none;
        }
      }
    }
    
    .activity-section {
      h2 {
        padding: 24px 24px 0 24px;
        font-size: 1.3rem;
      }
      
      .activity-table {
        padding: 20px 24px 24px 24px;
        overflow-x: auto;
        
        table {
          min-width: 600px;
          
          th, td {
            padding: 12px;
            font-size: 0.85rem;
          }
        }
      }
    }
  }
}

// Animation for seconds counter
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.lease-counters-section .countdown-display .time-group:last-of-type .time-value {
  animation: pulse 1s ease-in-out infinite;
}

.loading .spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #2563eb;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

.loading p {
  color: #4b5563;
  font-size: clamp(0.9rem, 2vw, 1rem);
}

.error-message .error-content i {
  display: block;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>