<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '../firebase.js'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { updateOrderStatus } from './db.js' // ✨ IMPORT CANCEL FUNCTION

defineOptions({ name: 'UserOrders' })
const router = useRouter()

const initializing = ref(true)
const userOrders = ref([])
const activeTab = ref('active') // active, completed, cancelled
const searchQ = ref('')

onMounted(() => {
  auth.onAuthStateChanged(async (currentUser) => {
    if (!currentUser) return router.push('/login')
    
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

  // 1. FILTER BY TAB (Included 'cancelled' status)
  if (activeTab.value === 'active') {
    list = list.filter(o => ['pending', 'confirmed', 'shipped'].includes(o.shippingStatus))
  } else if (activeTab.value === 'completed') {
    list = list.filter(o => o.shippingStatus === 'delivered')
  } else if (activeTab.value === 'cancelled') {
    list = list.filter(o => ['rejected', 'cancelled'].includes(o.shippingStatus))
  }

  // 2. SEARCH BY PRODUCT NAME OR ID
  if (searchQ.value.trim()) {
    const q = searchQ.value.toLowerCase()
    list = list.filter(o => {
      if (o.id.toLowerCase().includes(q)) return true
      if (o.items?.some(item => item.name.toLowerCase().includes(q))) return true
      return false
    })
  }

  return list
})

const fmtDate = (ts) => ts?.seconds ? new Date(ts.seconds * 1000).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Processing'

// ✨ CANCEL ORDER LOGIC
const cancelUserOrder = async (orderId) => {
  if (!confirm("Are you sure you want to cancel this order? This action cannot be undone.")) return;
  
  try {
    // 1. Update in Backend Database
    await updateOrderStatus(orderId, { 
      shippingStatus: 'cancelled', 
      adminComment: 'Cancelled by customer before confirmation.' 
    });
    
    // 2. Update locally so UI changes immediately without reloading
    const oIdx = userOrders.value.findIndex(o => o.id === orderId);
    if (oIdx > -1) {
      userOrders.value[oIdx].shippingStatus = 'cancelled';
      userOrders.value[oIdx].adminComment = 'Cancelled by customer before confirmation.';
    }
    
    alert("Your order has been successfully cancelled.");
  } catch (error) {
    alert("Could not cancel the order: " + error.message);
  }
}
</script>

<template>
  <div class="client-orders-page">
    <div v-if="initializing" class="loading-state"><div class="spinner"></div></div>

    <div v-else class="orders-hub fade-in">
      <header class="page-title">
        <h1>Your Orders</h1>
        <p>Track packages and review past purchases.</p>
      </header>

      <div class="hub-controls">
        <div class="tabs-row">
          <button :class="{ active: activeTab === 'active' }" @click="activeTab = 'active'">In Progress</button>
          <button :class="{ active: activeTab === 'completed' }" @click="activeTab = 'completed'">Delivered</button>
          <button :class="{ active: activeTab === 'cancelled' }" @click="activeTab = 'cancelled'">Cancelled</button>
        </div>
        <input v-model="searchQ" class="hub-search" placeholder="Search by item name or Order ID..." />
      </div>

      <div v-if="filteredOrders.length === 0" class="empty-plate">
        <span class="emoji-sad">🏔️</span>
        <h3>No {{ activeTab }} orders found.</h3>
        <p v-if="searchQ">Try adjusting your search terms.</p>
        <button v-else @click="router.push('/')" class="shop-btn">Browse Shop</button>
      </div>

      <div v-else class="order-list">
        <div v-for="order in filteredOrders" :key="order.id" class="order-ticket">
          
          <div class="ticket-head">
            <div class="head-left">
              <span class="o-date">Placed on {{ fmtDate(order.createdAt) }}</span>
              <span class="o-id">Order ID: {{ order.id }}</span>
            </div>
            <div class="head-right">
              <strong>₹{{ order.amount }}</strong>
              <span :class="['status-pill', order.shippingStatus]">{{ order.shippingStatus || 'Processing' }}</span>
            </div>
          </div>

          <div class="ticket-body">
            <div class="p-list">
              <div v-for="(item, idx) in order.items" :key="idx" class="p-item">
                
                <div class="p-img-box">
                  <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" class="p-item-img" />
                  <span v-else class="p-emoji">{{ item.emoji || '📦' }}</span>
                </div>
                
                <div class="p-details">
                  <strong>{{ item.name }}</strong>
                  <span class="p-variant">{{ item.variant || item.weight || 'Standard' }}</span>
                  <span class="p-qty">Qty: {{ item.quantity }} | ₹{{ item.price }} each</span>
                </div>
              </div>
            </div>
            
            <div class="d-info">
              <h4>Shipping Details</h4>
              <p>{{ order.customerName }}</p>
              <p class="d-addr">{{ order.address }}</p>
              <p class="d-method">Method: {{ order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Prepaid Online' }}</p>
            </div>
          </div>

          <div class="ticket-foot">
            <div v-if="order.shippingStatus === 'shipped' && order.trackingId" class="tracking-zone">
              <span>🚀 Out for Delivery</span>
              <a :href="'https://www.shiprocket.in/shipment-tracking/' + order.trackingId" target="_blank" class="track-btn">Live Track</a>
            </div>
            
            <div v-else-if="['rejected', 'cancelled'].includes(order.shippingStatus)" class="reject-zone">
              <span>❌ Order Cancelled</span>
              <span class="reject-reason" v-if="order.adminComment">{{ order.adminComment }}</span>
            </div>
            
            <div v-else-if="order.shippingStatus === 'pending'" class="action-zone">
              <span class="prep-zone">Waiting for confirmation.</span>
              <button class="cancel-order-btn" @click="cancelUserOrder(order.id)">Cancel Order</button>
            </div>
            
            <div v-else class="prep-zone">
              ✓ Order Confirmed. Preparing for dispatch.
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.client-orders-page { min-height: 100vh; background-color: #FAFAF8; padding: 120px 20px 80px; font-family: 'Jost', sans-serif; }
.loading-state { display: flex; justify-content: center; align-items: center; height: 50vh; }
.spinner { width: 40px; height: 40px; border: 4px solid #cbd5e1; border-top-color: #111827; border-radius: 50%; animation: rot 0.8s linear infinite; }
@keyframes rot { to { transform: rotate(360deg); } }
.fade-in { animation: fi 0.3s ease-out; }
@keyframes fi { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

.orders-hub { max-width: 900px; margin: 0 auto; }
.page-title { text-align: center; margin-bottom: 40px; }
.page-title h1 { font-family: 'Cinzel', serif; font-size: 2.5rem; color: #111827; margin: 0 0 8px; font-weight: 800; }
.page-title p { color: #6B7280; font-size: 1.05rem; margin: 0; }

.hub-controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
.tabs-row { display: flex; background: #ffffff; padding: 6px; border-radius: 12px; border: 1px solid #E5E7EB; }
.tabs-row button { border: none; background: transparent; padding: 10px 20px; border-radius: 8px; font-weight: 700; color: #6B7280; cursor: pointer; transition: 0.2s; font-size: 0.95rem; }
.tabs-row button.active { background: #111827; color: white; }
.hub-search { flex: 1; min-width: 250px; padding: 12px 16px; border: 1px solid #E5E7EB; border-radius: 12px; font-size: 0.95rem; outline: none; background: #ffffff; }
.hub-search:focus { border-color: #111827; }

.empty-plate { background: #fff; border: 1px dashed #D1D5DB; border-radius: 16px; padding: 60px 20px; text-align: center; }
.emoji-sad { font-size: 3rem; display: block; margin-bottom: 16px; opacity: 0.8; }
.shop-btn { margin-top: 16px; background: #111827; color: white; border: none; padding: 12px 24px; border-radius: 30px; font-weight: 700; cursor: pointer; }

.order-list { display: flex; flex-direction: column; gap: 24px; }
.order-ticket { background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }

.ticket-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: #F9FAFB; border-bottom: 1px solid #E5E7EB; flex-wrap: wrap; gap: 12px; }
.head-left { display: flex; flex-direction: column; gap: 4px; }
.o-date { font-weight: 800; font-size: 1.05rem; color: #111827; }
.o-id { font-family: monospace; color: #6B7280; font-size: 0.85rem; }
.head-right { display: flex; align-items: center; gap: 16px; }
.head-right strong { font-size: 1.25rem; color: #111827; font-weight: 900;}
.status-pill { padding: 6px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid transparent; }
.pending { background: #FEF3C7; color: #92400E; border-color: #FDE68A; }
.confirmed { background: #EFF6FF; color: #1D4ED8; border-color: #BFDBFE; }
.shipped { background: #DCFCE7; color: #15803D; border-color: #BBF7D0; }
.delivered { background: #F0FDF4; color: #16A34A; border-color: #86EFAC; }
.rejected, .cancelled { background: #FEF2F2; color: #DC2626; border-color: #FECACA; }

.ticket-body { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; padding: 24px; }
.p-list { display: flex; flex-direction: column; gap: 16px; }
.p-item { display: flex; align-items: flex-start; gap: 16px; border-bottom: 1px solid #F3F4F6; padding-bottom: 16px;}
.p-item:last-child { border-bottom: none; padding-bottom: 0; }

.p-img-box { width: 64px; height: 64px; border-radius: 10px; background: #F3F4F6; border: 1px solid #E5E7EB; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
.p-item-img { width: 100%; height: 100%; object-fit: cover; }
.p-emoji { font-size: 1.8rem; }

.p-details { display: flex; flex-direction: column; gap: 4px; }
.p-details strong { font-size: 1.05rem; color: #111827; font-weight: 700; line-height: 1.2; }
.p-variant { font-size: 0.8rem; color: #4B5563; font-weight: 700; background: #F3F4F6; padding: 2px 8px; border-radius: 4px; align-self: flex-start; text-transform: uppercase; letter-spacing: 0.5px;}
.p-qty { color: #6B7280; font-size: 0.9rem; font-weight: 500; margin-top: 4px; }

.d-info { background: #F9FAFB; border: 1px solid #E5E7EB; padding: 16px; border-radius: 12px; height: fit-content; }
.d-info h4 { margin: 0 0 10px; font-size: 0.8rem; text-transform: uppercase; color: #9CA3AF; font-weight: 800; letter-spacing: 0.5px; }
.d-info p { margin: 0; font-weight: 700; color: #111827; }
.d-info .d-addr { font-weight: 500; font-size: 0.9rem; margin-top: 6px; color: #4B5563; line-height: 1.4; }
.d-method { margin-top: 10px !important; font-size: 0.85rem; color: #16a34a !important; font-weight: 700 !important; }

.ticket-foot { padding: 16px 24px; background: #F9FAFB; border-top: 1px solid #E5E7EB; }
.tracking-zone { display: flex; justify-content: space-between; align-items: center; background: #111827; color: white; padding: 12px 20px; border-radius: 12px; }
.tracking-zone span { font-weight: 700; font-size: 0.95rem; }
.track-btn { background: #16A34A; color: white; text-decoration: none; padding: 8px 16px; border-radius: 8px; font-weight: 800; font-size: 0.9rem; transition: 0.2s; }
.track-btn:hover { background: #15803D; }

.reject-zone { display: flex; flex-direction: column; color: #DC2626; font-weight: 700; font-size: 0.95rem; }
.reject-reason { font-size: 0.85rem; font-weight: 500; color: #991B1B; margin-top: 4px; }

.action-zone { display: flex; justify-content: space-between; align-items: center; }
.prep-zone { color: #6B7280; font-weight: 600; font-size: 0.95rem; }
.cancel-order-btn { background: #ffffff; color: #DC2626; border: 2px solid #FECACA; padding: 8px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.2s; font-size: 0.9rem; }
.cancel-order-btn:hover { background: #FEF2F2; border-color: #DC2626; }

@media (max-width: 768px) {
  .ticket-body { grid-template-columns: 1fr; gap: 16px; padding: 16px; }
  .hub-controls { flex-direction: column; align-items: stretch; }
  .tabs-row button { flex: 1; text-align: center; }
  .action-zone { flex-direction: column; align-items: stretch; gap: 12px; text-align: center; }
  .cancel-order-btn { width: 100%; }
}
</style>