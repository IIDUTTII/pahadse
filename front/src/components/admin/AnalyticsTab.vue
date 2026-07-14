<script setup>
import { ref, onMounted } from 'vue'
import { Chart, registerables } from 'chart.js'
import { fetchAdminAnalytics } from '../db.js'

defineOptions({ name: 'AnalyticsTab' })
Chart.register(...registerables)

const totalRevenue = ref(0), activeOrders = ref(0), totalUsers = ref(0)
const todayOrders = ref(0), todayRevenue = ref(0), topProduct = ref(null), lowStock = ref([])
const statusCounts = ref({}) // ✨ New State
const loading = ref(true), error = ref(null)
let revenueChart = null

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const fetchAnalytics = async () => {
  loading.value = true; error.value = null
  try {
    const data = await fetchAdminAnalytics()
    totalRevenue.value = data.totalRevenue; activeOrders.value = data.activeOrders; totalUsers.value = data.totalUsers
    todayOrders.value = data.todayOrders; todayRevenue.value = data.todayRevenue
    topProduct.value = data.topProduct; lowStock.value = data.lowStock
    statusCounts.value = data.statusCounts // ✨ Bind counts
    renderChart(data.monthlyRevenue)
  } catch (err) { error.value = err.message } 
  finally { loading.value = false }
}

const renderChart = (data) => {
  const ctx = document.getElementById('revenueChart')?.getContext('2d')
  if (!ctx) return
  if (revenueChart) revenueChart.destroy()
  revenueChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: monthNames, datasets: [{ label: 'Revenue (₹)', data, backgroundColor: '#0F2A1F', borderRadius: 6, barPercentage: 0.7 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: (c) => `₹${c.raw.toLocaleString()}` } } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => `₹${v.toLocaleString()}` } } } }
  })
}

// ✨ JUMP TO ORDERS LOGIC
const jumpToOrderFilter = (filterKey) => {
  sessionStorage.setItem('adminOrderFilter', filterKey)
  // Triggers an event that OrdersTab is listening for
  window.dispatchEvent(new CustomEvent('apply-order-filter', { detail: { filter: filterKey } }))
}

onMounted(fetchAnalytics)
</script>

<template>
  <div class="fade-in">
    <div class="ws-head">
      <div><h2 class="ws-title">Business Analytics</h2><p class="ws-sub">Real‑time overview of sales, orders, and user growth.</p></div>
    </div>

    <div v-if="loading" class="loading-state">Loading analytics...</div>
    <div v-else-if="error" class="error-state">⚠️ Failed to load: {{ error }}</div>
    <div v-else>
      
      <h3 class="section-subheading">Urgent Attention Required</h3>
      <div class="metrics-grid clickable-grid">
        <div class="metric-card alert" @click="jumpToOrderFilter('return_requested')">
          <div class="m-icon">↩</div><div class="m-data"><h3>Returns Req.</h3><p>{{ statusCounts.return_requested }}</p></div>
        </div>
        <div class="metric-card alert" @click="jumpToOrderFilter('replacement_requested')">
          <div class="m-icon">🔄</div><div class="m-data"><h3>Replace Req.</h3><p>{{ statusCounts.replacement_requested }}</p></div>
        </div>
        <div class="metric-card warning" @click="jumpToOrderFilter('refund_requested')">
          <div class="m-icon">💸</div><div class="m-data"><h3>Refund Requests</h3><p>{{ statusCounts.refund_requested || 0 }}</p></div>
        </div>
        <div class="metric-card info" @click="jumpToOrderFilter('pending')">
          <div class="m-icon">⏳</div><div class="m-data"><h3>New Pending</h3><p>{{ statusCounts.pending }}</p></div>
        </div>
      </div>

      <h3 class="section-subheading">General Statistics</h3>
      <div class="metrics-grid">
        <div class="metric-card"><div class="m-icon">₹</div><div class="m-data"><h3>Today Revenue</h3><p>₹{{ todayRevenue.toLocaleString() }}</p></div></div>
        <div class="metric-card"><div class="m-icon">#</div><div class="m-data"><h3>Today Orders</h3><p>{{ todayOrders }}</p></div></div>
        <div class="metric-card"><div class="m-icon">₹</div><div class="m-data"><h3>Total Revenue</h3><p>₹{{ totalRevenue.toLocaleString() }}</p></div></div>
        <div class="metric-card"><div class="m-icon">O</div><div class="m-data"><h3>Active Orders</h3><p>{{ activeOrders }}</p></div></div>
        <div class="metric-card"><div class="m-icon">U</div><div class="m-data"><h3>Users</h3><p>{{ totalUsers }}</p></div></div>
      </div>

      <div class="ops-grid">
        <div class="ops-card"><h3>Top Product</h3><p>{{ topProduct ? topProduct.name + ' (' + topProduct.quantity + ')' : 'No sales yet' }}</p></div>
        <div class="ops-card"><h3>Low Stock</h3><p v-if="lowStock.length === 0">No low stock items</p><ul v-else><li v-for="item in lowStock" :key="item.id">{{ item.name }}: {{ item.stock }}</li></ul></div>
      </div>

      <div class="chart-container"><canvas id="revenueChart" width="400" height="300" style="width:100%; height:300px"></canvas></div>
    </div>
  </div>
</template>

<style scoped>
.fade-in { animation: fIn 0.3s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

.ws-head { margin-bottom: 24px; }
.ws-title { font-size: 1.6rem; font-weight: 800; color: #0F172A; margin: 0; }
.ws-sub { color: #64748B; font-size: 0.9rem; margin-top: 4px; }
.section-subheading { font-size: 1.1rem; font-weight: 800; color: #0f172a; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 0.5px;}

.metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
.metric-card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); transition: 0.2s;}
.m-icon { font-size: 2rem; background: #F8FAFC; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 12px; border: 1px solid #E2E8F0; }
.m-data h3 { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: #64748B; margin: 0 0 4px; }
.m-data p { font-size: 1.5rem; font-weight: 900; color: #0F172A; margin: 0; }

/* Clickable Styles */
.clickable-grid .metric-card { cursor: pointer; border-width: 2px; }
.clickable-grid .metric-card:hover { transform: translateY(-4px); box-shadow: 0 8px 16px rgba(0,0,0,0.08); }
.clickable-grid .alert { border-color: #fca5a5; background: #fef2f2; }
.clickable-grid .alert .m-icon { background: #fee2e2; border-color: #fca5a5; color: #dc2626;}
.clickable-grid .warning { border-color: #fde047; background: #fefce8; }
.clickable-grid .warning .m-icon { background: #fef9c3; border-color: #fde047; color: #a16207;}
.clickable-grid .info { border-color: #93c5fd; background: #eff6ff; }

.ops-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 24px; }
.ops-card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
.ops-card h3 { margin: 0 0 8px; font-size: 0.85rem; font-weight: 800; text-transform: uppercase; color: #64748B; }
.ops-card p { margin: 0; font-weight: 800; color: #0F172A; }
.ops-card ul { margin: 0; padding-left: 18px; color: #0F172A; font-weight: 700; }
.chart-container { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 20px; min-height: 360px; }
.loading-state, .error-state { text-align: center; padding: 60px 20px; color: #64748B; font-weight: 500; }
.error-state { color: #dc2626; }
</style>