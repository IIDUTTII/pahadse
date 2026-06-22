<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '../firebase.js'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { updateOrderStatus, formatOrderStatus } from './db.js'

defineOptions({ name: 'UserOrders' })
const router = useRouter()

const initializing = ref(true)
const userOrders = ref([])
const activeTab = ref('all') // all, pending, confirmed, shipped, delivered, returns, cancelled
const searchQ = ref('')

// Interactive Workflow States
const selectedOrder = ref(null) // Controls the detail/action modal
const requestType = ref('') // 'return' or 'replacement'
const requestReason = ref('')
const showRequestForm = ref(false)
const processingAction = ref(false)

onMounted(() => {
  auth.onAuthStateChanged(async (currentUser) => {
    if (!currentUser) return router.push('/login')
    
    // ✨ Dynamic Real-time sync for orders status matrix
    const q = query(collection(db, 'orders'), where('userId', '==', currentUser.uid))
    onSnapshot(q, (snap) => {
      userOrders.value = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      
      // Auto-update selected order if modal is open
      if(selectedOrder.value) {
        const updated = userOrders.value.find(o => o.id === selectedOrder.value.id)
        if(updated) selectedOrder.value = updated
      }
      initializing.value = false
    })
  })
})

const filteredOrders = computed(() => {
  let list = userOrders.value

  // ✨ GRANULAR WORKFLOW FILTERS
  if (activeTab.value === 'pending') {
    list = list.filter(o => o.shippingStatus === 'pending')
  } else if (activeTab.value === 'confirmed') {
    list = list.filter(o => o.shippingStatus === 'confirmed')
  } else if (activeTab.value === 'shipped') {
    list = list.filter(o => o.shippingStatus === 'shipped')
  } else if (activeTab.value === 'delivered') {
    list = list.filter(o => o.shippingStatus === 'delivered')
  } else if (activeTab.value === 'returns') {
    list = list.filter(o => ['return_requested', 'returned_refund_pending', 'replacement_requested', 'replacement_approved', 'replaced'].includes(o.shippingStatus))
  } else if (activeTab.value === 'cancelled') {
    list = list.filter(o => ['rejected', 'cancelled', 'cancelled_refund_pending', 'refunded'].includes(o.shippingStatus))
  }

  // SEARCH FILTERS
  if (searchQ.value.trim()) {
    const q = searchQ.value.toLowerCase()
    list = list.filter(o => o.id.toLowerCase().includes(q) || o.items?.some(item => item.name.toLowerCase().includes(q)))
  }

  return list
})

const fmtDate = (ts) => ts?.seconds ? new Date(ts.seconds * 1000).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Processing'
const money = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER REVERSE LOGISTICS OPERATIONS (STRICT WORKFLOW)
// ─────────────────────────────────────────────────────────────────────────────
const handleCustomerCancel = async (order) => {
  const confirmMsg = order.paymentMethod === 'online' 
    ? "Are you sure you want to cancel? Since you paid online, your full amount will be queued for Admin processing."
    : "Are you sure you want to cancel this order?"
  
  if (!confirm(confirmMsg)) return
  
  processingAction.value = true
  const nextStatus = order.paymentMethod === 'online' ? 'cancelled_refund_pending' : 'cancelled'
  
  try {
    await updateOrderStatus(order.id, { 
      shippingStatus: nextStatus,
      adminComment: 'Cancelled by customer from history interface panel.'
    })
    alert("Order cancelled successfully.")
  } catch(e) {
    alert("Cancellation protocol failed: " + e.message)
  } finally { processingAction.value = false }
}

const openRequestForm = (type) => {
  requestType.value = type
  requestReason.value = ''
  showRequestForm.value = true
}

const submitReverseLogisticsRequest = async () => {
  if (!requestReason.value.trim()) return alert("Please specify a reason for your request.")
  processingAction.value = true
  
  const statusPayload = requestType.value === 'return' ? 'return_requested' : 'replacement_requested'
  const updateFields = requestType.value === 'return' 
    ? { shippingStatus: statusPayload, returnReason: requestReason.value.trim() }
    : { shippingStatus: statusPayload, replacementReason: requestReason.value.trim() }

  try {
    await updateOrderStatus(selectedOrder.value.id, updateFields)
    alert(`Your ${requestType.value} request has been submitted successfully.`);
    showRequestForm.value = false
  } catch(e) {
    alert("Request initialization crashed: " + e.message)
  } finally { processingAction.value = false }
}

const closeOrderModal = () => {
  selectedOrder.value = null
  showRequestForm.value = false
}
</script>

