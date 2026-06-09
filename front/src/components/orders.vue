<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '../firebase.js'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'

defineOptions({ name: 'UserOrders' })
const router = useRouter()

const initializing = ref(true)
const userOrders = ref([])
const activeTab = ref('active') // active, completed, cancelled
const searchQ = ref('')

onMounted(() => {
  auth.onAuthStateChanged(async (currentUser) => {
    if (!currentUser) return router.push('/login')
    
    // Fetch all orders for this user
    try {
      const q = query(collection(db, 'orders'), where('userId', '==', currentUser.uid))
      const snap = await getDocs(q)
      userOrders.value = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    } catch (e) { console.error(e) }
    
    initializing.value = false
  })
})

const filteredOrders = computed(() => {
  let list = userOrders.value

  // 1. FILTER BY TAB
  if (activeTab.value === 'active') {
    list = list.filter(o => ['pending', 'confirmed', 'shipped'].includes(o.shippingStatus))
  } else if (activeTab.value === 'completed') {
    list = list.filter(o => o.shippingStatus === 'delivered')
  } else if (activeTab.value === 'cancelled') {
    list = list.filter(o => o.shippingStatus === 'rejected')
  }

  // 2. SEARCH BY PRODUCT NAME OR ID
  if (searchQ.value.trim()) {
    const q = searchQ.value.toLowerCase()
    list = list.filter(o => {
      // Check ID
      if (o.id.toLowerCase().includes(q)) return true
      // Check if any product name inside the order matches
      if (o.items?.some(item => item.name.toLowerCase().includes(q))) return true
      return false
    })
  }

  return list
})

const fmtDate = (ts) => ts?.seconds ? new Date(ts.seconds * 1000).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Processing'
</script>

