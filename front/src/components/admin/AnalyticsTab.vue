<script setup>
defineOptions({ name: 'AnalyticsTab' })
</script>

<template>
  <div class="fade-in">
    <div class="ws-head">
      <div>
        <h2 class="ws-title">Business Analytics</h2>
        <p class="ws-sub">Overview of sales, traffic, and user growth (Coming Soon).</p>
      </div>
    </div>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="m-icon">📈</div>
        <div class="m-data">
          <h3>Total Revenue</h3>
          <p>₹ --,---</p>
        </div>
      </div>
      <div class="metric-card">
        <div class="m-icon">📦</div>
        <div class="m-data">
          <h3>Active Orders</h3>
          <p>--</p>
        </div>
      </div>
      <div class="metric-card">
        <div class="m-icon">👥</div>
        <div class="m-data">
          <h3>Registered Users</h3>
          <p>--</p>
        </div>
      </div>
    </div>

    <div class="chart-container">
      <div class="chart-placeholder">
        <span class="icon">📊</span>
        <h3>Data Visualization Module Offline</h3>
        <p>Chart.js integration is scheduled for the next deployment phase.</p>
        <button class="btn-outline" disabled>Initialize Charts</button>
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
  border: 1px dashed #CBD5E1;
  border-radius: 16px;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chart-placeholder {
  text-align: center;
  color: #64748B;
}
.chart-placeholder .icon {
  font-size: 3rem;
  margin-bottom: 12px;
  display: block;
  opacity: 0.5;
}
.chart-placeholder h3 {
  font-size: 1.2rem;
  color: #0F172A;
  font-weight: 800;
  margin: 0 0 8px;
}
.btn-outline {
  margin-top: 16px;
  background: transparent;
  border: 2px solid #CBD5E1;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 700;
  color: #94A3B8;
  cursor: not-allowed;
}
</style>