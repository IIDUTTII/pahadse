<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { subscribeToOrders, confirmOrderInDb, rejectOrderInDb, shipOrderInDb } from '../db.js'

const props = defineProps({
  userRole: { type: String, default: 'user' }
})

const ordersList = ref([])
let _unsubOrders = null

// Order Modal States
const showOrderModal = ref(false)
const selectedOrder = ref(null)
const rejectionComment = ref('')

onMounted(() => {
  _unsubOrders = subscribeToOrders(snap => {
    ordersList.value = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
  })
})

onUnmounted(() => {
  if (_unsubOrders) _unsubOrders()
})

const openOrder = (o) => { selectedOrder.value = o; rejectionComment.value = ''; showOrderModal.value = true }
const closeOrder = () => { showOrderModal.value = false; selectedOrder.value = null }

const rejectOrder = async () => {
  if (!rejectionComment.value.trim()) { alert('Please provide a reason for the customer.'); return }
  if (!confirm('Are you sure you want to reject this order?')) return
  try {
    await rejectOrderInDb(selectedOrder.value.id, rejectionComment.value.trim())
    closeOrder()
  } catch (e) { alert(e.message) }
}

const confirmOrder = async (orderId) => {
  try { await confirmOrderInDb(orderId) } catch (e) { alert(e.message) }
}

const saveTracking = async (orderId, inputId) => {
  const val = document.getElementById(inputId)?.value.trim()
  if (!val) { alert('Enter an AWB tracking ID'); return }
  try { await shipOrderInDb(orderId, val) } catch (e) { alert(e.message) }
}

const fmtDate = (ts) => ts?.seconds ? new Date(ts.seconds * 1000).toLocaleDateString('en-IN') : '—'
const statusClass = (s) => ({ shipped: 'pill-green', delivered: 'pill-green', confirmed: 'pill-blue', pending: 'pill-amber', rejected: 'pill-red' }[s] || 'pill-amber')
</script>

