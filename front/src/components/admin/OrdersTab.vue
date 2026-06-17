<script setup>
import { ref, computed, watch } from 'vue'
import { db } from '../../firebase.js'
import { collection, query, orderBy, limit, onSnapshot, getDoc, doc } from 'firebase/firestore'
import { confirmOrderInDb, rejectOrderInDb, shipOrderInDb, updateOrderStatus } from '../db.js' // ✨ Added updateOrderStatus

const props = defineProps({ userRole: { type: String, default: 'user' } })

const ordersList = ref([])
const loadLimit = ref(6) 
const searchQ = ref('')
const activeFilter = ref('all')

let _unsub = null

// ✨ DIRECT PAGINATION LOGIC
watch(loadLimit, (newLimit) => {
  if (_unsub) _unsub()
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(newLimit))
  _unsub = onSnapshot(q, snap => {
    ordersList.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  })
}, { immediate: true })

const filteredOrders = computed(() => {
  let list = ordersList.value
  if (activeFilter.value !== 'all') list = list.filter(o => o.shippingStatus === activeFilter.value)
  
  if (searchQ.value.trim()) {
    const q = searchQ.value.toLowerCase()
    list = list.filter(o => 
      o.id.toLowerCase().includes(q) || 
      (o.customerName || '').toLowerCase().includes(q) ||
      (o.phone || '').includes(q)
    )
  }
  return list
})

const searchDatabaseExtensively = async () => {
  if (!searchQ.value) return
  try {
    const snap = await getDoc(doc(db, 'orders', searchQ.value.trim()))
    if (snap.exists()) {
      const o = { id: snap.id, ...snap.data() }
      if (!ordersList.value.find(existing => existing.id === o.id)) ordersList.value.unshift(o)
      alert("Found exact match in database!")
    } else {
      alert("No order found with that exact ID.")
    }
  } catch (e) { console.error(e) }
}

const selected = ref(null), rejectionComment = ref(''), trackingId = ref('')

const openOrder = (o) => { 
  selected.value = o; 
  rejectionComment.value = ''; 
  trackingId.value = o.trackingId !== 'PENDING_DISPATCH' ? o.trackingId : ''; 
}

// ✨ ACTION PIPELINE HANDLERS
const handleConfirm = async () => { 
  await confirmOrderInDb(selected.value.id); 
  selected.value.shippingStatus = 'confirmed' 
}
const handleShip = async () => { 
  if (!trackingId.value) return alert('Enter AWB tracking ID'); 
  await shipOrderInDb(selected.value.id, trackingId.value); 
  selected.value.shippingStatus = 'shipped'; 
  selected.value.trackingId = trackingId.value 
}
const handleDelivered = async () => { 
  if(!confirm("Mark this order as successfully delivered to the customer?")) return;
  await updateOrderStatus(selected.value.id, { shippingStatus: 'delivered' }); 
  selected.value.shippingStatus = 'delivered' 
}
const handleReject = async () => { 
  if (!rejectionComment.value) return alert('Enter a cancellation/rejection reason.'); 
  await rejectOrderInDb(selected.value.id, rejectionComment.value); 
  selected.value.shippingStatus = 'rejected' 
}

const fmtDate = (ts) => ts?.seconds ? new Date(ts.seconds * 1000).toLocaleString('en-IN') : '—'

// Helper for Pipeline UI
const getStepStatus = (stepName, currentStatus) => {
  const flow = ['pending', 'confirmed', 'shipped', 'delivered'];
  if (['rejected', 'cancelled'].includes(currentStatus)) return 'failed';
  const currentIndex = flow.indexOf(currentStatus);
  const stepIndex = flow.indexOf(stepName);
  if (currentIndex > stepIndex) return 'completed';
  if (currentIndex === stepIndex) return 'active';
  return 'waiting';
}
</script>

