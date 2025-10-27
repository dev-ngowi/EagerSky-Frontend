<template>
  <div v-if="loading" class="loading-spinner">
    <Loader :loading-text="'Loading real estate dashboard...'" />
  </div>
  <div v-else class="dashboard-content">
    <!-- Metric Cards -->
    <div class="metrics-grid">
      <div class="metric-card" role="region" :aria-label="`Properties Count: ${metrics[0]?.value || '0'}`">
        <div class="metric-icon">🏠</div>
        <div class="metric-content">
          <div class="metric-value">{{ metrics[0]?.value || '0' }}</div>
          <div class="metric-title">Properties Count</div>
          <div class="metric-change up">↑</div>
        </div>
      </div>
      <div class="metric-card" role="region" :aria-label="`Tenant Count: ${metrics[1]?.value || '0'}`">
        <div class="metric-icon">📝</div>
        <div class="metric-content">
          <div class="metric-value">{{ metrics[1]?.value || '0' }}</div>
          <div class="metric-title">Tenant Count</div>
          <div class="metric-change up">↑</div>
        </div>
      </div>
      <div class="metric-card" role="region" :aria-label="`Lease Expired: ${metrics[2]?.value || '0%'}`">
        <div class="metric-icon">📊</div>
        <div class="metric-content">
          <div class="metric-value">{{ metrics[2]?.value || '0' }}%</div>
          <div class="metric-title">Lease Expired</div>
          <div class="metric-change up">↑</div>
        </div>
      </div>
      <div class="metric-card" role="region" :aria-label="`Payment Overview: ${metrics[3]?.value || '0%'}`">
        <div class="metric-icon">📊</div>
        <div class="metric-content">
          <div class="metric-value">{{ metrics[3]?.value || '0' }}%</div>
          <div class="metric-title">Payment Overview</div>
          <div class="metric-change up">↑</div>
        </div>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts-grid">
      <div class="chart-container">
        <h3>Properties Count</h3>
        <canvas ref="propertiesChart"></canvas>
      </div>
      <div class="chart-container">
        <h3>Tenant Count</h3>
        <canvas ref="tenantsChart"></canvas>
      </div>
      <div class="chart-container">
        <h3>Lease Status</h3>
        <canvas ref="leasesChart"></canvas>
      </div>
      <div class="chart-container">
        <h3>Payment Status</h3>
        <canvas ref="paymentsChart"></canvas>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import Loader from '../../../components/Loader.vue';
import { useToast } from 'vuestic-ui';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