<template>
  <div class="client-orders-page">
    <div v-if="initializing" class="loading-state"><div class="spinner"></div></div>

    <div v-else class="orders-hub fade-in">
      <header class="page-title">
        <h1>Your Orders</h1>
        <p>Track packages, view history, and manage returns.</p>
      </header>

      <div class="filter-scroll-container">
        <button :class="['filter-btn', { active: activeTab === 'all' }]" @click="activeTab = 'all'">All</button>
        <button :class="['filter-btn', { active: activeTab === 'pending' }]" @click="activeTab = 'pending'">Pending</button>
        <button :class="['filter-btn', { active: activeTab === 'confirmed' }]" @click="activeTab = 'confirmed'">Confirmed</button>
        <button :class="['filter-btn', { active: activeTab === 'shipped' }]" @click="activeTab = 'shipped'">Shipped</button>
        <button :class="['filter-btn', { active: activeTab === 'delivered' }]" @click="activeTab = 'delivered'">Delivered</button>
        <button :class="['filter-btn', { active: activeTab === 'returns' }]" @click="activeTab = 'returns'">Returns & Replaces</button>
        <button :class="['filter-btn', { active: activeTab === 'cancelled' }]" @click="activeTab = 'cancelled'">Cancelled & Refunds</button>
      </div>

      <div class="search-wrap">
        <input v-model="searchQ" class="hub-search" placeholder="Search by product name or order ID..." />
      </div>

      <div v-if="filteredOrders.length === 0" class="empty-plate">
        <span class="emoji-sad">🏔️</span>
        <h3>No {{ activeTab === 'all' ? '' : activeTab }} orders found.</h3>
        <button @click="router.push('/')" class="shop-btn">Browse Shop</button>
      </div>

      <div v-else class="table-container fade-in">
        <table class="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Items Summary</th>
              <th>Total</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in filteredOrders" :key="order.id">
              <td><strong>#{{ order.id.slice(0,8).toUpperCase() }}</strong></td>
              <td class="text-muted">{{ fmtDate(order.createdAt) }}</td>
              <td>
                <div class="item-summary-cell">
                  <span v-for="(item, idx) in order.items" :key="idx" class="micro-item">
                    {{ item.name }} (x{{ item.quantity }})
                  </span>
                </div>
              </td>
              <td><strong>{{ money(order.amount) }}</strong></td>
              <td>
                <span :class="['pill', order.shippingStatus || 'pending']">
                  {{ formatOrderStatus(order.shippingStatus || 'pending') }}
                </span>
              </td>
              <td>
                <button class="manage-btn" @click="selectedOrder = order">Manage</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="selectedOrder" class="modal-overlay" @click.self="closeOrderModal">
        <div class="modal-card slide-up">
          
          <div class="modal-header">
            <div>
              <h3>Order #{{ selectedOrder.id.toUpperCase() }}</h3>
              <p>{{ fmtDate(selectedOrder.createdAt) }} • {{ selectedOrder.paymentMethod.toUpperCase() }}</p>
            </div>
            <button class="close-btn" @click="closeOrderModal">✕</button>
          </div>

          <div class="modal-body">
            <div class="status-banner">
              <strong>Current Status:</strong>
              <span :class="['pill', selectedOrder.shippingStatus || 'pending']" style="margin-left: 10px;">
                {{ formatOrderStatus(selectedOrder.shippingStatus || 'pending') }}
              </span>
            </div>

            <div v-if="selectedOrder.shippingStatus === 'shipped' && selectedOrder.trackingId" class="tracking-zone">
              <span>🚀 Dispatched from Hub</span>
              <a :href="'https://www.shiprocket.in/shipment-tracking/' + selectedOrder.trackingId" target="_blank" class="track-btn">Track Parcel</a>
            </div>
            <div v-else-if="selectedOrder.shippingStatus === 'replaced' && selectedOrder.replacementTrackingId" class="tracking-zone">
              <span>🔄 Replacement Dispatched!</span>
              <a :href="'https://www.shiprocket.in/shipment-tracking/' + selectedOrder.replacementTrackingId" target="_blank" class="track-btn">Track Replacement</a>
            </div>

            <div v-if="['cancelled_refund_pending', 'returned_refund_pending'].includes(selectedOrder.shippingStatus)" class="alert-strip">
              💸 <strong>Refund Pending:</strong> Your refund is being processed to your original payment method.
            </div>
            <div v-if="selectedOrder.returnRejectReason || selectedOrder.replacementRejectReason" class="alert-strip error">
              ❌ <strong>Request Declined:</strong> {{ selectedOrder.returnRejectReason || selectedOrder.replacementRejectReason }}
            </div>

            <div class="modal-items-list">
              <h4>Ordered Items</h4>
              <div v-for="(item, idx) in selectedOrder.items" :key="idx" class="m-item">
                <img v-if="item.imageUrl" :src="item.imageUrl" class="m-item-img"/>
                <div class="m-item-info">
                  <strong>{{ item.name }}</strong>
                  <span>{{ item.variant || 'Standard' }}</span>
                  <span class="m-qty">Qty: {{ item.quantity }} × {{ money(item.price) }}</span>
                </div>
              </div>
            </div>

            <div class="modal-action-zone">
              <div v-if="selectedOrder.shippingStatus === 'pending'" class="action-flex">
                <p class="helper-txt">Order is awaiting confirmation. You can still cancel it.</p>
                <button class="btn btn-red" @click="handleCustomerCancel(selectedOrder)" :disabled="processingAction">Cancel Order</button>
              </div>

              <div v-else-if="selectedOrder.shippingStatus === 'delivered'" class="action-flex">
                <p class="helper-txt">✓ Parcel delivered. You can request a return or replacement.</p>
                <div class="btn-group">
                  <button class="btn btn-outline" @click="openRequestForm('return')">Request Return</button>
                  <button class="btn btn-black" @click="openRequestForm('replacement')">Request Replacement</button>
                </div>
              </div>

              <div v-if="showRequestForm" class="request-form-box fade-in">
                <h4>Submit {{ requestType.toUpperCase() }} Request</h4>
                <textarea v-model="requestReason" placeholder="Please describe the issue in detail..." class="reason-input"></textarea>
                <div class="btn-group" style="margin-top: 10px;">
                  <button class="btn btn-outline" @click="showRequestForm = false">Cancel</button>
                  <button class="btn btn-black" @click="submitReverseLogisticsRequest" :disabled="processingAction">Submit Request</button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
