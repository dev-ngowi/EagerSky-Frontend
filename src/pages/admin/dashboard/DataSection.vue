<template>
  <div v-if="loading" class="loading-spinner">
    <Loader :loading-text="'Loading real estate dashboard...'" />
  </div>
  <div v-else class="dashboard-content">
    <!-- Metric Cards -->
    <div class="metrics-grid">
      <div class="metric-card" role="region" :aria-label="`Tenant Count: ${metrics[0]?.value || '0'}`">
        <div class="metric-icon">🏠</div>
        <div class="metric-content">
          <div class="metric-value">{{ metrics[0]?.value || '0' }}</div>
          <div class="metric-title">Tenant Count</div>
          <div class="metric-change up">↑</div>
        </div>
      </div>
      <div class="metric-card" role="region" :aria-label="`Pending Bookings: ${metrics[1]?.value || '0'}`">
        <div class="metric-icon">📝</div>
        <div class="metric-content">
          <div class="metric-value">{{ metrics[1]?.value || '0' }}</div>
          <div class="metric-title">Pending Bookings</div>
          <div class="metric-change up">↑</div>
        </div>
      </div>
      <div class="metric-card" role="region" :aria-label="`Occupancy Rate: ${metrics[2]?.value || '0%'}`">
        <div class="metric-icon">📊</div>
        <div class="metric-content">
          <div class="metric-value">{{ metrics[2]?.value || '0' }}%</div>
          <div class="metric-title">Occupancy Rate</div>
          <div class="metric-change up">↑</div>
        </div>
      </div>
    </div>

    <!-- Chart Section -->
    <div class="charts-grid">
      <!-- Period Selector and Pie Chart -->
      <div class="chart-section">
        <div class="period-selector">
          <label for="period">Select Period:</label>
          <select id="period" v-model="period" @change="fetchAnalyticsData">
            <option value="week">Week</option>
            <option value="month" selected>Month</option>
            <option value="year">Year</option>
          </select>
        </div>
        <h3 class="chart-title">Tenant Status Distribution</h3>
        <div class="chart-container">
          <canvas id="tenantStatusChart" role="img" :aria-label="`Tenant Status Distribution: Active ${tenantStatusData[0] || 0}, Overdue ${tenantStatusData[1] || 0}, Vacant ${tenantStatusData[2] || 0}`"></canvas>
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
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import Loader from '../../../components/Loader.vue'
import Chart from 'chart.js/auto'
import type { Chart as ChartJS, ChartConfiguration } from 'chart.js'
import { useToast } from 'vuestic-ui'