<template>
  <div class="fade-in">
    <div class="admin-panel-head">
      <div class="info">
        <h2>Orders Fulfillment</h2>
        <p>Manage shipments, process AWB tracking, and handle deliveries.</p>
      </div>
      <div class="filters">
        <div class="search-box">
          <input v-model="searchQ" placeholder="Search Customer, Phone, or ID..." @keyup.enter="searchDatabaseExtensively" />
          <button @click="searchDatabaseExtensively">🔍 Deep Search</button>
        </div>
        <select v-model="activeFilter">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="shipped">Shipped (In Transit)</option>
          <option value="delivered">Delivered</option>
          <option value="rejected">Cancelled/Rejected</option>
        </select>
      </div>
    </div>

    <div class="order-grid">
      <div v-for="o in filteredOrders" :key="o.id" class="o-card" @click="openOrder(o)">
        <div class="c-head">
          <span :class="['pill', o.shippingStatus]">{{ o.shippingStatus || 'pending' }}</span>
          <span class="c-time">{{ fmtDate(o.createdAt) }}</span>
        </div>
        <h3 class="c-name">{{ o.customerName }}</h3>
        <p class="c-id">ID: <code>{{ o.id }}</code></p>
        <div class="c-foot">
          <span class="c-price">₹{{ o.amount }}</span>
          <span class="c-items">{{ o.items?.length || 0 }} Items</span>
        </div>
      </div>
    </div>
    
    <div class="load-more-zone"><button class="btn-outline" @click="loadLimit += 6">↓ Load Older Orders</button></div>

    <Teleport to="body">
      <div v-if="selected" class="overlay" @click.self="selected = null">
        <div class="detail-drawer slide-left">
          
          <header class="d-head">
            <div>
              <h3>Order <code>{{ selected.id }}</code></h3>
              <p>{{ fmtDate(selected.createdAt) }}</p>
            </div>
            <button class="close-x" @click="selected = null">✕</button>
          </header>

          <div class="d-body">
            
            <section class="pipeline-tracker">
              <div :class="['step', getStepStatus('pending', selected.shippingStatus)]"><span>1</span><p>Pending</p></div>
              <div class="line"></div>
              <div :class="['step', getStepStatus('confirmed', selected.shippingStatus)]"><span>2</span><p>Confirmed</p></div>
              <div class="line"></div>
              <div :class="['step', getStepStatus('shipped', selected.shippingStatus)]"><span>3</span><p>Shipped</p></div>
              <div class="line"></div>
              <div :class="['step', getStepStatus('delivered', selected.shippingStatus)]"><span>4</span><p>Delivered</p></div>
            </section>

            <div v-if="['rejected', 'cancelled'].includes(selected.shippingStatus)" class="status-ribbon rejected">
              <strong>Order Terminated:</strong> <span>{{ selected.adminComment || 'Cancelled by user.' }}</span>
            </div>

            <section class="info-sec">
              <h4>Delivery Destination</h4>
              <div class="d-card">
                <strong>{{ selected.customerName }}</strong>
                <p>📞 {{ selected.phone }}</p>
                <hr>
                <p class="address-text">{{ selected.address }}</p>
              </div>
            </section>

            <section class="info-sec">
              <h4>Cart Inventory</h4>
              <div class="d-card items-list">
                <div v-for="(item, idx) in selected.items" :key="idx" class="item-row">
                  
                  <div class="i-img-box">
                    <img v-if="item.imageUrl" :src="item.imageUrl" class="i-visual" />
                    <span v-else class="i-emoji">{{ item.emoji || '📦' }}</span>
                  </div>
                  
                  <div class="i-info">
                    <strong>{{ item.name }}</strong>
                    <span class="i-variant-badge">{{ item.variant || item.weight || 'Standard' }}</span>
                    <span>Qty: {{ item.quantity }} × ₹{{ item.price }}</span>
                  </div>
                  <strong class="i-total">₹{{ item.quantity * item.price }}</strong>
                </div>
              </div>
            </section>

            <section class="info-sec">
              <h4>Financials</h4>
              <div class="d-card math-grid">
                <div><span>Method</span><strong :class="{'text-green': selected.paymentMethod !== 'cod'}">{{ selected.paymentMethod.toUpperCase() }}</strong></div>
                <div v-if="selected.couponCode"><span>Voucher</span><strong class="text-green">-₹{{ selected.couponDiscount }} ({{ selected.couponCode }})</strong></div>
                <div><span>Net Settlement</span><strong style="font-size:1.2rem;">₹{{ selected.amount }}</strong></div>
              </div>
            </section>

            <section class="action-zone" v-if="!['delivered', 'rejected', 'cancelled'].includes(selected.shippingStatus)">
              <h4>Fulfillment Actions</h4>
              
              <button v-if="selected.shippingStatus === 'pending'" class="btn primary full" @click="handleConfirm">
                ✓ Authorize & Confirm Order
              </button>

              <div v-if="selected.shippingStatus === 'confirmed'" class="ship-box">
                <input v-model="trackingId" placeholder="Paste Courier Tracking URL/ID..." />
                <button class="btn black" @click="handleShip">Mark as Shipped 🚀</button>
              </div>

              <div v-if="selected.shippingStatus === 'shipped'" class="deliver-box">
                <div class="tracking-display">
                  🚚 Active Tracking: <br><code>{{ selected.trackingId }}</code>
                </div>
                <button class="btn success full" @click="handleDelivered">✓ Mark as Delivered to Customer</button>
              </div>

              <hr v-if="['pending', 'confirmed'].includes(selected.shippingStatus)" class="action-divider">

              <div v-if="['pending', 'confirmed'].includes(selected.shippingStatus)" class="reject-box">
                <textarea v-model="rejectionComment" placeholder="Reason for cancellation/rejection..."></textarea>
                <button class="btn danger full" @click="handleReject">✕ Reject / Cancel Order</button>
              </div>
            </section>

            <div v-if="selected.shippingStatus === 'delivered'" class="completed-ribbon">
              🎉 This order has been successfully delivered and closed.
            </div>

          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.admin-panel-head { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 20px; margin-bottom: 24px; }