.client-orders-page { min-height: 100vh; background-color: #FAFAF8; padding: 120px 20px 80px; font-family: 'Jost', sans-serif; }
.loading-state { display: flex; justify-content: center; align-items: center; height: 50vh; }
.spinner { width: 40px; height: 40px; border: 4px solid #cbd5e1; border-top-color: #111827; border-radius: 50%; animation: rot 0.8s linear infinite; }
@keyframes rot { to { transform: rotate(360deg); } }
.fade-in { animation: fi 0.3s ease-out; }
@keyframes fi { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.slide-up { animation: sUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes sUp { from { transform: translateY(40px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }

.orders-hub { max-width: 1100px; margin: 0 auto; }
.page-title { margin-bottom: 24px; }
.page-title h1 { font-family: 'Cinzel', serif; font-size: 2.2rem; color: #111827; margin: 0 0 4px; font-weight: 800; }
.page-title p { color: #64748b; font-size: 1rem; margin: 0; }

/* ✨ FILTER BUTTONS TRAY */
.filter-scroll-container { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 12px; margin-bottom: 16px; scrollbar-width: none; }
.filter-scroll-container::-webkit-scrollbar { display: none; }
.filter-btn { background: #ffffff; border: 1px solid #cbd5e1; padding: 10px 18px; border-radius: 30px; font-weight: 700; color: #475569; cursor: pointer; white-space: nowrap; transition: 0.2s; font-size: 0.9rem; }
.filter-btn:hover { border-color: #111827; color: #111827; }
.filter-btn.active { background: #111827; color: #ffffff; border-color: #111827; }

.search-wrap { margin-bottom: 24px; }
.hub-search { width: 100%; max-width: 400px; padding: 12px 16px; border: 2px solid #cbd5e1; border-radius: 12px; font-size: 0.95rem; outline: none; background: white; transition: 0.2s; box-sizing: border-box;}
.hub-search:focus { border-color: #111827; }

/* ✨ TABLE LAYOUT */
.table-container { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow-x: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
.orders-table { width: 100%; border-collapse: collapse; min-width: 800px; }
.orders-table th { background: #f8fafc; text-align: left; padding: 16px; font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; letter-spacing: 0.5px; }
.orders-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: #0f172a; }
.orders-table tr:hover { background: #f8fafc; }
.text-muted { color: #64748b; font-weight: 600; font-size: 0.9rem; }

.item-summary-cell { display: flex; flex-direction: column; gap: 4px; }
.micro-item { font-size: 0.85rem; font-weight: 600; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }

.manage-btn { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 8px; font-weight: 700; color: #111827; cursor: pointer; transition: 0.2s; font-size: 0.85rem;}
.manage-btn:hover { background: #111827; color: white; }

/* Status Pills */
.pill { padding: 4px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; border: 1px solid; white-space: nowrap;}
.pending { background: #fffbeb; color: #b45309; border-color: #fde68a;}
.confirmed { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe;}
.shipped { background: #fef08a; color: #92400e; border-color: #fde047;}
.delivered { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0;}
.cancelled_refund_pending, .returned_refund_pending, .return_requested, .replacement_requested { background: #fee2e2; color: #dc2626; border-color: #fca5a5;}
.rejected, .cancelled, .refunded, .replaced { background: #f1f5f9; color: #475569; border-color: #cbd5e1;}

/* ✨ MODAL STYLING */
.modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px; }
.modal-card { background: white; width: 100%; max-width: 600px; max-height: 90vh; border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
.modal-header { padding: 20px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { margin: 0 0 4px; font-size: 1.25rem; font-weight: 800; color: #111827; }
.modal-header p { margin: 0; font-size: 0.85rem; color: #64748b; font-weight: 600; }
.close-btn { background: #e2e8f0; border: none; width: 32px; height: 32px; border-radius: 50%; font-weight: 800; cursor: pointer; color: #475569; }
.close-btn:hover { background: #fecaca; color: #dc2626; }

.modal-body { padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
.status-banner { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 16px; border-radius: 12px; display: flex; align-items: center; }

.modal-items-list { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
.modal-items-list h4 { margin: 0 0 12px; font-size: 0.8rem; text-transform: uppercase; color: #64748b; font-weight: 800; }
.m-item { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px dashed #e2e8f0; }
.m-item:last-child { border: none; padding-bottom: 0; }
.m-item-img { width: 50px; height: 50px; border-radius: 8px; object-fit: cover; border: 1px solid #cbd5e1; }
.m-item-info { display: flex; flex-direction: column; gap: 2px; }
.m-item-info strong { font-size: 0.95rem; color: #0f172a; }
.m-item-info span { font-size: 0.8rem; color: #64748b; font-weight: 600; }

.tracking-zone { display: flex; justify-content: space-between; align-items: center; background: #111827; color: white; padding: 12px 20px; border-radius: 12px; flex-wrap: wrap; gap: 10px;}
.track-btn { background: #16a34a; color: white; text-decoration: none; padding: 8px 16px; border-radius: 8px; font-weight: 800; font-size: 0.9rem; }

.alert-strip { background: #fff7ed; border: 1px dashed #fdba74; padding: 14px; border-radius: 8px; color: #c2410c; font-weight: 600; font-size: 0.9rem; }
.alert-strip.error { background: #fef2f2; border-color: #fca5a5; color: #dc2626; }

.modal-action-zone { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
.helper-txt { margin: 0 0 12px; color: #475569; font-size: 0.9rem; font-weight: 600; }
.action-flex { display: flex; flex-direction: column; gap: 8px; }
.btn-group { display: flex; gap: 10px; }
.btn { padding: 12px 20px; border-radius: 8px; font-weight: 800; border: none; cursor: pointer; transition: 0.2s; font-size: 0.9rem; flex: 1; text-align: center; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-red { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.btn-black { background: #111827; color: white; }
.btn-outline { background: white; color: #111827; border: 1px solid #cbd5e1; }
.btn-outline:hover { background: #f1f5f9; }

.request-form-box { margin-top: 16px; padding-top: 16px; border-top: 1px dashed #cbd5e1; }
.request-form-box h4 { margin: 0 0 10px; font-size: 0.9rem; color: #0f172a; }
.reason-input { width: 100%; height: 80px; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; resize: none; font-family: inherit; font-size: 0.9rem; box-sizing: border-box; outline: none; }
.reason-input:focus { border-color: #111827; }

.empty-plate { background: #fff; border: 1px dashed #cbd5e1; border-radius: 16px; padding: 60px 20px; text-align: center; }
.emoji-sad { font-size: 3rem; display: block; margin-bottom: 16px; opacity: 0.8; }
.shop-btn { margin-top: 16px; background: #111827; color: white; border: none; padding: 12px 24px; border-radius: 30px; font-weight: 800; cursor: pointer; }

@media (max-width: 768px) {
  .btn-group { flex-direction: column; }
  .tracking-zone { justify-content: center; text-align: center; }
  .track-btn { width: 100%; box-sizing: border-box; text-align: center; }
}
</style>