<template>
  <div class="fade-in">
    <div class="ws-head">
      <div>
        <h2 class="ws-title">Orders Ledger</h2>
        <p class="ws-sub">{{ ordersList.length }} total transactions</p>
      </div>
    </div>

    <div class="table-wrap desktop-only">
      <table class="data-table">
        <thead>
          <tr><th>Order ID / Date</th><th>Customer</th><th>Address</th><th>Total</th><th>Status</th><th>Action</th></tr>
        </thead>
        <tbody>
          <tr v-for="o in ordersList" :key="o.id">
            <td>
              <code class="id-code">{{ o.id?.substring(0, 10) }}…</code>
              <div class="item-sub">{{ fmtDate(o.createdAt) }}</div>
            </td>
            <td>
              <div class="item-name">{{ o.customerName || '—' }}</div>
              <div class="item-sub">📞 {{ o.phone }}</div>
            </td>
            <td class="addr-cell">{{ o.address }}</td>
            <td class="item-name">₹{{ o.amount }}</td>
            <td><span :class="['status-pill', statusClass(o.shippingStatus)]">{{ o.shippingStatus || 'pending' }}</span></td>
            <td><button class="btn-view" @click="openOrder(o)">View Details →</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mobile-only">
      <div v-for="o in ordersList" :key="'mob'+o.id" class="mob-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <code class="id-code">{{ o.id?.substring(0, 10) }}</code>
          <span :class="['status-pill', statusClass(o.shippingStatus)]">{{ o.shippingStatus || 'pending' }}</span>
        </div>
        <h4 style="margin:10px 0 4px;">{{ o.customerName }}</h4>
        <p style="margin:0 0 10px; color:#64748B; font-size:0.9rem;">₹{{ o.amount }} | {{ fmtDate(o.createdAt) }}</p>
        <button class="btn-view full-width" @click="openOrder(o)">Review Order</button>
      </div>
    </div>

    <transition name="fade">
      <div v-if="showOrderModal && selectedOrder" class="modal-backdrop" @click.self="closeOrder">
        <div class="modal-box">
          <header class="modal-head">
            <div>
              <h3 class="modal-title">Order #{{ selectedOrder.id.substring(0,8) }}</h3>
              <div class="modal-date">{{ fmtDate(selectedOrder.createdAt) }}</div>
            </div>
            <button class="x-btn" @click="closeOrder">✕</button>
          </header>

          <div class="modal-body">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <strong>Status:</strong>
              <span :class="['status-pill lg', statusClass(selectedOrder.shippingStatus)]">{{ selectedOrder.shippingStatus || 'pending' }}</span>
            </div>

            <div class="items-list">
              <div v-for="item in selectedOrder.items" :key="item.productId" class="item-strip">
                <span class="item-emoji">{{ item.emoji || '📦' }}</span>
                <span style="flex:1; font-weight:700;">{{ item.name }} <span style="color:#64748b; font-weight:500;">× {{ item.quantity }}</span></span>
                <strong>₹{{ item.price * item.quantity }}</strong>
              </div>
            </div>

            <div class="pricing-block">
              <div class="price-row"><span>Payment Gateway</span><span class="tag-pill">{{ selectedOrder.paymentMethod || '—' }}</span></div>
              <div v-if="selectedOrder.couponCode" class="price-row" style="color: #16A34A;">
                <span>Voucher ({{ selectedOrder.couponCode }})</span><span>-₹{{ selectedOrder.couponDiscount }}</span>
              </div>
              <div class="price-row grand"><span>Grand Total</span><strong>₹{{ selectedOrder.amount }}</strong></div>
            </div>

            <div class="addr-block">
              <strong>Delivery Destination:</strong><br>
              {{ selectedOrder.customerName }} (📞 {{ selectedOrder.phone }})<br>
              <p style="margin-top:4px; font-weight:500;">{{ selectedOrder.address }}</p>
            </div>

            <div v-if="['pending', 'confirmed'].includes(selectedOrder.shippingStatus)" class="action-block">
              <button v-if="selectedOrder.shippingStatus === 'pending'" class="btn-confirm-full" @click="confirmOrder(selectedOrder.id)">✓ Confirm & Allocate Stock</button>
              
              <div class="tracking-row" style="margin-top:10px;">
                <input :id="'awb_' + selectedOrder.id" type="text" placeholder="Paste AWB Tracking Link…" class="cf-input" />
                <button class="btn-primary" @click="saveTracking(selectedOrder.id, 'awb_' + selectedOrder.id)">Mark Shipped</button>
              </div>

              <div class="reject-zone">
                <label style="color:#DC2626; font-weight:800; font-size:0.8rem; text-transform:uppercase;">Cancel & Reject</label>
                <textarea v-model="rejectionComment" class="reject-textarea" placeholder="Reason for cancellation..."></textarea>
                <button class="btn-reject-full" @click="rejectOrder">✕ Reject Order</button>
              </div>
            </div>

            <div v-if="selectedOrder.shippingStatus === 'shipped'" class="shipped-tag">🚚 Tracking: <strong>{{ selectedOrder.trackingId }}</strong></div>
            <div v-if="selectedOrder.shippingStatus === 'rejected'" class="rejected-tag"><strong>⚠️ Order Rejected</strong><p>Reason: "{{ selectedOrder.adminComment }}"</p></div>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<style scoped>
