<script setup>
import { ref, computed, watch, onUnmounted, onMounted } from 'vue'
import { db } from '../../firebase.js'
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore'
import {
  confirmOrderInDb, rejectOrderInDb, shipOrderInDb, markOrderDeliveredInDb,
  processRefundInDb, approveReturnInDb, rejectReturnInDb, 
  approveReplacementInDb, markReplacedInDb
} from '../db.js'

const props = defineProps({ userRole: { type: String, default: 'user' } })

const ordersList = ref([])
const loadLimit = ref(10) // ✨ 10 at a time
const searchQ = ref('')
const activeFilter = ref('all')
const filterDate = ref('') // ✨ NEW: Calendar Filter
const selected = ref(null)

// Action States
const rejectionComment = ref('')
const trackingId = ref('')
const returnRejectReason = ref('')
const actionBusy = ref(false)
let _unsub = null

// ✨ LISTENS FOR CLICKS FROM ANALYTICS TAB
onMounted(() => {
  const checkFilter = () => {
    const f = sessionStorage.getItem('adminOrderFilter')
    if (f) {
      activeFilter.value = f
      sessionStorage.removeItem('adminOrderFilter')
    }
  }
  checkFilter() // Check on load
  window.addEventListener('apply-order-filter', checkFilter)
})

// ✨ DYNAMIC QUERY BUILDER (Includes Date Bounds)
watch([loadLimit, filterDate], ([newLimit, dateStr]) => {
  if (_unsub) _unsub()
  
  let constraints = [orderBy('createdAt', 'desc')]
  
  // Apply Date Bounds if selected
  if (dateStr) {
    const start = new Date(dateStr)
    start.setHours(0, 0, 0, 0)
    const end = new Date(dateStr)
    end.setHours(23, 59, 59, 999)
    constraints.push(where('createdAt', '>=', start))
    constraints.push(where('createdAt', '<=', end))
  }
  
  constraints.push(limit(newLimit))
  
  const q = query(collection(db, 'orders'), ...constraints)
  _unsub = onSnapshot(q, snap => {
    ordersList.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    if (selected.value) {
      const fresh = ordersList.value.find(o => o.id === selected.value.id)
      if (fresh) selected.value = fresh
    }
  })
}, { immediate: true })

onUnmounted(() => { if (_unsub) _unsub() })

