<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { subscribeToPayments, fetchRazorpayPayments, calculateRazorpayCharge } from '../db.js'

const payments = ref([])
const razorpayPayments = ref([])
const loading = ref(true)
const rzpLoading = ref(false)
const activeTab = ref('local')
const selectedPayment = ref(null)
const showModal = ref(false)

let _unsub = null

// ─── LOCAL DB PAYMENTS ───
onMounted(() => {
  _unsub = subscribeToPayments(snap => {
    payments.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    loading.value = false
  })
})

onUnmounted(() => {
  if (_unsub) _unsub()
})

// ─── RAZORPAY PAYMENTS ───
const loadRazorpayPayments = async () => {
  rzpLoading.value = true
  try {
    const data = await fetchRazorpayPayments(20, 0)
    razorpayPayments.value = data.items || []
  } catch (err) {
    alert('Failed to load Razorpay payments: ' + err.message)
  } finally {
    rzpLoading.value = false
  }
}

// ─── MODAL ───
function openPaymentDetails(payment) {
  selectedPayment.value = payment
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  selectedPayment.value = null
}

// ─── HELPERS ───
function toDate(ts) {
  if (!ts) return null
  if (ts instanceof Date) return ts
  if (typeof ts === 'string') return new Date(ts)
  if (typeof ts === 'number') return new Date(ts)
  if (typeof ts === 'object' && ts.seconds != null) return new Date(ts.seconds * 1000 + (ts.nanoseconds || 0) / 1e6)
  return null
}

function fmtDateTime(ts) {
  const d = toDate(ts)
  return d ? d.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'
}

function fmtDate(ts) {
  const d = toDate(ts)
  return d ? d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' }) : '-'
}

function getStatusPillClass(status) {
  const s = (status || '').toLowerCase()
  if (['success', 'completed', 'paid', 'captured'].includes(s)) return 'success'
  if (['pending'].includes(s)) return 'pending'
  if (['processing'].includes(s)) return 'processing'
  if (['failed', 'declined'].includes(s)) return 'failed'
  if (['refunded'].includes(s)) return 'refunded'
  if (['cancelled'].includes(s)) return 'cancelled'
  return ''
}

function formatAmount(amount, isPaise = false) {
  if (amount === null || amount === undefined) return '₹0'
  let value = Number(amount)
  if (isPaise) {
    value = value / 100
    return '₹' + value.toFixed(2)
  }
  return '₹' + value.toLocaleString('en-IN')
}

function getCustomerName(payment) {
  if (payment.customerName) return payment.customerName
  if (payment.userEmail) return payment.userEmail
  if (payment.email) return payment.email
  if (payment.contact) return payment.contact
  if (payment.notes?.customerName) return payment.notes.customerName
  return 'Unknown'
}

function getOrderId(payment) {
  if (payment.orderId) return payment.orderId
  if (payment.receipt) return payment.receipt
  if (payment.order_id) return payment.order_id
  return '-'
}

function getPaymentId(payment) {
  if (payment.paymentId) return payment.paymentId
  if (payment.id) return payment.id
  return '-'
}

// ─── GET CHARGE INFO ───
function getChargeInfo(payment) {
  if (payment.amount && payment.amount > 0) {
    return calculateRazorpayCharge(payment.amount)
  }
  return null
}
</script>