/* CSS Styles from your previous admin layout */
.fade-in { animation: fIn 0.3s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.ws-head { margin-bottom: 24px; }
.ws-title { font-size: 1.6rem; font-weight: 800; color: #0F172A; margin: 0; }
.ws-sub { color: #64748B; font-size: 0.9rem; margin-top: 4px; }
.table-wrap { background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
.data-table { width: 100%; border-collapse: collapse; text-align: left; }
.data-table th { background: #F8FAFC; padding: 16px; font-size: 0.85rem; font-weight: 800; text-transform: uppercase; color: #475569; border-bottom: 2px solid #E2E8F0; }
.data-table td { padding: 16px; border-bottom: 1px solid #E2E8F0; color: #0F172A; }
.id-code { background: #F1F5F9; padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; border: 1px solid #E2E8F0; }
.item-name { font-weight: 800; color: #0F172A; }
.item-sub { font-size: 0.8rem; color: #64748B; margin-top: 4px; font-weight: 500; }
.addr-cell { font-size: 0.85rem; max-width: 250px; line-height: 1.4; color: #475569; }
.btn-view { background: #0F2A1F; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; transition: 0.2s; }
.btn-view:hover { background: #0a1c14; }
.status-pill { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; }
.status-pill.lg { padding: 6px 14px; font-size: 0.85rem; }
.pill-green { background: #DCFCE7; color: #15803D; border: 1px solid #BBF7D0; }
.pill-amber { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
.pill-red { background: #FEF2F2; color: #991B1B; border: 1px solid #FCA5A5; }
.pill-blue { background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; }

/* MODAL STYLES */
.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.75); display: flex; align-items: center; justify-content: center; z-index: 300; padding: 16px; backdrop-filter: blur(4px); }
.modal-box { background: white; width: 100%; max-width: 600px; border-radius: 16px; display: flex; flex-direction: column; max-height: 90vh; box-shadow: 0 25px 50px rgba(0,0,0,0.25); overflow: hidden; }
.modal-head { padding: 20px 24px; border-bottom: 1px solid #E2E8F0; background: #F8FAFC; display: flex; justify-content: space-between; align-items: center; }
.modal-title { margin: 0; font-size: 1.2rem; font-weight: 800; color: #0F172A; }
.modal-date { font-size: 0.85rem; color: #64748B; margin-top: 4px; font-weight: 600; }
.x-btn { background: #F1F5F9; border: none; font-size: 1.2rem; color: #64748B; cursor: pointer; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
.x-btn:hover { background: #FEE2E2; color: #DC2626; }
.modal-body { padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }

.items-list { border: 1px solid #E2E8F0; border-radius: 12px; background: #F8FAFC; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.item-strip { display: flex; align-items: center; gap: 12px; font-size: 0.95rem; color: #0F172A; }
.pricing-block { border-top: 2px dashed #E2E8F0; padding-top: 16px; display: flex; flex-direction: column; gap: 10px; }
.price-row { display: flex; justify-content: space-between; font-weight: 600; color: #475569; }
.price-row.grand { font-size: 1.2rem; font-weight: 900; color: #0F172A; margin-top: 8px; }
.tag-pill { background: #E2E8F0; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-size: 0.8rem; text-transform: uppercase; color: #0F172A; }
.addr-block { background: #F1F5F9; padding: 16px; border-radius: 12px; border: 1px dashed #CBD5E1; color: #334155; font-size: 0.95rem; line-height: 1.5; }

.btn-confirm-full { width: 100%; background: #2563EB; color: white; padding: 14px; border: none; border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 1rem; }
.btn-confirm-full:hover { background: #1D4ED8; }
.tracking-row { display: flex; gap: 8px; }
.cf-input { flex: 1; padding: 12px; border: 1px solid #CBD5E1; border-radius: 8px; outline: none; font-size: 0.95rem; }
.cf-input:focus { border-color: #0F2A1F; }
.btn-primary { background: #0F2A1F; color: white; padding: 12px 20px; border: none; border-radius: 8px; font-weight: 800; cursor: pointer; }
.reject-zone { margin-top: 16px; padding: 16px; background: #FEF2F2; border: 1px dashed #FCA5A5; border-radius: 12px; display: flex; flex-direction: column; gap: 10px; }
.reject-textarea { padding: 12px; border: 1px solid #FCA5A5; border-radius: 8px; outline: none; font-family: inherit; resize: vertical; min-height: 60px; }
.btn-reject-full { background: #FFFFFF; color: #DC2626; border: 2px solid #FECACA; padding: 12px; border-radius: 8px; font-weight: 800; cursor: pointer; }

.shipped-tag { background: #F0FDF4; border: 1px solid #BBF7D0; color: #15803D; padding: 16px; border-radius: 12px; font-weight: 800; }
.rejected-tag { background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; padding: 16px; border-radius: 12px; font-weight: 800; }
.rejected-tag p { margin: 4px 0 0; font-size: 0.9rem; font-weight: 500; font-style: italic; }

.desktop-only { display: block; }
.mobile-only { display: none; }
@media (max-width: 800px) {
  .desktop-only { display: none; }
  .mobile-only { display: flex; flex-direction: column; gap: 12px; }
  .mob-card { background: white; padding: 16px; border-radius: 12px; border: 1px solid #E2E8F0; }
  .full-width { width: 100%; margin-top: 12px; }
}
</style>