// Type guard to check if error has a message property
const isErrorWithMessage = (error: unknown): error is { message: string } => {
  return (
    error != null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
};

export default defineComponent({
  name: 'DataSection',
  components: { Loader },
  setup() {
    const { init } = useToast();
    const loading = ref(true);
    const metrics = ref([
      { value: '0', title: 'Properties Count', change: 'up' },
      { value: '0', title: 'Tenant Count', change: 'up' },
      { value: '0', title: 'Lease Expired', change: 'up' },
      { value: '0', title: 'Payment Overview', change: 'up' },
    ]);
    const chartData = ref({
      properties: 0,
      tenants: 0,
      leases: { expired: 0, active: 0 },
      payments: { paid: 0, unpaid: 0 },
    });

    const propertiesChart = ref<HTMLCanvasElement | null>(null);
    const tenantsChart = ref<HTMLCanvasElement | null>(null);
    const leasesChart = ref<HTMLCanvasElement | null>(null);
    const paymentsChart = ref<HTMLCanvasElement | null>(null);

    const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL;

    const fallbackMetrics = [
      { value: '10', title: 'Properties Count', change: 'up' },
      { value: '5', title: 'Tenant Count', change: 'up' },
      { value: '20', title: 'Lease Expired', change: 'up' },
      { value: '75', title: 'Payment Overview', change: 'up' },
    ];
    const fallbackChartData = {
      properties: 10,
      tenants: 5,
      leases: { expired: 2, active: 8 }, // Assuming 20% expired = 2 out of 10
      payments: { paid: 75, unpaid: 25 }, // 75% paid
    };

    const fetchDashboardCounts = async () => {
      try {
        console.log('API_BASE_URL:', API_BASE_URL);
        const token = localStorage.getItem('authToken');
        if (!token) {
          throw new Error('No authentication token found. Please log in.');
        }
        console.log('Using authToken:', token);
        const headers = {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        };

        const [properties, tenants, leases, payments] = await Promise.all([
          fetch(`${API_BASE_URL}/v1/landlord/property-count`, { headers }).then(async (res) => {
            if (!res.ok) throw new Error(`Failed to fetch property count: ${res.status} ${res.statusText}`);
            const data = await res.json();
            if (data.status !== 'success') throw new Error(`Property count error: ${data.message || 'Unknown error'}`);
            return data;
          }),
          fetch(`${API_BASE_URL}/v1/landlord/tenant-count`, { headers }).then(async (res) => {
            if (!res.ok) throw new Error(`Failed to fetch tenant count: ${res.status} ${res.statusText}`);
            const data = await res.json();
            if (data.status !== 'success') throw new Error(`Tenant count error: ${data.message || 'Unknown error'}`);
            return data;
          }),
          fetch(`${API_BASE_URL}/v1/landlord/lease-expired`, { headers }).then(async (res) => {
            if (!res.ok) throw new Error(`Failed to fetch lease expired data: ${res.status} ${res.statusText}`);
            const data = await res.json();
            if (data.status !== 'success') throw new Error(`Lease expired error: ${data.message || 'Unknown error'}`);
            return data;
          }),
          fetch(`${API_BASE_URL}/v1/landlord/payment-overview`, { headers }).then(async (res) => {
            if (!res.ok) throw new Error(`Failed to fetch payment overview: ${res.status} ${res.statusText}`);
            const data = await res.json();
            if (data.status !== 'success') throw new Error(`Payment overview error: ${data.message || 'Unknown error'}`);
            return data;
          }),
        ]);

        metrics.value = [
          { value: properties.data?.toString() || '0', title: 'Properties Count', change: 'up' },
          { value: tenants.data?.toString() || '0', title: 'Tenant Count', change: 'up' },
          { value: leases.data.percentage?.toString() || '0', title: 'Lease Expired', change: 'up' },
          { value: payments.data.percentage?.toString() || '0', title: 'Payment Overview', change: 'up' },
        ];

        chartData.value = {
          properties: properties.data || 0,
          tenants: tenants.data || 0,
          leases: { expired: leases.data.expired || 0, active: leases.data.active || 0 },
          payments: { paid: payments.data.paid || 0, unpaid: payments.data.unpaid || 0 },
        };
      } catch (error: unknown) {
        // Use type guard to safely access error.message
        const errorMessage = isErrorWithMessage(error) ? error.message : 'An unknown error occurred';
        console.error('Error fetching dashboard counts:', error);
        init({
          message: `Failed to load dashboard data: ${errorMessage}. Using fallback data.`,
          color: 'warning',
        });
        metrics.value = fallbackMetrics;
        chartData.value = fallbackChartData;
      } finally {
        loading.value = false;
      }
    };

    // Initialize charts after data is fetched
    onMounted(async () => {
      await fetchDashboardCounts();

      // Properties Count Chart
      if (propertiesChart.value) {
        new Chart(propertiesChart.value, {
          type: 'bar',
          data: {
            labels: ['Properties'],
            datasets: [{
              label: 'Total Properties',
              data: [chartData.value.properties],
              backgroundColor: '#4CAF50',
            }],
          },
          options: {
            responsive: true,
            scales: {
              y: { beginAtZero: true, title: { display: true, text: 'Count' } },
            },
            plugins: { legend: { display: false } },
          },
        });
      }

      // Tenants Count Chart
      if (tenantsChart.value) {
        new Chart(tenantsChart.value, {
          type: 'bar',
          data: {
            labels: ['Tenants'],
            datasets: [{
              label: 'Total Tenants',
              data: [chartData.value.tenants],
              backgroundColor: '#2196F3',
            }],
          },
          options: {
            responsive: true,
            scales: {
              y: { beginAtZero: true, title: { display: true, text: 'Count' } },
            },
            plugins: { legend: { display: false } },
          },
        });
      }

      // Leases Chart
      if (leasesChart.value) {
        new Chart(leasesChart.value, {
          type: 'pie',
          data: {
            labels: ['Expired', 'Active'],
            datasets: [{
              data: [chartData.value.leases.expired, chartData.value.leases.active],
              backgroundColor: ['#EF4444', '#10B981'],
            }],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { position: 'top' },
              title: { display: true, text: 'Lease Status Distribution' },
            },
          },
        });
      }

      // Payments Chart
      if (paymentsChart.value) {
        new Chart(paymentsChart.value, {
          type: 'pie',
          data: {
            labels: ['Paid', 'Unpaid'],
            datasets: [{
              data: [chartData.value.payments.paid, chartData.value.payments.unpaid],
              backgroundColor: ['#10B981', '#EF4444'],
            }],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { position: 'top' },
              title: { display: true, text: 'Payment Status Distribution' },
            },
          },
        });
      }
    });

    return { 
      loading, 
      metrics, 
      propertiesChart, 
      tenantsChart, 
      leasesChart, 
      paymentsChart 
    };
  },
});
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
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  padding: 1rem;
}

.chart-container {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.chart-container h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
  text-align: center;
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
  transition: transform 0.3s ease, box-shadow 0.3s ease;

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

.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.dashboard-content {
  padding: 1rem;
}
</style>