const filteredOrders = computed(() => {
  let list = ordersList.value
  if (activeFilter.value !== 'all') list = list.filter(o => (o.shippingStatus || 'pending') === activeFilter.value)

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

const openOrder = (o) => {
  selected.value = o
  rejectionComment.value = ''
  trackingId.value = ''
  returnRejectReason.value = ''
}
const closeOrder = () => { selected.value = null }

const runAction = async (fn, statusUpdate) => {
  actionBusy.value = true
  try {
    await fn()
    if(statusUpdate) selected.value.shippingStatus = statusUpdate
  } catch (e) { alert(e.message) } 
  finally { actionBusy.value = false }
}

// STATE MACHINE HANDLERS
const handleConfirm = () => runAction(() => confirmOrderInDb(selected.value.id), 'confirmed')
const handleShip = () => { if (!trackingId.value.trim()) return alert('Enter AWB'); runAction(() => shipOrderInDb(selected.value.id, trackingId.value), 'shipped') }
const handleDelivered = () => runAction(() => markOrderDeliveredInDb(selected.value.id), 'delivered')
const handleReject = () => { if (!rejectionComment.value.trim()) return alert('Reason?'); runAction(() => rejectOrderInDb(selected.value.id, rejectionComment.value)) }

const handleProcessRefund = () => { if(confirm('Processed refund in bank?')) runAction(() => processRefundInDb(selected.value.id), 'refunded') }
const handleApproveReturn = () => runAction(() => approveReturnInDb(selected.value.id, selected.value.paymentMethod))
const handleRejectReturn = () => { if(!returnRejectReason.value.trim()) return alert('Reason?'); runAction(() => rejectReturnInDb(selected.value.id, returnRejectReason.value), 'delivered') }
const handleApproveReplacement = () => runAction(() => approveReplacementInDb(selected.value.id), 'replacement_approved')
const handleRejectReplacement = () => { if(!returnRejectReason.value.trim()) return alert('Reason?'); runAction(() => rejectReplacementInDb(selected.value.id, returnRejectReason.value), 'delivered') }
const handleMarkReplaced = () => { if (!trackingId.value.trim()) return alert('New AWB?'); runAction(() => markReplacedInDb(selected.value.id, trackingId.value), 'replaced') }

const fmtDate = (ts) => ts?.seconds ? new Date(ts.seconds * 1000).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}) : '-'
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`
</script>

<template>
  <div class="fade-in">
    <div class="admin-panel-head">
      <div>
        <h2 class="ws-title">Orders Pipeline</h2>
        <p class="ws-sub">Table-view tracking and fulfillment engine.</p>
      </div>
    </div>

    <div class="toolbar-row">
      <input type="date" v-model="filterDate" class="date-picker" title="Filter by Order Date" />
      <input v-model="searchQ" class="search-box" placeholder="Search ID, Customer..." />
      <select v-model="activeFilter" class="filter-select">
        <option value="all">All Statuses</option>
        <option value="pending">Pending</option>
        <option value="confirmed">Confirmed</option>
        <option value="shipped">Shipped</option>
        <option value="delivered">Delivered</option>
        <option value="return_requested">Return Requested</option>
        <option value="returned_refund_pending">Return Pending Refund</option>
        <option value="cancelled_refund_pending">Cancel Pending Refund</option>
        <option value="replacement_requested">Replacement Req.</option>
        <option value="replacement_approved">Replacement Appr.</option>
      </select>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Date</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredOrders.length === 0"><td colspan="7" class="empty-state">No matching orders found.</td></tr>
          <tr v-for="o in filteredOrders" :key="o.id">
            <td><code class="id-code">#{{ o.id.slice(0,8).toUpperCase() }}</code></td>
            <td class="text-muted">{{ fmtDate(o.createdAt) }}</td>
            <td><strong>{{ o.customerName }}</strong><br><span class="micro-txt">📞 {{ o.phone }}</span></td>
            <td><span class="micro-txt">{{ o.items?.length || 0 }} products</span></td>
            <td><strong>{{ money(o.amount) }}</strong></td>
            <td><span :class="['pill', o.shippingStatus || 'pending']">{{ (o.shippingStatus || 'pending').replace(/_/g, ' ') }}</span></td>
            <td><button class="manage-btn" @click="openOrder(o)">Manage</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="load-more-zone">
      <button class="btn-outline" @click="loadLimit += 10">↓ Load 10 More</button>
    </div>

    <Teleport to="body">
      <div v-if="selected" class="modal-overlay" @click.self="closeOrder">
        <div class="modal-container slide-up">
          
          <header class="m-header">
            <div>
              <h3>Order <code>{{ selected.id }}</code></h3>
              <p>{{ fmtDate(selected.createdAt) }} • {{ selected.paymentMethod.toUpperCase() }}</p>
            </div>
            <button class="close-btn" @click="closeOrder">✕</button>
          </header>

          <div class="m-body">
            
            <div class="info-grid">
              <div class="info-card">
                <h4>Customer Details</h4>
                <strong>{{ selected.customerName }}</strong>
                <p>📞 {{ selected.phone }}</p>
                <p class="address-box">{{ selected.address }}</p>
              </div>
            </div>

            <div class="items-card">
              <h4>Ordered Items</h4>
              <div v-for="(item, idx) in selected.items" :key="idx" class="item-row">
                <img v-if="item.imageUrl" :src="item.imageUrl" class="item-img" />
                <span v-else class="item-emoji">{{ item.emoji || '📦' }}</span>
                <div class="item-info">
                  <strong>{{ item.name }}</strong>
                  <span class="item-variant">{{ item.variant || item.weight || 'Standard' }}</span>
                  <span class="item-qty">Qty: {{ item.quantity }} × {{ money(item.price) }}</span>
                </div>
              </div>
            </div>

            <div class="action-zone">
              <h4 class="action-title">Current Status: <span :class="['status-text', selected.shippingStatus]">{{ (selected.shippingStatus || 'pending').replace(/_/g, ' ').toUpperCase() }}</span></h4>
              
              <div v-if="(selected.shippingStatus || 'pending') === 'pending'" class="strict-actions">
                <button class="btn btn-green" @click="handleConfirm" :disabled="actionBusy">✓ Confirm Order</button>
                <div class="reject-box">
                  <input v-model="rejectionComment" placeholder="Reason for rejection..." class="input-field" />
                  <button class="btn btn-red" @click="handleReject" :disabled="actionBusy">✕ Reject Order</button>
                </div>
              </div>

              <div v-else-if="selected.shippingStatus === 'confirmed'" class="strict-actions">
                <input v-model="trackingId" placeholder="Enter Courier Tracking AWB..." class="input-field" />
                <button class="btn btn-black" @click="handleShip" :disabled="actionBusy">🚀 Mark as Shipped</button>
              </div>

              <div v-else-if="selected.shippingStatus === 'shipped'" class="strict-actions">
                <p class="helper-text">Tracking AWB: <strong>{{ selected.trackingId }}</strong></p>
                <button class="btn btn-green" @click="handleDelivered" :disabled="actionBusy">📦 Mark as Delivered</button>
              </div>

              <div v-else-if="['cancelled_refund_pending', 'returned_refund_pending'].includes(selected.shippingStatus)" class="strict-actions alert-zone">
                <p>⚠️ Customer is waiting for a refund of <strong>{{ money(selected.amount) }}</strong>.</p>
                <button class="btn btn-green" @click="handleProcessRefund" :disabled="actionBusy">💸 Mark Refund Processed</button>
              </div>

              <div v-else-if="selected.shippingStatus === 'return_requested'" class="strict-actions alert-zone">
                <p><strong>Reason:</strong> {{ selected.returnReason }}</p>
                <div class="btn-group">
                  <button class="btn btn-green" @click="handleApproveReturn" :disabled="actionBusy">✓ Approve Return</button>
                </div>
                <div class="reject-box">
                  <input v-model="returnRejectReason" placeholder="Reason to decline return..." class="input-field" />
                  <button class="btn btn-red" @click="handleRejectReturn" :disabled="actionBusy">✕ Decline Return</button>
                </div>
              </div>

              <div v-else-if="selected.shippingStatus === 'replacement_requested'" class="strict-actions alert-zone">
                <p><strong>Reason:</strong> {{ selected.replacementReason }}</p>
                <button class="btn btn-green" @click="handleApproveReplacement" :disabled="actionBusy">✓ Approve Replacement</button>
                <div class="reject-box">
                  <input v-model="returnRejectReason" placeholder="Reason to decline replacement..." class="input-field" />
                  <button class="btn btn-red" @click="handleRejectReplacement" :disabled="actionBusy">✕ Decline Replacement</button>
                </div>
              </div>

              <div v-else-if="selected.shippingStatus === 'replacement_approved'" class="strict-actions">
                <input v-model="trackingId" placeholder="New Replacement AWB..." class="input-field" />
                <button class="btn btn-black" @click="handleMarkReplaced" :disabled="actionBusy">🚀 Mark Replacement Shipped</button>
              </div>

              <div v-else-if="['delivered', 'refunded', 'replaced', 'cancelled', 'rejected'].includes(selected.shippingStatus)" class="terminal-state">
                This order has reached a final workflow state and is closed.
                <p v-if="selected.adminComment" class="terminal-note">Note: {{ selected.adminComment }}</p>
              </div>

            </div>

          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-in { animation: fIn 0.3s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

.admin-panel-head { margin-bottom: 24px; }
.ws-title { font-size: 1.8rem; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
.ws-sub { color: #64748b; font-size: 0.95rem; margin: 0; }

.toolbar-row { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
.date-picker { padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; font-weight: 600; color: #0f172a;}
.search-box, .filter-select { padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; font-size: 0.95rem; }
.search-box { flex: 1; min-width: 200px; }

/* ✨ TABLE STYLING */
.table-wrap { background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px rgba(0,0,0,0.02); overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; text-align: left; min-width: 800px; }
.data-table th { background: #F8FAFC; padding: 16px; font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: #475569; border-bottom: 2px solid #E2E8F0; letter-spacing: 0.5px;}
.data-table td { padding: 16px; border-bottom: 1px solid #E2E8F0; color: #0F172A; vertical-align: middle; }
.data-table tr:hover { background: #F8FAFC; }
.id-code { background: #F1F5F9; padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; border: 1px solid #E2E8F0; font-weight: 700; }
.text-muted { color: #64748b; font-weight: 600; font-size: 0.9rem;}
.micro-txt { font-size: 0.8rem; color: #64748b; font-weight: 600; }
.manage-btn { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 8px; font-weight: 700; color: #111827; cursor: pointer; transition: 0.2s; font-size: 0.85rem;}
.manage-btn:hover { background: #111827; color: white; }
.empty-state { text-align: center; padding: 40px !important; color: #64748b; font-weight: 600; }

.pill { padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; border: 1px solid; white-space: nowrap;}
.pending { background: #fffbeb; color: #d97706; border-color: #fde047;}
.confirmed { background: #eff6ff; color: #2563eb; border-color: #bfdbfe;}
.shipped { background: #fef08a; color: #a16207; border-color: #facc15;}
.delivered, .replaced, .refunded { background: #dcfce7; color: #16a34a; border-color: #bbf7d0;}
.cancelled_refund_pending, .returned_refund_pending, .return_requested, .replacement_requested { background: #fee2e2; color: #dc2626; border-color: #fca5a5; animation: pulse 2s infinite; }
.rejected, .cancelled { background: #f1f5f9; color: #64748b; border-color: #e2e8f0;}
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }

/* ✨ MODAL STYLES */
.modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.7); backdrop-filter: blur(4px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-container { background: #f8fafc; width: 100%; max-width: 600px; max-height: 90vh; border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
.slide-up { animation: sUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes sUp { from { transform: translateY(40px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }

.m-header { background: #fff; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
.m-header h3 { margin: 0 0 4px; font-size: 1.3rem; color: #0f172a; }
.m-header p { margin: 0; font-size: 0.85rem; color: #64748b; font-weight: 600; }
.close-btn { background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%; font-weight: 800; color: #475569; cursor: pointer; transition: 0.2s; }
.close-btn:hover { background: #fee2e2; color: #dc2626; }

.m-body { padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
.info-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
.info-card { background: #fff; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; }
.info-card h4 { margin: 0 0 12px; font-size: 0.8rem; text-transform: uppercase; color: #64748b; }
.info-card p { margin: 0 0 6px; font-size: 0.9rem; color: #334155; }
.address-box { margin-top: 10px !important; padding-top: 10px; border-top: 1px dashed #e2e8f0; font-size: 0.85rem; line-height: 1.4; }

.items-card { background: #fff; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; }
.items-card h4 { margin: 0 0 16px; font-size: 0.8rem; text-transform: uppercase; color: #64748b; }
.item-row { display: flex; gap: 12px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; }
.item-row:last-child { border: none; margin: 0; padding: 0; }
.item-img { width: 50px; height: 50px; border-radius: 8px; object-fit: cover; border: 1px solid #e2e8f0; }
.item-emoji { width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border-radius: 8px; font-size: 1.5rem; }
.item-info { display: flex; flex-direction: column; }
.item-info strong { font-size: 0.95rem; color: #0f172a; }
.item-variant { font-size: 0.75rem; color: #64748b; text-transform: uppercase; margin: 2px 0; font-weight: 700; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; align-self: flex-start; }
.item-qty { font-size: 0.85rem; color: #475569; font-weight: 600; }

.action-zone { background: #fff; border: 2px solid #0f172a; border-radius: 12px; padding: 20px; }
.action-title { margin: 0 0 16px; font-size: 0.95rem; color: #475569; display: flex; justify-content: space-between; align-items: center; }
.status-text { font-weight: 900; }
.status-text.pending { color: #d97706; }
.status-text.cancelled_refund_pending, .status-text.return_requested { color: #dc2626; }

.strict-actions { display: flex; flex-direction: column; gap: 16px; }
.input-field { padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; width: 100%; box-sizing: border-box; outline: none; }
.btn { padding: 14px; border: none; border-radius: 8px; font-weight: 800; font-size: 0.95rem; cursor: pointer; transition: 0.2s; width: 100%; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-green { background: #16a34a; color: white; }
.btn-green:hover { background: #15803d; }
.btn-black { background: #0f172a; color: white; }
.btn-red { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.reject-box { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; padding-top: 16px; border-top: 1px dashed #cbd5e1; }
.btn-group { display: flex; gap: 10px; }

.alert-zone { background: #fff1f2; padding: 16px; border-radius: 8px; border: 1px dashed #fca5a5; }
.alert-zone p { margin: 0 0 12px; color: #991b1b; font-size: 0.9rem; line-height: 1.4; }

.terminal-state { text-align: center; padding: 16px; color: #16a34a; font-weight: 800; background: #f0fdf4; border-radius: 8px; }
.terminal-note { font-weight: 600; color: #475569; font-size: 0.85rem; margin-top: 8px; }

.load-more-zone { display: flex; justify-content: center; padding: 20px 0;}
.btn-outline { background: white; border: 2px solid #cbd5e1; padding: 10px 24px; border-radius: 30px; font-weight: 700; cursor: pointer;}

@media (max-width: 768px) {
  .modal-overlay { padding: 0; align-items: flex-end; }
  .modal-container { border-radius: 20px 20px 0 0; max-height: 95vh; height: auto; }
}
</style>