.info h2 { font-size: 1.8rem; margin: 0 0 4px; color: #0f172a; font-weight: 800; }
.info p { margin: 0; color: #64748b; font-size: 0.95rem; }
.filters { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.search-box { display: flex; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; }
.search-box input { padding: 10px 14px; border: none; outline: none; width: 260px; font-size: 0.9rem; }
.search-box button { background: #f1f5f9; border: none; border-left: 1px solid #cbd5e1; padding: 0 14px; font-weight: 700; cursor: pointer; color: #0f172a; transition: 0.2s; }
.search-box button:hover { background: #e2e8f0; }
.filters select { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; background: #fff; font-weight: 600; }

.order-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.o-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
.o-card:hover { border-color: #0F2A1F; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(15,42,31,0.05); }
.c-head { display: flex; justify-content: space-between; margin-bottom: 12px; }
.c-time { font-size: 0.75rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; }
.c-name { margin: 0 0 4px; font-size: 1.15rem; font-weight: 800; color: #0f172a; }
.c-id code { font-size: 0.8rem; color: #64748b; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
.c-foot { display: flex; justify-content: space-between; margin-top: 16px; padding-top: 16px; border-top: 1px dashed #e2e8f0; align-items: center; }
.c-price { font-size: 1.2rem; font-weight: 900; color: #0f172a; }
.c-items { font-size: 0.85rem; font-weight: 700; color: #64748b; background: #f8fafc; padding: 4px 10px; border-radius: 20px; }

.pill { padding: 4px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; }
.pending { background: #fffbeb; color: #b45309; }
.confirmed { background: #eff6ff; color: #1d4ed8; }
.shipped { background: #fef08a; color: #92400e; }
.delivered { background: #dcfce7; color: #15803d; }
.rejected, .cancelled { background: #fef2f2; color: #dc2626; }

/* Modal Drawer UI */
.overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); z-index: 1000; display: flex; justify-content: flex-end; backdrop-filter: blur(4px); }
.detail-drawer { width: 100%; max-width: 520px; background: #f8fafc; height: 100vh; display: flex; flex-direction: column; box-shadow: -10px 0 40px rgba(0,0,0,0.1); }
.slide-left { animation: sLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes sLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }

.d-head { padding: 24px; background: #fff; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
.d-head h3 { margin: 0; font-size: 1.4rem; color: #0f172a; }
.d-head p { margin: 4px 0 0; color: #64748b; font-size: 0.9rem; }
.close-x { background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 8px; font-weight: 800; cursor: pointer; color: #475569; }
.d-body { padding: 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 24px; }

/* ✨ PIPELINE UI */
.pipeline-tracker { display: flex; align-items: center; justify-content: space-between; background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
.pipeline-tracker .step { display: flex; flex-direction: column; align-items: center; gap: 8px; position: relative; z-index: 2; width: 60px; }
.pipeline-tracker .step span { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: 800; background: #f1f5f9; color: #94a3b8; border: 2px solid #cbd5e1; transition: 0.3s; }
.pipeline-tracker .step p { margin: 0; font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
.pipeline-tracker .line { flex: 1; height: 3px; background: #e2e8f0; margin: 0 -15px; transform: translateY(-12px); z-index: 1; transition: 0.3s; }

.step.completed span { background: #16a34a; border-color: #16a34a; color: white; }
.step.completed p { color: #16a34a; }
.step.completed + .line { background: #16a34a; }
.step.active span { background: #fff; border-color: #2563eb; color: #2563eb; box-shadow: 0 0 0 4px #eff6ff; }
.step.active p { color: #2563eb; }
.step.failed span { background: #dc2626; border-color: #dc2626; color: white; }
.step.failed p { color: #dc2626; }

.status-ribbon { padding: 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; border: 1px solid; }
.status-ribbon.rejected { background: #fef2f2; border-color: #fecaca; color: #dc2626; flex-direction: column; align-items: flex-start; gap: 4px; }

.completed-ribbon { background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; padding: 16px; border-radius: 12px; text-align: center; font-weight: 700; font-size: 0.95rem; }

.info-sec h4 { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: #64748b; margin: 0 0 10px; letter-spacing: 0.5px; }
.d-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.01); }
.d-card strong { color: #0f172a; font-size: 1.05rem; }
.d-card p { margin: 4px 0 0; color: #475569; font-size: 0.9rem; }
.d-card hr { border: none; border-top: 1px dashed #e2e8f0; margin: 12px 0; }

/* ✨ UPDATED ITEM ROW FOR VARIANT AND IMAGE */
.item-row { display: flex; align-items: flex-start; gap: 14px; padding: 14px 0; border-bottom: 1px solid #f1f5f9; }
.item-row:last-child { border: none; padding-bottom: 0; }
.i-img-box { width: 50px; height: 50px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
.i-visual { width: 100%; height: 100%; object-fit: cover; }
.i-emoji { font-size: 1.5rem; }
.i-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.i-info strong { line-height: 1.2; }
.i-variant-badge { background: #f1f5f9; color: #475569; font-size: 0.75rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; align-self: flex-start; text-transform: uppercase; }
.i-info span { color: #64748b; font-size: 0.85rem; }
.i-total { font-weight: 900; margin-top: 4px; }

.math-grid { display: flex; flex-direction: column; gap: 12px; }
.math-grid div { display: flex; justify-content: space-between; font-size: 0.95rem; }
.math-grid span { color: #64748b; font-weight: 600; }
.text-green { color: #16a34a !important; }

.action-zone { background: #fff; padding: 20px; border-radius: 12px; border: 2px dashed #cbd5e1; display: flex; flex-direction: column; gap: 16px; }
.action-divider { border: none; border-top: 1px dashed #cbd5e1; margin: 4px 0; }
.btn { padding: 14px; border-radius: 8px; font-weight: 800; border: none; cursor: pointer; transition: 0.2s; font-size: 0.95rem; }
.btn.full { width: 100%; }
.btn.primary { background: #2563eb; color: #fff; }
.btn.black { background: #0f172a; color: #fff; }
.btn.success { background: #16a34a; color: #fff; }
.btn.danger { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

.ship-box { display: flex; gap: 8px; }
.ship-box input { flex: 1; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; font-weight: 500;}
.deliver-box { display: flex; flex-direction: column; gap: 12px; }
.tracking-display { padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; color: #0f172a; border-radius: 8px; text-align: center; font-size: 0.9rem; font-weight: 600; }
.tracking-display code { display: inline-block; margin-top: 6px; font-size: 1.1rem; color: #2563eb; background: #eff6ff; padding: 4px 10px; border-radius: 4px; }

.reject-box textarea { width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #fca5a5; border-radius: 8px; resize: vertical; min-height: 80px; margin-bottom: 8px; outline: none; font-family: inherit; }

.load-more-zone { display: flex; justify-content: center; padding: 24px 0; }
.btn-outline { background: white; border: 2px solid #cbd5e1; padding: 12px 24px; border-radius: 30px; font-weight: 700; cursor: pointer; color: #0f172a; transition: 0.2s; }
.btn-outline:hover { border-color: #0F2A1F; color: #0F2A1F; }
</style>