<template>
  <div v-if="isLoading" class="loading-spinner">
    <Loader :loading-text="'Loading tenants dashboard...'" />
  </div>
  <div v-else-if="showError" class="error-message">
    <p>{{ errorMessage }}</p>
  </div>
  <div v-else class="dashboard-content">
    <div class="welcome-header">
      <h1>Welcome back!</h1>
      <p>Here's what's happening with your account today.</p>
    </div>

    <!-- Metric Cards -->
    <div class="metrics-grid" v-if="dashboardItems.length > 0">
      <div class="metric-card" role="region" v-for="item in dashboardItems" :key="item.id" :class="item.type" :aria-label="`Metric: ${item.title} - ${item.value}`">
        <div class="metric-icon">{{ getIcon(item.type) }}</div>
        <div class="metric-content">
          <div class="metric-value">{{ item.value }}</div>
          <div class="metric-title">{{ item.title }}</div>
          <div class="metric-change" :class="{ up: item.change === 'up', down: item.change === 'down' }" v-if="item.change">
            {{ item.change === 'up' ? '↑' : '↓' }}
          </div>
        </div>
      </div>
    </div>
    <div v-else class="no-data-message">
      <p>No dashboard metrics available at the moment.</p>
    </div>

    <!-- Lease Counters Section -->
    <div class="lease-counters-section" v-if="leaseCounters.length > 0">
      <div class="lease-counter" v-for="lease in leaseCounters" :key="lease.id" :aria-label="`Lease: ${lease.title}, Due: ${lease.dueDate}`">
        <div class="lease-info">
          <h3>{{ lease.title }}</h3>
          <p class="due-date">Due Date ( {{ lease.dueDate }} )</p>
        </div>
        <div class="countdown-display">
          <!-- **FIX: Use computed isExpired instead of countdown.expired** -->
          <template v-if="lease.isExpired">
            <div class="expired-message">Expired</div>
          </template>
          <template v-else>
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
          </template>
        </div>
      </div>
    </div>

    <!-- Recent Activity Section -->
    <div class="activity-section" v-if="recentActivities.length > 0">
      <h2>Recent Activity</h2>
      <div class="activity-table table-responsive">
        <table>
          <thead>
            <tr>
              <th data-key="date">Date</th>
              <th data-key="action">Action</th>
              <th data-key="details">Details</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="activity in recentActivities" :key="activity.id">
              <td data-key="date">{{ activity.date }}</td>
              <td data-key="action">{{ activity.action }}</td>
              <td data-key="details">{{ activity.details }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import makeRequest from '../../../services/makeRequest';

// **FIX: Updated Countdown interface - removed expired property**
interface Countdown {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

// **FIX: Updated LeaseCounter interface - added isExpired boolean**
interface LeaseCounter {
  id: number;
  title: string;
  dueDate: string;
  leaseEndDate: Date;
  countdown: Countdown;
  isExpired: boolean;  // **NEW: Explicit expired flag**
}

// Interface for dashboard item
interface DashboardItem {
  id: number;
  title: string;
  value: string;
  type: string;
  change?: string;
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

// Get icon based on type
const getIcon = (type: string): string => {
  switch (type) {
    case 'total-properties':
      return '🏘️';
    case 'application-count':
      return '📝';
    case 'lease-expiry':
      return '📅';
    case 'pending-bookings':
      return '🕒';
    default:
      return '🏠';
  }
};

// **FIX: Updated updateCountdown to set isExpired flag**
const updateCountdown = () => {
  leaseCounters.value.forEach(lease => {
    const now = new Date();
    const endDate = new Date(lease.leaseEndDate);
    const difference = endDate.getTime() - now.getTime();

    // **NEW: Set isExpired flag**
    lease.isExpired = difference <= 0;

    if (!lease.isExpired) {
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
      // Expired lease - set zeros
      lease.countdown = {
        days: '00',
        hours: '00',
        minutes: '00',
        seconds: '00'
      };
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
      throw new Error('Invalid response format or API error: ' + (response.data.message || 'Unknown error'));
    }

    const dashboardData = response.data.data;
    dashboardItems.value = dashboardData.dashboardItems || [];
    recentActivities.value = dashboardData.recentActivities || [];
    
    // **FIX: Initialize with isExpired property**
    leaseCounters.value = (dashboardData.leaseCounters || []).map((lease: any) => {
      const leaseEndDate = new Date(lease.leaseEndDate);
      const now = new Date();
      const isExpired = leaseEndDate.getTime() <= now.getTime();
      
      return {
        ...lease,
        leaseEndDate,
        isExpired,  // **NEW: Initialize isExpired**
        countdown: {
          days: '00',
          hours: '00',
          minutes: '00',
          seconds: '00'
        }
      };
    });

    // Initial countdown update
    updateCountdown();
  } catch (error: any) {
    console.error('Error fetching dashboard:', error);
    showError.value = true;
    errorMessage.value = error.message || error.response?.data?.message || 'Failed to fetch dashboard data. Please check your connection or login again.';
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
.dashboard-content {
  padding: 0.75rem;
  width: 100%;
  box-sizing: border-box;

  @media screen and (min-width: 768px) {
    padding: 1.5rem;
  }
}

.welcome-header {
  margin-bottom: 1rem;
  text-align: left;

  h1 {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 0.5rem;

    @media screen and (min-width: 768px) {
      font-size: 1.875rem;
    }
  }

  p {
    font-size: 0.75rem;
    color: #6b7280;

    @media screen and (min-width: 768px) {
      font-size: 1rem;
    }
  }
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  padding: 0.5rem;
  margin-bottom: 1rem;

  @media screen and (min-width: 640px) {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  @media screen and (min-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    padding: 1rem;
    gap: 1.5rem;
  }
}

.metric-card {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  min-height: 80px;
  position: relative;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  &.total-properties {
    background-color: #f0fdf4;
    .metric-icon {
      background-color: #dcfce7;
      color: #15803d;
    }
  }

  &.application-count {
    background-color: #fefce8;
    .metric-icon {
      background-color: #fef9c3;
      color: #a16207;
    }
  }

  &.lease-expiry {
    background-color: #fef2f2;
    .metric-icon {
      background-color: #fee2e2;
      color: #b91c1c;
    }
  }

  &.pending-bookings {
    background-color: #f0f9ff;
    .metric-icon {
      background-color: #e0f2fe;
      color: #1e40af;
    }
  }
}

.metric-icon {
  font-size: 1.25rem;
  background-color: #f3f4f6;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  @media screen and (min-width: 768px) {
    font-size: 2rem;
    width: 48px;
    height: 48px;
  }
}

.metric-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.25rem;
  line-height: 1.2;

  @media screen and (min-width: 768px) {
    font-size: 1.75rem;
  }
}

.metric-title {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 0.25rem;

  @media screen and (min-width: 768px) {
    font-size: 0.95rem;
  }
}

.metric-change {
  font-size: 0.625rem;
  font-weight: 600;
  position: absolute;
  right: 0.75rem;
  top: 0.75rem;

  @media screen and (min-width: 768px) {
    font-size: 0.85rem;
    right: 1.5rem;
    top: 1.5rem;
  }
}

.up {
  color: #10b981;
}

.down {
  color: #ef4444;
}

.lease-counters-section {
  margin-bottom: 1rem;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  padding: 0.5rem;

  @media screen and (min-width: 640px) {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1rem;
  }

  @media screen and (min-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    padding: 1rem;
    gap: 1.5rem;
  }
}

.lease-counter {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  @media screen and (min-width: 768px) {
    padding: 1.5rem;
  }
}

.lease-info {
  margin-bottom: 0.5rem;

  h3 {
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;

    @media screen and (min-width: 768px) {
      font-size: 1.25rem;
    }
  }

  .due-date {
    font-size: 0.75rem;
    color: #6b7280;

    @media screen and (min-width: 768px) {
      font-size: 0.9rem;
    }
  }
}

.countdown-display {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background-color: #f9fafb;
  padding: 0.5rem;
  border-radius: 6px;
  justify-content: center;
  flex-wrap: wrap;

  @media screen and (min-width: 768px) {
    padding: 0.75rem;
    border-radius: 8px;
    flex-wrap: nowrap;
  }

  .time-group {
    text-align: center;
    flex: 1;
    min-width: 48px;

    .time-label {
      font-size: 0.625rem;
      color: #6b7280;
      margin-bottom: 0.25rem;
      text-transform: uppercase;

      @media screen and (min-width: 768px) {
        font-size: 0.8rem;
      }
    }

    .time-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: #1f2937;
      background-color: #ffffff;
      padding: 0.25rem;
      border-radius: 4px;
      min-width: 36px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

      @media screen and (min-width: 768px) {
        font-size: 1.25rem;
        min-width: 50px;
        padding: 0.5rem;
      }
    }
  }

  .expired-message {
    font-size: 0.875rem;
    font-weight: 600;
    color: #ef4444;
    text-align: center;
    width: 100%;
    padding: 0.5rem;

    @media screen and (min-width: 768px) {
      font-size: 1rem;
    }
  }

  .separator {
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 600;

    @media screen and (min-width: 768px) {
      font-size: 1.25rem;
    }
  }
}

.activity-section {
  padding: 0.5rem;

  @media screen and (min-width: 768px) {
    padding: 1.5rem;
  }

  h2 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.5rem;

    @media screen and (min-width: 768px) {
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }
  }
}

.activity-table {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 400px; /* Ensures table is scrollable on small screens */

    th,
    td {
      padding: 0.5rem;
      text-align: left;
      font-size: 0.75rem;

      @media screen and (min-width: 768px) {
        padding: 1rem;
        font-size: 0.95rem;
      }
    }

    th {
      background-color: #f9fafb;
      font-weight: 600;
      color: #1f2937;
      border-bottom: 1px solid #e5e7eb;
      white-space: nowrap;
    }

    td {
      color: #4b5563;
      border-bottom: 1px solid #e5e7eb;
      white-space: nowrap;

      &:last-child {
        border-bottom: none;
      }
    }

    tr:last-child td {
      border-bottom: none;
    }
  }
}

.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  padding: 0.5rem;

  @media screen and (min-width: 768px) {
    padding: 1rem;
  }
}

.error-message {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  color: #ef4444;
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
  padding: 0.75rem;

  @media screen and (min-width: 768px) {
    font-size: 1.25rem;
    padding: 2rem;
  }
}

.no-data-message {
  text-align: center;
  color: #6b7280;
  font-size: 0.75rem;
  margin-bottom: 1rem;

  @media screen and (min-width: 768px) {
    font-size: 1rem;
    margin-bottom: 2rem;
  }
}

@media (max-width: 640px) {
  .dashboard-content {
    padding: 0.5rem;
  }

  .welcome-header {
    h1 {
      font-size: 1rem;
    }
    p {
      font-size: 0.625rem;
    }
  }

  .metrics-grid {
    gap: 0.5rem;
    padding: 0.25rem;
  }

  .metric-card {
    padding: 0.5rem;
    min-height: 70px;
  }

  .metric-icon {
    font-size: 1rem;
    width: 32px;
    height: 32px;
  }

  .metric-value {
    font-size: 1rem;
  }

  .metric-title {
    font-size: 0.625rem;
  }

  .metric-change {
    font-size: 0.5rem;
    right: 0.5rem;
    top: 0.5rem;
  }

  .lease-counters-section {
    gap: 0.5rem;
    padding: 0.25rem;
  }

  .lease-counter {
    padding: 0.5rem;
  }

  .lease-info {
    h3 {
      font-size: 0.875rem;
    }
    .due-date {
      font-size: 0.625rem;
    }
  }

  .countdown-display {
    gap: 0.125rem;
    padding: 0.25rem;

    .time-group {
      min-width: 40px;
    }

    .time-label {
      font-size: 0.5rem;
    }

    .time-value {
      font-size: 0.75rem;
      min-width: 32px;
      padding: 0.25rem;
    }

    .expired-message {
      font-size: 0.75rem;
      padding: 0.25rem;
    }

    .separator {
      font-size: 0.75rem;
    }
  }

  .activity-section {
    padding: 0.25rem;

    h2 {
      font-size: 1rem;
      margin-bottom: 0.5rem;
    }
  }

  .table-responsive {
    th[data-key="date"],
    td[data-key="date"] {
      display: none; /* Hide Date column on mobile to reduce clutter */
    }

    th[data-key="action"],
    td[data-key="action"] {
      min-width: 100px;
    }

    th[data-key="details"],
    td[data-key="details"] {
      min-width: 120px;
    }
  }
}

@media (max-width: 480px) {
  .dashboard-content {
    padding: 0.25rem;
  }

  .welcome-header {
    h1 {
      font-size: 0.875rem;
    }
    p {
      font-size: 0.5rem;
    }
  }

  .metrics-grid {
    gap: 0.25rem;
  }

  .metric-card {
    padding: 0.25rem;
    min-height: 60px;
  }

  .metric-icon {
    font-size: 0.875rem;
    width: 28px;
    height: 28px;
  }

  .metric-value {
    font-size: 0.875rem;
  }

  .metric-title {
    font-size: 0.5rem;
  }

  .lease-counter {
    padding: 0.25rem;
  }

  .lease-info {
    h3 {
      font-size: 0.75rem;
    }
    .due-date {
      font-size: 0.5rem;
    }
  }

  .countdown-display {
    .time-value {
      font-size: 0.625rem;
      min-width: 28px;
    }

    .expired-message {
      font-size: 0.625rem;
    }

    .separator {
      font-size: 0.625rem;
    }
  }

  .activity-section {
    h2 {
      font-size: 0.875rem;
    }
  }

  .table-responsive {
    table {
      min-width: 300px;
    }

    th,
    td {
      font-size: 0.625rem;
      padding: 0.25rem;
    }
  }

  .error-message {
    font-size: 0.875rem;
    padding: 0.5rem;
  }

  .no-data-message {
    font-size: 0.625rem;
  }
}
</style>