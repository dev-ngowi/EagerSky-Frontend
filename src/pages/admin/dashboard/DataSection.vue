<template>
  <div v-if="loading" class="loading-spinner">
    <Loader :loading-text="'Loading real estate dashboard...'" />
  </div>
  <div v-else class="dashboard-content">
    <!-- Metric Cards -->
    <div class="metrics-grid">
      <div
        v-for="(metric, index) in metrics"
        :key="metric.title"
        class="metric-card"
        role="region"
        :aria-label="`${metric.title}: ${metric.value}`"
      >
        <div class="metric-icon">{{ metric.icon }}</div>
        <div class="metric-content">
          <div class="metric-value">{{ metric.value }}</div>
          <div class="metric-title">{{ metric.title }}</div>
          <div class="metric-change" :class="metric.change">{{ metric.change === 'up' ? '↑' : '↓' }}</div>
        </div>
      </div>
    </div>

    <!-- Chart Section -->
    <div class="charts-grid">
      <!-- Period Selector and Pie Chart -->
      <div class="chart-section">
        <div class="period-selector">
          <label for="period">Select Period:</label>
          <select id="period" v-model="period" @change="fetchAnalyticsData" aria-label="Select data period">
            <option value="week">Week</option>
            <option value="month" selected>Month</option>
            <option value="year">Year</option>
          </select>
        </div>
        <h3 class="chart-title">Tenant Status Distribution</h3>
        <div class="chart-container">
          <canvas
            id="tenantStatusChart"
            role="img"
            :aria-label="`Tenant Status Distribution: Active ${tenantStatusData[0] || 0}, Overdue ${tenantStatusData[1] || 0}, Vacant ${tenantStatusData[2] || 0}`"
          ></canvas>
        </div>
      </div>

      <!-- Line Chart -->
      <div class="chart-section">
        <h3 class="chart-title">Tenant Count Trend</h3>
        <div class="chart-container">
          <canvas id="tenantTrendChart" role="img" :aria-label="`Tenant Count Trend Over Time`"></canvas>
        </div>
      </div>
    </div>

    <!-- Top Selling Properties Table -->
    <div class="table-section">
      <h3 class="chart-title">Top Selling Properties</h3>
      <div class="table-container table-responsive">
        <table class="properties-table">
          <thead>
            <tr>
              <th data-key="index">#</th>
              <th data-key="title">Title</th>
              <th data-key="application_count">Rental Applications</th>
              <th data-key="lease_count">Leases</th>
              <th data-key="total_activity">Total Activity</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(property, index) in topProperties" :key="property.id">
              <td data-key="index">{{ (pagination.current_page - 1) * pagination.per_page + index + 1 }}</td>
              <td data-key="title">{{ property.title || 'N/A' }}</td>
              <td data-key="application_count">{{ property.application_count || 0 }}</td>
              <td data-key="lease_count">{{ property.lease_count || 0 }}</td>
              <td data-key="total_activity">{{ property.total_activity || 0 }}</td>
            </tr>
            <tr v-if="topProperties.length === 0">
              <td colspan="5" class="text-center">No properties found</td>
            </tr>
          </tbody>
        </table>
        <!-- Pagination Controls -->
        <div class="pagination-controls" v-if="pagination.total > 0">
          <button
            :disabled="pagination.current_page === 1"
            @click="fetchTopProperties(pagination.current_page - 1)"
            class="pagination-button"
            :aria-label="'Go to previous page'"
          >
            Previous
          </button>
          <span class="pagination-info">
            Page {{ pagination.current_page }} of {{ pagination.last_page }} ({{ pagination.total }} properties)
          </span>
          <button
            :disabled="pagination.current_page === pagination.last_page"
            @click="fetchTopProperties(pagination.current_page + 1)"
            class="pagination-button"
            :aria-label="'Go to next page'"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import Loader from '../../../components/Loader.vue';
import Chart from 'chart.js/auto';
import type { Chart as ChartJS, ChartConfiguration } from 'chart.js';
import { useToast } from 'vuestic-ui';

