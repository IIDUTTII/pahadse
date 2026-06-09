<script setup>
import { ref, onMounted } from 'vue'
import { db } from '../../firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { Chart, registerables } from 'chart.js'

defineOptions({ name: 'AnalyticsTab' })

Chart.register(...registerables)

// Data state
const totalRevenue = ref(0)
const activeOrders = ref(0)
const totalUsers = ref(0)
const loading = ref(true)
const error = ref(null)

// Chart instance ref
let revenueChart = null

// Helper to get month names
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Fetch all data
const fetchAnalytics = async () => {
  loading.value = true
  error.value = null
  try {
    // 1. Total Revenue (sum of order amounts)
    const ordersSnap = await getDocs(collection(db, 'orders'))
    let revenue = 0
    ordersSnap.forEach(doc => {
      const data = doc.data()
      if (data.amount && typeof data.amount === 'number') {
        revenue += data.amount
      }
    })
    totalRevenue.value = revenue

    // 2. Active Orders (not delivered or cancelled)
    const activeQuery = query(
      collection(db, 'orders'),
      where('shippingStatus', 'not-in', ['delivered', 'cancelled'])
    )
    const activeSnap = await getDocs(activeQuery)
    activeOrders.value = activeSnap.size

    // 3. Total Users
    const usersSnap = await getDocs(collection(db, 'users'))
    totalUsers.value = usersSnap.size

    // 4. Monthly revenue for chart
    const monthlyRevenue = new Array(12).fill(0)
    ordersSnap.forEach(doc => {
      const data = doc.data()
      if (data.createdAt && data.amount) {
        // createdAt is Firestore Timestamp
        const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
        const month = date.getMonth()
        monthlyRevenue[month] += data.amount
      }
    })
    renderChart(monthlyRevenue)

  } catch (err) {
    console.error('Analytics fetch error:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Render Chart.js bar chart
const renderChart = (data) => {
  const ctx = document.getElementById('revenueChart')?.getContext('2d')
  if (!ctx) return
  if (revenueChart) revenueChart.destroy()
  revenueChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthNames,
      datasets: [{
        label: 'Revenue (₹)',
        data: data,
        backgroundColor: '#0F2A1F',
        borderRadius: 6,
        barPercentage: 0.7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: { callbacks: { label: (ctx) => `₹${ctx.raw.toLocaleString()}` } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (val) => `₹${val.toLocaleString()}` } }
      }
    }
  })
}

onMounted(() => {
  fetchAnalytics()
})
</script>

<template>
  <div class="fade-in">
    <div class="ws-head">
      <div>
        <h2 class="ws-title">Business Analytics</h2>
        <p class="ws-sub">Real‑time overview of sales, orders, and user growth.</p>
      </div>
    </div>

    <div v-if="loading" class="loading-state">Loading analytics...</div>
    <div v-else-if="error" class="error-state">⚠️ Failed to load: {{ error }}</div>
    <div v-else>
      <!-- Metrics Cards -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="m-icon">📈</div>
          <div class="m-data">
            <h3>Total Revenue</h3>
            <p>₹{{ totalRevenue.toLocaleString() }}</p>
          </div>
        </div>
        <div class="metric-card">
          <div class="m-icon">📦</div>
          <div class="m-data">
            <h3>Active Orders</h3>
            <p>{{ activeOrders }}</p>
          </div>
        </div>
        <div class="metric-card">
          <div class="m-icon">👥</div>
          <div class="m-data">
            <h3>Registered Users</h3>
            <p>{{ totalUsers }}</p>
          </div>
        </div>
      </div>

      <!-- Chart Container -->
      <div class="chart-container">
        <canvas id="revenueChart" width="400" height="300" style="width:100%; height:300px"></canvas>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-in { animation: fIn 0.3s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

.ws-head { margin-bottom: 24px; }
.ws-title { font-size: 1.6rem; font-weight: 800; color: #0F172A; margin: 0; }
.ws-sub { color: #64748B; font-size: 0.9rem; margin-top: 4px; }

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}
.metric-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.02);
}
.m-icon {
  font-size: 2.5rem;
  background: #F8FAFC;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid #E2E8F0;
}
.m-data h3 {
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #64748B;
  margin: 0 0 4px;
}
.m-data p {
  font-size: 1.6rem;
  font-weight: 900;
  color: #0F172A;
  margin: 0;
}

.chart-container {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 16px;
  padding: 20px;
  min-height: 360px;
}
.loading-state, .error-state {
  text-align: center;
  padding: 60px 20px;
  color: #64748B;
  font-weight: 500;
}
.error-state { color: #dc2626; }
</style>