<template>
  <div class="client-orders-page">
    <div v-if="initializing" class="loading-state"><div class="spinner"></div></div>

    <div v-else class="orders-hub fade-in">
      <header class="page-title">
        <h1>Your Provision History</h1>
        <p>Track packages and review past mountain harvests.</p>
      </header>

      <div class="hub-controls">
        <div class="tabs-row">
          <button :class="{ active: activeTab === 'active' }" @click="activeTab = 'active'">In Progress</button>
          <button :class="{ active: activeTab === 'completed' }" @click="activeTab = 'completed'">Delivered</button>
          <button :class="{ active: activeTab === 'cancelled' }" @click="activeTab = 'cancelled'">Cancelled</button>
        </div>
        <input v-model="searchQ" class="hub-search" placeholder="Search by product name or order ID..." />
      </div>

      <div v-if="filteredOrders.length === 0" class="empty-plate">
        <span class="emoji-sad">🏔️</span>
        <h3>No {{ activeTab }} orders found.</h3>
        <p v-if="searchQ">Try adjusting your search terms.</p>
        <button v-else @click="router.push('/products')" class="shop-btn">Browse Shop</button>
      </div>

      <div v-else class="order-list">
        <div v-for="order in filteredOrders" :key="order.id" class="order-ticket">
          
          <div class="ticket-head">
            <div class="head-left">
              <span class="o-date">Placed on {{ fmtDate(order.createdAt) }}</span>
              <span class="o-id">Order #{{ order.id }}</span>
            </div>
            <div class="head-right">
              <strong>Total: ₹{{ order.amount }}</strong>
              <span :class="['pill', order.shippingStatus]">{{ order.shippingStatus || 'Processing' }}</span>
            </div>
          </div>

          <div class="ticket-body">
            <div class="p-list">
              <div v-for="item in order.items" :key="item.productId" class="p-item">
                <span class="p-icon">{{ item.emoji || '📦' }}</span>
                <div class="p-details">
                  <strong>{{ item.name }}</strong>
                  <span>Qty: {{ item.quantity }} · ₹{{ item.price }} each</span>
                </div>
              </div>
            </div>
            
            <div class="d-info">
              <h4>Delivery To</h4>
              <p>{{ order.customerName }}</p>
              <p class="d-addr">{{ order.address }}</p>
            </div>
          </div>

          <div class="ticket-foot">
            <div v-if="order.shippingStatus === 'shipped' && order.trackingId" class="tracking-zone">
              <span>🚀 Package Dispatched via Courier</span>
              <a :href="'https://www.shiprocket.in/shipment-tracking/' + order.trackingId" target="_blank" class="track-btn">Live Track Parcel</a>
            </div>
            <div v-else-if="order.shippingStatus === 'rejected'" class="reject-zone">
              Order Cancelled. <span v-if="order.adminComment">Reason: {{ order.adminComment }}</span>
            </div>
            <div v-else class="prep-zone">
              Preparing your products for dispatch from the mountains.
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.client-orders-page { min-height: 100vh; background-color: #FAF6F0; padding: 120px 20px 80px; font-family: 'DM Sans', sans-serif; }
.loading-state { display: flex; justify-content: center; align-items: center; height: 50vh; }
.spinner { width: 40px; height: 40px; border: 4px solid #cbd5e1; border-top-color: #0F2A1F; border-radius: 50%; animation: rot 0.8s linear infinite; }
@keyframes rot { to { transform: rotate(360deg); } }
.fade-in { animation: fi 0.3s ease-out; }
@keyframes fi { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

.orders-hub { max-width: 900px; margin: 0 auto; }
.page-title { text-align: center; margin-bottom: 40px; }
.page-title h1 { font-family: 'Cinzel', serif; font-size: 2.2rem; color: #0F2A1F; margin: 0 0 8px; font-weight: 800; }
.page-title p { color: #475569; font-size: 1.05rem; margin: 0; }

.hub-controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
.tabs-row { display: flex; background: #ffffff; padding: 6px; border-radius: 12px; border: 2px solid #cbd5e1; }
.tabs-row button { border: none; background: transparent; padding: 10px 20px; border-radius: 8px; font-weight: 700; color: #64748b; cursor: pointer; transition: 0.2s; }
.tabs-row button.active { background: #0F2A1F; color: white; }
.hub-search { flex: 1; min-width: 250px; padding: 12px 16px; border: 2px solid #cbd5e1; border-radius: 12px; font-size: 0.95rem; outline: none; }
.hub-search:focus { border-color: #0F2A1F; }

.empty-plate { background: #fff; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 60px 20px; text-align: center; }
.emoji-sad { font-size: 3rem; display: block; margin-bottom: 16px; opacity: 0.8; }
.shop-btn { margin-top: 16px; background: #0F2A1F; color: white; border: none; padding: 12px 24px; border-radius: 30px; font-weight: 800; cursor: pointer; }

.order-list { display: flex; flex-direction: column; gap: 24px; }
.order-ticket { background: #fff; border: 2px solid #0f172a; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.04); }

.ticket-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; gap: 12px; }
.head-left { display: flex; flex-direction: column; gap: 4px; }
.o-date { font-weight: 800; font-size: 1.1rem; color: #0f172a; }
.o-id { font-family: monospace; color: #64748b; font-size: 0.85rem; }
.head-right { display: flex; align-items: center; gap: 16px; }
.head-right strong { font-size: 1.2rem; color: #0f172a; }
.pill { padding: 6px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
.pending { background: #fef3c7; color: #92400e; }
.confirmed { background: #eff6ff; color: #1d4ed8; }
.shipped { background: #dcfce7; color: #15803d; }
.delivered { background: #f0fdf4; color: #16a34a; }
.rejected { background: #fef2f2; color: #dc2626; }

.ticket-body { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; padding: 24px; }
.p-list { display: flex; flex-direction: column; gap: 16px; }
.p-item { display: flex; align-items: center; gap: 16px; }
.p-icon { font-size: 1.8rem; background: #f1f5f9; padding: 10px; border-radius: 12px; border: 1px solid #e2e8f0; }
.p-details strong { display: block; font-size: 1.05rem; color: #0f172a; margin-bottom: 4px; }
.p-details span { color: #64748b; font-size: 0.9rem; font-weight: 600; }

.d-info { background: #f8fafc; border: 1px dashed #cbd5e1; padding: 16px; border-radius: 12px; }
.d-info h4 { margin: 0 0 8px; font-size: 0.8rem; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; }
.d-info p { margin: 0; font-weight: 700; color: #0f172a; }
.d-info .d-addr { font-weight: 500; font-size: 0.9rem; margin-top: 4px; color: #475569; line-height: 1.4; }

.ticket-foot { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
.tracking-zone { display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: white; padding: 12px 20px; border-radius: 12px; }
.tracking-zone span { font-weight: 700; font-size: 0.95rem; }
.track-btn { background: #10b981; color: white; text-decoration: none; padding: 8px 16px; border-radius: 8px; font-weight: 800; font-size: 0.9rem; }
.reject-zone { color: #dc2626; font-weight: 700; font-size: 0.95rem; }
.prep-zone { color: #64748b; font-weight: 600; font-style: italic; font-size: 0.9rem; }

@media (max-width: 768px) {
  .ticket-body { grid-template-columns: 1fr; }
  .hub-controls { flex-direction: column; align-items: stretch; }
  .tracking-zone { flex-direction: column; gap: 12px; text-align: center; }
  .track-btn { width: 100%; box-sizing: border-box; }
}
</style>