export default defineComponent({
  name: 'DataSection',
  components: {
    Loader,
  },
  setup() {
    const { init } = useToast();
    const loading = ref(true);
    const period = ref('month');
    const metrics = ref([
      { value: '0', title: 'Tenant Count', change: 'up', icon: '🏠' },
      { value: '0', title: 'Pending Bookings', change: 'up', icon: '📝' },
      { value: '0', title: 'Occupancy Rate', change: 'up', icon: '📊' },
    ]);
    const tenantStatusData = ref([0, 0, 0]); // Active, Overdue, Vacant
    const trendLabels = ref<string[]>([]);
    const trendData = ref<number[]>([]);
    const topProperties = ref<any[]>([]);
    const pagination = ref({
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    });
    let chartInstance: ChartJS<'doughnut', number[], string> | null = null;
    let trendChartInstance: ChartJS<'line', number[], string> | null = null;

    // Base API URL from Vite config
    const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL;

    // Fallback data in case API fails
    const fallbackMetrics = [
      { value: '10', title: 'Tenant Count', change: 'up', icon: '🏠' },
      { value: '5', title: 'Pending Bookings', change: 'up', icon: '📝' },
      { value: '75', title: 'Occupancy Rate', change: 'up', icon: '📊' },
    ];
    const fallbackStatusData = [10, 2, 3]; // Active, Overdue, Vacant
    const fallbackTrendLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const fallbackTrendData = [5, 7, 6, 8, 9, 10];
    const fallbackTopProperties = [
      { id: 1, title: 'Property A', application_count: 10, lease_count: 5, total_activity: 15 },
      { id: 2, title: 'Property B', application_count: 8, lease_count: 4, total_activity: 12 },
    ];

    // Fetch dashboard counts
    const fetchDashboardCounts = async () => {
      try {
        const [tenants, bookings, occupancy] = await Promise.all([
          fetch(`${API_BASE_URL}/v1/tenants/count`).then((res) => {
            if (!res.ok) throw new Error('Failed to fetch tenant count');
            return res.json();
          }),
          fetch(`${API_BASE_URL}/v1/bookings/pending`).then((res) => {
            if (!res.ok) throw new Error('Failed to fetch pending bookings');
            return res.json();
          }),
          fetch(`${API_BASE_URL}/v1/properties/occupancy`).then((res) => {
            if (!res.ok) throw new Error('Failed to fetch occupancy rate');
            return res.json();
          }),
        ]);

        metrics.value = [
          { value: tenants.data?.toString() || '0', title: 'Tenant Count', change: 'up', icon: '🏠' },
          { value: bookings.data?.toString() || '0', title: 'Pending Bookings', change: 'up', icon: '📝' },
          { value: occupancy.data?.toString() || '0', title: 'Occupancy Rate', change: 'up', icon: '📊' },
        ];
      } catch (error) {
        console.error('Error fetching dashboard counts:', error);
        init({ message: 'Failed to load dashboard data. Using fallback data.', color: 'warning' });
        metrics.value = fallbackMetrics;
      }
    };

    // Fetch tenant status and trend data
    const fetchAnalyticsData = async () => {
      try {
        const [statusResponse, trendResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/v1/tenants/status?period=${period.value}`).then((res) => {
            if (!res.ok) throw new Error('Failed to fetch tenant status');
            return res.json();
          }),
          fetch(`${API_BASE_URL}/v1/tenants/trend?period=${period.value}`).then((res) => {
            if (!res.ok) throw new Error('Failed to fetch tenant trend');
            return res.json();
          }),
        ]);

        console.log('Tenant Status Response:', statusResponse);
        console.log('Tenant Trend Response:', trendResponse);

        tenantStatusData.value = [
          statusResponse.data?.active || 0,
          statusResponse.data?.overdue || 0,
          statusResponse.data?.vacant || 0,
        ];
        trendLabels.value = trendResponse.data?.labels || fallbackTrendLabels;
        trendData.value = trendResponse.data?.values || fallbackTrendData;
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        init({ message: 'Failed to load analytics data. Using fallback data.', color: 'warning' });
        tenantStatusData.value = fallbackStatusData;
        trendLabels.value = fallbackTrendLabels;
        trendData.value = fallbackTrendData;
      }
    };

    // Fetch top-selling properties
    const fetchTopProperties = async (page: number = 1) => {
      try {
        const response = await fetch(`${API_BASE_URL}/v1/properties/top-selling?page=${page}&per_page=${pagination.value.per_page}`);
        if (!response.ok) throw new Error('Failed to fetch top selling properties');
        const data = await response.json();
        console.log('Top Properties Response:', data);
        topProperties.value = data.data || [];
        pagination.value = data.pagination || {
          total: 0,
          per_page: 10,
          current_page: 1,
          last_page: 1,
        };
      } catch (error) {
        console.error('Error fetching top selling properties:', error);
        init({ message: 'Failed to load top selling properties. Using fallback data.', color: 'warning' });
        topProperties.value = fallbackTopProperties;
        pagination.value = {
          total: fallbackTopProperties.length,
          per_page: 10,
          current_page: 1,
          last_page: 1,
        };
      }
    };

    // Initialize charts
    const initializeCharts = async (statusData: number[], statusLabels: string[], trendLabels: string[], trendData: number[]) => {
      await nextTick();
      const maxRetries = 3;
      let attempts = 0;

      const createCharts = () => {
        const statusCanvas = document.getElementById('tenantStatusChart') as HTMLCanvasElement;
        if (!statusCanvas || !statusCanvas.getContext('2d')) {
          console.error('Tenant Status Chart canvas or context not found');
          return false;
        }
        if (chartInstance) {
          chartInstance.destroy();
        }

        // Check if statusData has non-zero values; otherwise, use fallback
        const effectiveStatusData = statusData.every(val => val === 0) ? fallbackStatusData : statusData;

        const doughnutConfig: ChartConfiguration<'doughnut', number[], string> = {
          type: 'doughnut',
          data: {
            labels: statusLabels,
            datasets: [
              {
                data: effectiveStatusData,
                backgroundColor: ['#28a745', '#dc3545', '#6b7280'],
                borderColor: '#ffffff',
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { position: 'top' },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const total = effectiveStatusData.reduce((a: number, b: number) => a + b, 0);
                    const percentage = total ? ((context.parsed / total) * 100).toFixed(1) : 0;
                    return `${context.label}: ${context.parsed} (${percentage}%)`;
                  },
                },
              },
            },
            maintainAspectRatio: false,
            animation: false,
          },
        };

        chartInstance = new Chart(statusCanvas.getContext('2d')!, doughnutConfig);

        const trendCanvas = document.getElementById('tenantTrendChart') as HTMLCanvasElement;
        if (!trendCanvas || !trendCanvas.getContext('2d')) {
          console.error('Tenant Trend Chart canvas or context not found');
          return false;
        }
        if (trendChartInstance) {
          trendChartInstance.destroy();
        }

        // Check if trendData is empty; otherwise, use fallback
        const effectiveTrendLabels = trendLabels.length === 0 ? fallbackTrendLabels : trendLabels;
        const effectiveTrendData = trendData.length === 0 ? fallbackTrendData : trendData;

        const lineConfig: ChartConfiguration<'line', number[], string> = {
          type: 'line',
          data: {
            labels: effectiveTrendLabels,
            datasets: [
              {
                label: 'Tenant Count',
                data: effectiveTrendData,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#2563eb',
                pointBorderColor: '#ffffff',
                pointHoverBackgroundColor: '#ffffff',
                pointHoverBorderColor: '#2563eb',
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { position: 'top' },
              tooltip: {
                callbacks: {
                  label: (context) => `${context.dataset.label}: ${context.parsed.y}`,
                },
              },
            },
            scales: {
              x: {
                grid: { display: false },
                title: { display: true, text: 'Time' },
              },
              y: {
                beginAtZero: true,
                title: { display: true, text: 'Tenant Count' },
              },
            },
            maintainAspectRatio: false,
            animation: false,
          },
        };

        trendChartInstance = new Chart(trendCanvas.getContext('2d')!, lineConfig);
        return true;
      };

      while (attempts < maxRetries) {
        attempts++;
        await nextTick();
        if (createCharts()) {
          console.log(`Charts initialized successfully on attempt ${attempts}`);
          return;
        }
        console.warn(`Chart initialization failed, attempt ${attempts}/${maxRetries}`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      console.error('Failed to initialize charts after maximum retries');
      init({ message: 'Unable to render charts. Please refresh the page.', color: 'danger' });
    };

    // Initialize dashboard
    onMounted(async () => {
      try {
        await Promise.all([fetchDashboardCounts(), fetchAnalyticsData(), fetchTopProperties()]);
      } catch (error) {
        console.error('Error initializing dashboard:', error);
        init({ message: 'Failed to initialize dashboard. Using fallback data.', color: 'warning' });
      } finally {
        loading.value = false;
      }
    });

    // Watch loading to initialize charts when DOM is ready
    watch(loading, async (newValue) => {
      if (newValue === false) {
        await initializeCharts(
          tenantStatusData.value,
          ['Active', 'Overdue', 'Vacant'],
          trendLabels.value,
          trendData.value
        );
      }
    });

    // Cleanup charts on component unmount
    onUnmounted(() => {
      if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
      }
      if (trendChartInstance) {
        trendChartInstance.destroy();
        trendChartInstance = null;
      }
    });

    return {
      loading,
      period,
      metrics,
      tenantStatusData,
      topProperties,
      pagination,
      fetchAnalyticsData,
      fetchTopProperties,
    };
  },
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

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.5rem;

  @media screen and (min-width: 640px) {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  @media screen and (min-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    padding: 1rem;
    margin-bottom: 2rem;
  }
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  padding: 0.5rem;

  @media screen and (min-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.5rem;
    padding: 1rem;
  }
}

.table-section {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.75rem;
  margin: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  @media screen and (min-width: 768px) {
    padding: 1.5rem;
    margin: 1rem;
  }
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.properties-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 400px; /* Ensures table is scrollable on small screens */

  th,
  td {
    padding: 0.5rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
    font-size: 0.75rem;

    @media screen and (min-width: 768px) {
      padding: 0.75rem;
      font-size: 0.875rem;
    }
  }

  th {
    font-weight: 600;
    color: #1f2937;
    background-color: #f9fafb;
    white-space: nowrap;
  }

  td {
    color: #374151;
    white-space: nowrap;
  }

  tr:hover {
    background-color: #f3f4f6;
  }

  .text-center {
    text-align: center;
  }
}

.pagination-controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  gap: 0.5rem;

  @media screen and (min-width: 768px) {
    margin-top: 1rem;
    gap: 1rem;
  }

  .pagination-button {
    padding: 0.5rem 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background-color: #ffffff;
    color: #2563eb;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.3s ease;
    min-height: 40px; /* Touch-friendly height */
    min-width: 60px;

    &:hover:not(:disabled) {
      background-color: #2563eb;
      color: #ffffff;
    }

    &:disabled {
      color: #6b7280;
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  .pagination-info {
    font-size: 0.75rem;
    color: #6b7280;

    @media screen and (min-width: 768px) {
      font-size: 0.9rem;
    }
  }
}

.metric-card {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
  min-height: 80px;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }

  @media screen and (min-width: 768px) {
    padding: 1.5rem;
    gap: 1rem;
    min-height: 100px;
  }
}

.metric-icon {
  font-size: 1.5rem;
  background-color: #f3f4f6;
  border-radius: 50%;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  @media screen and (min-width: 768px) {
    font-size: 2rem;
    width: 3rem;
    height: 3rem;
  }
}

.metric-content {
  flex-grow: 1;
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.25rem;

  @media screen and (min-width: 768px) {
    font-size: 1.75rem;
    margin-bottom: 0.5rem;
  }
}

.metric-title {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;

  @media screen and (min-width: 768px) {
    font-size: 1rem;
  }
}

.metric-change {
  font-size: 0.75rem;
  font-weight: 600;

  @media screen and (min-width: 768px) {
    font-size: 0.9rem;
  }
}

.up {
  color: #10b981;
}

.down {
  color: #ef4444;
}

.chart-section {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.75rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  @media screen and (min-width: 768px) {
    padding: 1.5rem;
  }
}

.chart-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
  text-align: center;

  @media screen and (min-width: 768px) {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }
}

.period-selector {
  margin-bottom: 0.75rem;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;

  label {
    font-weight: 600;
    color: #1f2937;
    font-size: 0.875rem;

    @media screen and (min-width: 768px) {
      font-size: 1rem;
    }
  }

  select {
    padding: 0.5rem;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    background-color: #f9fafb;
    font-size: 0.875rem;
    cursor: pointer;
    transition: border-color 0.3s ease;
    min-height: 40px; /* Touch-friendly height */
    width: 100%;
    max-width: 150px;

    &:focus {
      outline: none;
      border-color: #2563eb;
    }

    @media screen and (min-width: 768px) {
      font-size: 1rem;
      max-width: 200px;
    }
  }
}

.chart-container {
  max-width: 100%;
  height: 200px;

  @media screen and (min-width: 640px) {
    height: 250px;
  }

  @media screen and (min-width: 768px) {
    height: 350px;
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

@media (max-width: 640px) {
  .dashboard-content {
    padding: 0.5rem;
  }

  .metrics-grid {
    gap: 0.5rem;
    padding: 0.25rem;
  }

  .metric-card {
    padding: 0.5rem;
    min-height: 70px;
    gap: 0.5rem;
  }

  .metric-icon {
    font-size: 1.25rem;
    width: 2rem;
    height: 2rem;
  }

  .metric-value {
    font-size: 1rem;
    margin-bottom: 0.25rem;
  }

  .metric-title {
    font-size: 0.75rem;
  }

  .metric-change {
    font-size: 0.625rem;
  }

  .charts-grid {
    gap: 0.5rem;
    padding: 0.25rem;
  }

  .chart-section {
    padding: 0.5rem;
  }

  .chart-title {
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }

  .period-selector {
    margin-bottom: 0.5rem;

    label {
      font-size: 0.75rem;
    }

    select {
      font-size: 0.75rem;
      padding: 0.25rem;
      max-width: 120px;
    }
  }

  .table-section {
    padding: 0.5rem;
    margin: 0.25rem;
  }

  .properties-table {
    min-width: 300px;

    th,
    td {
      padding: 0.25rem;
      font-size: 0.625rem;
    }

    th[data-key="application_count"],
    td[data-key="application_count"],
    th[data-key="lease_count"],
    td[data-key="lease_count"] {
      display: none; /* Hide less critical columns on mobile */
    }

    th[data-key="index"],
    td[data-key="index"] {
      min-width: 40px;
    }

    th[data-key="title"],
    td[data-key="title"] {
      min-width: 120px;
    }

    th[data-key="total_activity"],
    td[data-key="total_activity"] {
      min-width: 80px;
    }
  }

  .pagination-controls {
    flex-direction: column;
    gap: 0.25rem;

    .pagination-button {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      min-width: 50px;
    }

    .pagination-info {
      font-size: 0.625rem;
    }
  }
}

@media (max-width: 480px) {
  .dashboard-content {
    padding: 0.25rem;
  }

  .metrics-grid {
    gap: 0.25rem;
  }

  .metric-card {
    padding: 0.25rem;
    min-height: 60px;
  }

  .metric-icon {
    font-size: 1rem;
    width: 1.75rem;
    height: 1.75rem;
  }

  .metric-value {
    font-size: 0.875rem;
  }

  .metric-title {
    font-size: 0.625rem;
  }

  .metric-change {
    font-size: 0.5rem;
  }

  .chart-section {
    padding: 0.25rem;
  }

  .chart-title {
    font-size: 0.75rem;
  }

  .period-selector {
    label {
      font-size: 0.625rem;
    }

    select {
      font-size: 0.625rem;
      max-width: 100px;
    }
  }

  .chart-container {
    height: 150px;
  }

  .properties-table {
    min-width: 250px;

    th,
    td {
      font-size: 0.5rem;
      padding: 0.2rem;
    }
  }

  .pagination-controls {
    .pagination-button {
      font-size: 0.625rem;
      min-width: 40px;
    }

    .pagination-info {
      font-size: 0.5rem;
    }
  }
}
</style>