export default defineComponent({
  name: 'DataSection',
  components: {
    Loader,
  },
  setup() {
    const { init } = useToast()
    const loading = ref(true)
    const period = ref('month')
    const metrics = ref([
      { value: '0', title: 'Tenant Count', change: 'up' },
      { value: '0', title: 'Pending Bookings', change: 'up' },
      { value: '0', title: 'Occupancy Rate', change: 'up' },
    ])
    const tenantStatusData = ref([0, 0, 0]) // Active, Overdue, Vacant
    let chartInstance: ChartJS<'doughnut', number[], string> | null = null
    let trendChartInstance: ChartJS<'line', number[], string> | null = null

    // Base API URL from Vite config
    const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL

    // Fetch dashboard counts
    const fetchDashboardCounts = async () => {
      try {
        const [tenants, bookings, occupancy] = await Promise.all([
          fetch(`${API_BASE_URL}/v1/tenants/count`).then((res) => {
            if (!res.ok) throw new Error('Failed to fetch tenant count')
            return res.json()
          }),
          fetch(`${API_BASE_URL}/v1/bookings/pending`).then((res) => {
            if (!res.ok) throw new Error('Failed to fetch pending bookings')
            return res.json()
          }),
          fetch(`${API_BASE_URL}/v1/properties/occupancy`).then((res) => {
            if (!res.ok) throw new Error('Failed to fetch occupancy rate')
            return res.json()
          }),
        ])

        metrics.value = [
          { value: tenants.data?.toString() || '0', title: 'Tenant Count', change: 'up' },
          { value: bookings.data?.toString() || '0', title: 'Pending Bookings', change: 'up' },
          { value: occupancy.data?.toString() || '0', title: 'Occupancy Rate', change: 'up' },
        ]
      } catch (error) {
        console.error('Error fetching dashboard counts:', error)
        init({ message: 'Failed to load dashboard data. Please try again.', color: 'danger' })
        metrics.value = [
          { value: '0', title: 'Tenant Count', change: 'up' },
          { value: '0', title: 'Pending Bookings', change: 'up' },
          { value: '0', title: 'Occupancy Rate', change: 'up' },
        ]
      }
    }

    // Initialize charts
    const initializeCharts = async (statusData: number[], statusLabels: string[], trendLabels: string[], trendData: number[]) => {
      await nextTick() // Wait for DOM updates
      const maxRetries = 3
      let attempts = 0

      const createCharts = () => {
        // Log canvas existence for debugging
        const statusCanvas = document.getElementById('tenantStatusChart') as HTMLCanvasElement
        console.log('Checking tenantStatusChart canvas:', statusCanvas ? 'Found' : 'Not found')
        if (!statusCanvas) {
          console.error('Tenant Status Chart canvas not found')
          return false
        }
        const statusCtx = statusCanvas.getContext('2d')
        if (!statusCtx) {
          console.error('Tenant Status Chart context not found')
          return false
        }

        if (chartInstance) {
          chartInstance.destroy()
        }

        const doughnutConfig: ChartConfiguration<'doughnut', number[], string> = {
          type: 'doughnut',
          data: {
            labels: statusLabels,
            datasets: [
              {
                data: statusData,
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
                    const total = statusData.reduce((a: number, b: number) => a + b, 0)
                    const percentage = total ? ((context.parsed / total) * 100).toFixed(1) : 0
                    return `${context.label}: ${context.parsed} (${percentage}%)`
                  },
                },
              },
            },
            maintainAspectRatio: false,
            animation: false,
          },
        }

        chartInstance = new Chart(statusCtx, doughnutConfig)

        // Tenant Trend Chart (Line)
        const trendCanvas = document.getElementById('tenantTrendChart') as HTMLCanvasElement
        console.log('Checking tenantTrendChart canvas:', trendCanvas ? 'Found' : 'Not found')
        if (!trendCanvas) {
          console.error('Tenant Trend Chart canvas not found')
          return false
        }
        const trendCtx = trendCanvas.getContext('2d')
        if (!trendCtx) {
          console.error('Tenant Trend Chart context not found')
          return false
        }

        if (trendChartInstance) {
          trendChartInstance.destroy()
        }

        const lineConfig: ChartConfiguration<'line', number[], string> = {
          type: 'line',
          data: {
            labels: trendLabels,
            datasets: [
              {
                label: 'Tenant Count',
                data: trendData,
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
        }

        trendChartInstance = new Chart(trendCtx, lineConfig)
        return true
      }

      while (attempts < maxRetries) {
        attempts++
        await nextTick() // Ensure DOM is updated before each attempt
        if (createCharts()) {
          console.log(`Charts initialized successfully on attempt ${attempts}`)
          return
        }
        console.warn(`Chart initialization failed, attempt ${attempts}/${maxRetries}`)
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      console.error('Failed to initialize charts after maximum retries')
      init({ message: 'Unable to render charts. Please refresh the page.', color: 'danger' })
    }

    // Fetch tenant status and trend data
    const fetchAnalyticsData = async () => {
      loading.value = true
      try {
        const [statusResponse, trendResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/v1/tenants/status?period=${period.value}`).then((res) => {
            if (!res.ok) throw new Error('Failed to fetch tenant status')
            return res.json()
          }),
          fetch(`${API_BASE_URL}/v1/tenants/trend?period=${period.value}`).then((res) => {
            if (!res.ok) throw new Error('Failed to fetch tenant trend')
            return res.json()
          }),
        ])

        // Update tenant status data
        const statusLabels = ['Active', 'Overdue', 'Vacant']
        tenantStatusData.value = [
          statusResponse.data?.active || 0,
          statusResponse.data?.overdue || 0,
          statusResponse.data?.vacant || 0,
        ]

        // Chart initialization will be triggered by watch on loading
      } catch (error) {
        console.error('Error fetching analytics data:', error)
        init({ message: 'Failed to load analytics data. Please try again.', color: 'danger' })
        tenantStatusData.value = [0, 0, 0]
      } finally {
        loading.value = false
      }
    }

    // Initialize dashboard
    onMounted(async () => {
      await Promise.all([fetchDashboardCounts(), fetchAnalyticsData()])
    })

    // Watch loading to initialize charts when DOM is ready
    watch(loading, async (newValue) => {
      if (newValue === false) {
        console.log('loading is false, initializing charts')
        await initializeCharts(
          tenantStatusData.value,
          ['Active', 'Overdue', 'Vacant'],
          [], // trendLabels (will be updated on next fetch)
          []  // trendData (will be updated on next fetch)
        )
      }
    })

    // Cleanup charts on component unmount
    onUnmounted(() => {
      if (chartInstance) {
        chartInstance.destroy()
        chartInstance = null
      }
      if (trendChartInstance) {
        trendChartInstance.destroy()
        trendChartInstance = null
      }
    })

    return { loading, period, metrics, tenantStatusData, fetchAnalyticsData }
  },
})
</script>

<style lang="scss" scoped>
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding: 1rem;

  @media screen and (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
  padding: 1rem;

  @media screen and (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.metric-card {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }
}

.metric-icon {
  font-size: 2rem;
  background-color: #f3f4f6;
  border-radius: 50%;
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-content {
  flex-grow: 1;
}

.metric-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.metric-title {
  font-size: 1rem;
  color: #6b7280;
  font-weight: 500;
}

.metric-change {
  font-size: 0.9rem;
  font-weight: 600;
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
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.chart-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
  text-align: center;
}

.period-selector {
  margin-bottom: 1.5rem;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  label {
    font-weight: 600;
    color: #1f2937;
  }

  select {
    padding: 0.5rem;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    background-color: #f9fafb;
    font-size: 1rem;
    cursor: pointer;
    transition: border-color 0.3s ease;

    &:focus {
      outline: none;
      border-color: #2563eb;
    }
  }
}

.chart-container {
  max-width: 100%;
  height: 350px;

  @media screen and (max-width: 768px) {
    height: 250px;
  }
}

.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
</style>