<template>
  <div class="vendora-page">
    <!-- ─── TABS ─── -->
    <div class="tab-bar">
      <button :class="['tab-btn', { active: activeTab === 'local' }]" @click="activeTab = 'local'">
        📊 My Database Payments
        <span class="badge">{{ payments.length }}</span>
      </button>
      <button :class="['tab-btn', { active: activeTab === 'razorpay' }]" @click="activeTab === 'razorpay' ? null : (loadRazorpayPayments(), activeTab = 'razorpay')">
        🔄 Razorpay Payments
        <span class="badge">{{ razorpayPayments.length }}</span>
      </button>
    </div>

    <!-- ─── LOCAL DB PAYMENTS ─── -->
    <div v-if="activeTab === 'local'" class="payments-hub fade-in">
      <div v-if="loading" class="loading-state"><div class="spinner"></div></div>
      <div v-else>
        <div class="table-card">
          <div class="table-responsive">
            <table class="vendora-table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="payments.length === 0"><td colspan="6" class="empty-state">No payments found.</td></tr>
                <tr v-for="p in payments" :key="p.id" @click="openPaymentDetails(p)" class="clickable-row">
                  <td class="id-col">{{ getPaymentId(p).slice(0, 12) }}</td>
                  <td class="id-col">{{ getOrderId(p).slice(0, 12) }}</td>
                  <td class="text-sub">{{ getCustomerName(p) }}</td>
                  <td class="price-col">{{ formatAmount(p.amount, false) }}</td>
                  <td><span :class="['soft-pill', getStatusPillClass(p.status)]">{{ p.status || 'Unknown' }}</span></td>
                  <td>{{ fmtDateTime(p.createdAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── RAZORPAY PAYMENTS ─── -->
    <div v-if="activeTab === 'razorpay'" class="payments-hub fade-in">
      <div v-if="rzpLoading" class="loading-state"><div class="spinner"></div></div>
      <div v-else>
        <div class="table-card">
          <div class="table-responsive">
            <table class="vendora-table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Charge (2.36%)</th>
                  <th>Net Amount</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="razorpayPayments.length === 0"><td colspan="9" class="empty-state">No Razorpay payments found.</td></tr>
                <tr v-for="p in razorpayPayments" :key="p.id" @click="openPaymentDetails(p)" class="clickable-row">
                  <td class="id-col">{{ p.id?.slice(0, 12) }}</td>
                  <td class="id-col">{{ p.receipt?.slice(0, 12) || p.order_id?.slice(0, 12) }}</td>
                  <td class="text-sub">{{ getCustomerName(p) }}</td>
                  <td class="price-col">{{ formatAmount(p.amount, true) }}</td>
                  <td class="text-sub">{{ getChargeInfo(p)?.chargeDisplay || '-' }}</td>
                  <td class="price-col">{{ getChargeInfo(p)?.netDisplay || '-' }}</td>
                  <td><span :class="['soft-pill', getStatusPillClass(p.status)]">{{ p.status }}</span></td>
                  <td class="text-sub">{{ p.method || '-' }}</td>
                  <td>{{ fmtDate(p.created_at * 1000) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="rzp-note">
          <small>Showing last {{ razorpayPayments.length }} payments from Razorpay. <button @click="loadRazorpayPayments" class="refresh-btn">↻ Refresh</button></small>
        </div>
      </div>
    </div>

    <!-- ─── MODAL ─── -->
    <Teleport to="body">
      <div v-if="showModal && selectedPayment" class="modal-overlay" @click.self="closeModal">
        <div class="modal-card slide-up">
          <div class="modal-header">
            <h3 style="margin: 0; font-size: 18px; color: #0F172A;">Payment Details</h3>
            <button class="close-btn" @click="closeModal">✕</button>
          </div>
          <div class="modal-body">
            <!-- Summary -->
            <div class="detail-grid">
              <div class="detail-item"><span class="label">Payment ID</span><span class="value id-col">{{ selectedPayment.paymentId || selectedPayment.id }}</span></div>
              <div class="detail-item"><span class="label">Order ID</span><span class="value id-col">{{ selectedPayment.orderId || selectedPayment.receipt }}</span></div>
              <div class="detail-item"><span class="label">Customer</span><span class="value">{{ getCustomerName(selectedPayment) }}</span></div>
              <div class="detail-item"><span class="label">Amount</span><span class="value price-col">{{ formatAmount(selectedPayment.amount, !!selectedPayment.currency || !!selectedPayment.fee) }}</span></div>
              
              <!-- Charge details for Razorpay payments -->
              <div v-if="getChargeInfo(selectedPayment)" class="detail-item">
                <span class="label">Charge (2.36%)</span>
                <span class="value">{{ getChargeInfo(selectedPayment).chargeDisplay }}</span>
              </div>
              <div v-if="getChargeInfo(selectedPayment)" class="detail-item">
                <span class="label">Net Amount</span>
                <span class="value price-col">{{ getChargeInfo(selectedPayment).netDisplay }}</span>
              </div>
              
              <div class="detail-item"><span class="label">Status</span><span class="value"><span :class="['soft-pill', getStatusPillClass(selectedPayment.status)]">{{ selectedPayment.status }}</span></span></div>
              <div class="detail-item"><span class="label">Date</span><span class="value">{{ fmtDateTime(selectedPayment.createdAt || selectedPayment.created_at) }}</span></div>
            </div>

            <!-- Products (for local DB payments) -->
            <div v-if="selectedPayment.products && selectedPayment.products.length > 0" class="products-section">
              <h4 style="margin: 0 0 12px; font-size: 13px; text-transform: uppercase; color: #94A3B8;">Products</h4>
              <div class="product-list">
                <div v-for="(item, idx) in selectedPayment.products" :key="idx" class="product-item">
                  <span class="product-name">{{ item.name || item.productId }}</span>
                  <span class="product-detail">{{ item.variant || 'Standard' }}</span>
                  <span class="product-detail">Qty: {{ item.quantity }}</span>
                </div>
              </div>
            </div>

            <!-- Razorpay Extra Info -->
            <div v-if="selectedPayment.method" class="products-section">
              <h4 style="margin: 0 0 12px; font-size: 13px; text-transform: uppercase; color: #94A3B8;">Payment Method</h4>
              <div class="product-list">
                <div class="product-item"><span class="product-name">Method:</span><span class="product-detail">{{ selectedPayment.method }}</span></div>
                <div v-if="selectedPayment.card" class="product-item"><span class="product-name">Card:</span><span class="product-detail">{{ selectedPayment.card.network }} • {{ selectedPayment.card.last4 }}</span></div>
                <div v-if="selectedPayment.bank" class="product-item"><span class="product-name">Bank:</span><span class="product-detail">{{ selectedPayment.bank }}</span></div>
                <div v-if="selectedPayment.vpa" class="product-item"><span class="product-name">UPI:</span><span class="product-detail">{{ selectedPayment.vpa }}</span></div>
              </div>
            </div>

            <!-- Raw JSON -->
            <details class="raw-json">
              <summary style="cursor:pointer; font-weight:600; color:#475569; font-size:13px;">View Raw Data</summary>
              <pre style="background:#F8FAFC; padding:16px; border-radius:8px; overflow-x:auto; font-size:12px; max-height:200px; overflow-y:auto;">{{ JSON.stringify(selectedPayment, null, 2) }}</pre>
            </details>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* ─── All styles remain the same ─── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

.vendora-page { min-height: 100vh; background-color: #F8FAFC; padding: 0; font-family: 'Inter', sans-serif; color: #334155; }
.loading-state { display: flex; justify-content: center; height: 50vh; align-items: center; }
.spinner { width: 30px; height: 30px; border: 3px solid #E2E8F0; border-top-color: #0F172A; border-radius: 50%; animation: rot 0.8s linear infinite; }
@keyframes rot { to { transform: rotate(360deg); } }
.fade-in { animation: fi 0.3s ease; }
@keyframes fi { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

.tab-bar { display: flex; gap: 0; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 0; overflow: hidden; margin-bottom: 0; border-bottom: none; }
.tab-btn { padding: 14px 24px; background: #FAFAFA; border: none; border-right: 1px solid #E2E8F0; font-size: 14px; font-weight: 600; color: #64748B; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 8px; }
.tab-btn:hover { background: #F1F5F9; color: #0F172A; }
.tab-btn.active { background: #FFFFFF; color: #0F172A; border-bottom: 2px solid #0F172A; }
.badge { background: #E2E8F0; color: #475569; padding: 0 8px; border-radius: 12px; font-size: 11px; font-weight: 700; }

.payments-hub { width: 100%; }
.table-card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow: hidden; }

.table-responsive { overflow-x: auto; }
.vendora-table { width: 100%; border-collapse: collapse; min-width: 900px; table-layout: auto; }
.vendora-table th { padding: 10px 14px; background: #FAFAFA; border-bottom: 1px solid #E2E8F0; font-size: 11px; font-weight: 500; color: #64748B; text-align: left; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
.vendora-table td { padding: 12px 14px; border-bottom: 1px solid #F1F5F9; font-size: 12px; color: #334155; font-weight: 400; vertical-align: middle; }
.vendora-table tr:hover td { background-color: #F8FAFC; }
.clickable-row { cursor: pointer; transition: background 0.15s; }
.clickable-row:hover td { background-color: #F1F5F9; }

.id-col { font-family: monospace; color: #0F172A; font-weight: 600; font-size: 11px; }
.text-sub { color: #64748B; font-size: 11px; }
.price-col { color: #0F172A; font-weight: 600; }
.empty-state { text-align: center; color: #94A3B8; padding: 32px !important; }

.soft-pill { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; display: inline-block; text-transform: capitalize; letter-spacing: 0.5px; }
.soft-pill.pending { background: #FFFBEB; color: #D97706; }
.soft-pill.processing { background: #E0E7FF; color: #3730A3; }
.soft-pill.success,
.soft-pill.completed,
.soft-pill.paid,
.soft-pill.captured { background: #D1FAE5; color: #065F46; }
.soft-pill.failed,
.soft-pill.declined { background: #FEE2E2; color: #991B1B; }
.soft-pill.refunded { background: #F3E8FF; color: #7E22CE; }
.soft-pill.cancelled { background: #F1F5F9; color: #64748B; }

.rzp-note { padding: 16px 20px; background: #FAFAFA; border: 1px solid #E2E8F0; border-top: none; font-size: 13px; color: #64748B; display: flex; justify-content: space-between; align-items: center; }
.refresh-btn { background: none; border: none; color: #0F172A; font-weight: 600; cursor: pointer; text-decoration: underline; }

.modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-card { background: white; width: 100%; max-width: 650px; border-radius: 12px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
.slide-up { animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
.modal-header { padding: 20px 24px; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; background: #FAFAFA; border-radius: 12px 12px 0 0; }
.close-btn { background: #E2E8F0; border: none; font-size: 18px; color: #64748B; cursor: pointer; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.close-btn:hover { background: #FEE2E2; color: #EF4444; }
.modal-body { padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
.detail-item { display: flex; flex-direction: column; gap: 2px; }
.detail-item .label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #94A3B8; letter-spacing: 0.3px; }
.detail-item .value { font-size: 14px; color: #0F172A; font-weight: 500; }

.products-section { border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; background: #FAFAFA; }
.product-list { display: flex; flex-direction: column; gap: 6px; }
.product-item { display: flex; gap: 12px; font-size: 13px; color: #334155; align-items: center; flex-wrap: wrap; }
.product-name { font-weight: 600; color: #0F172A; }
.product-detail { color: #64748B; font-size: 12px; }

.raw-json { border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; background: #FAFAFA; }
.raw-json pre { margin: 8px 0 0; white-space: pre-wrap; word-break: break-all; }

@media (max-width: 768px) {
  .detail-grid { grid-template-columns: 1fr; gap: 8px; }
  .tab-btn { padding: 10px 14px; font-size: 12px; }
  .vendora-table { min-width: auto; }
  .vendora-table th, .vendora-table td { padding: 8px 10px; font-size: 11px; }
  .vendora-table th:nth-child(4), .vendora-table td:nth-child(4) { display: none; }
  .modal-card { max-width: 95%; margin: 10px; }
}
</style>