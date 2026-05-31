<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../../firebase.js'
import { collection, onSnapshot, doc, updateDoc, getDoc, setDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'
import { fetchUserRole, updateProduct, deleteProduct, logoutUser, fetchAllUsersFromDb, updateUserRoleInDb, fetchCoupons, saveCoupons, setCodStatus } from '../db.js'

defineOptions({ name: 'Admin' })
const router = useRouter()

const activeTab        = ref('products')
const userRole         = ref('user')
const searchText       = ref('')
const selectedCategory = ref('All')
const products         = ref([])
const usersList        = ref([])
const ordersList       = ref([])
const isCodActive      = ref(true)
const sidebarOpen      = ref(false)  // mobile sidebar

// Support Chat
const supportThreads     = ref([])
const selectedChatUserId = ref(null)
const adminChatText      = ref('')
const chatSending        = ref(false)

// Order modal
const showOrderModal   = ref(false)
const selectedOrder    = ref(null)
const rejectionComment = ref('')

// Coupon panel
const showCouponPanel = ref(false)
const coupons         = ref([])
const couponSaving    = ref(false)
const newCoupon       = ref({
  code: '', discount: 10, type: 'percent',
  minOrderAmount: 0, minItems: 0, expiresAt: '', maxUses: 0, active: true // ✨ ADDED MAX USES
})

let _unsubProducts = null, _unsubOrders = null, _unsubSupport = null

const filteredProducts = computed(() => {
  let r = products.value
  if (selectedCategory.value !== 'All') r = r.filter(p => p.category === selectedCategory.value)
  if (searchText.value.trim()) {
    const q = searchText.value.toLowerCase()
    r = r.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
  }
  return r
})

const activeChatDoc = computed(() => supportThreads.value.find(t => t.userId === selectedChatUserId.value))

onMounted(async () => {
  userRole.value = await fetchUserRole()

  _unsubProducts = onSnapshot(collection(db, 'products'), snap => {
    products.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  })
  _unsubOrders = onSnapshot(collection(db, 'orders'), snap => {
    ordersList.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  })
  _unsubSupport = onSnapshot(collection(db, 'supportChats'), snap => {
    supportThreads.value = snap.docs
      .map(d => ({ userId: d.id, ...d.data() }))
      .sort((a, b) => (b.lastUpdated?.seconds || 0) - (a.lastUpdated?.seconds || 0))
  })

  try {
    const cfg = await getDoc(doc(db, 'systemConfig', 'gateways'))
    if (cfg.exists()) isCodActive.value = cfg.data().isCodActive ?? true
  } catch {}

  try { usersList.value = await fetchAllUsersFromDb() } catch {}

  try { coupons.value = await fetchCoupons() } catch (e) {
    console.warn('Coupons fetch failed — check Firestore rules for systemConfig:', e.message)
  }
})

onUnmounted(() => {
  if (_unsubProducts) _unsubProducts()
  if (_unsubOrders)   _unsubOrders()
  if (_unsubSupport)  _unsubSupport()
})

// ── Orders
const openOrder  = (o) => { selectedOrder.value = o; rejectionComment.value = ''; showOrderModal.value = true }
const closeOrder = () => { showOrderModal.value = false; selectedOrder.value = null }

const rejectOrder = async () => {
  if (!rejectionComment.value.trim()) { alert('Customer ke liye ek reason likho'); return }
  if (!confirm('Ye order reject karna chahte ho?')) return
  try {
    await updateDoc(doc(db, 'orders', selectedOrder.value.id), {
      shippingStatus: 'rejected',
      adminComment: rejectionComment.value.trim()
    })
    closeOrder()
  } catch (e) { alert(e.message) }
}

const confirmOrder = async (orderId) => {
  try {
    await updateDoc(doc(db, 'orders', orderId), { shippingStatus: 'confirmed' })
  } catch (e) { alert(e.message) }
}

const saveTracking = async (orderId, inputId) => {
  const val = document.getElementById(inputId)?.value.trim()
  if (!val) { alert('AWB tracking ID daalo'); return }
  try {
    await updateDoc(doc(db, 'orders', orderId), { trackingId: val, shippingStatus: 'shipped' })
  } catch (e) { alert(e.message) }
}

// ── Support Chat
const sendAdminReply = async () => {
  if (!adminChatText.value.trim() || !selectedChatUserId.value) return
  chatSending.value = true
  try {
    await setDoc(doc(db, 'supportChats', selectedChatUserId.value), {
      lastUpdated: serverTimestamp(),
      messages: arrayUnion({
        text: adminChatText.value.trim(),
        role: 'admin',
        timestamp: Date.now()
      })
    }, { merge: true })
    adminChatText.value = ''
  } catch (e) { alert(e.message) }
  chatSending.value = false
}

// ── COD toggle
const toggleCod = async () => {
  const next = !isCodActive.value
  try {
    await setCodStatus(next)
    isCodActive.value = next
  } catch (e) { alert(e.message) }
}

// ── Coupons
const addCoupon = () => {
  if (!newCoupon.value.code.trim()) { alert('Coupon code daalo'); return }
  coupons.value.push({
    ...newCoupon.value,
    code: newCoupon.value.code.toUpperCase(),
    expiresAt: newCoupon.value.expiresAt ? new Date(newCoupon.value.expiresAt).getTime() : null
  })
  newCoupon.value = { code: '', discount: 10, type: 'percent', minOrderAmount: 0, minItems: 0, expiresAt: '', active: true }
}
const removeCoupon       = (i)   => coupons.value.splice(i, 1)
const toggleCouponActive = (i)   => { coupons.value[i].active = !coupons.value[i].active }
const saveCouponList     = async () => {
  couponSaving.value = true
  try { await saveCoupons(coupons.value); alert('Coupons saved!') } catch (e) { alert(e.message) }
  couponSaving.value = false
}

// ── Product actions
const slug      = (p)   => p?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || 'product'
const goAdd     = ()    => router.push('/admin/product/new')
const goEdit    = (p)   => router.push(`/admin/product/${slug(p)}`)
const handleDel = async (id) => { if (confirm('Delete product?')) await deleteProduct(id) }
const handleRole = async (uid, role) => { try { await updateUserRoleInDb(uid, role) } catch (e) { alert(e.message) } }
const handleLogout = async () => { if (confirm('Logout?')) { await logoutUser(); router.push('/login') } }

// ── Helpers
const fmtDate = (ts) => ts?.seconds ? new Date(ts.seconds * 1000).toLocaleDateString('en-IN') : '—'
const fmtTime = (ms) => ms ? new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''

const statusClass = (s) => ({
  shipped:   'pill-green',
  delivered: 'pill-green',
  confirmed: 'pill-blue',
  pending:   'pill-amber',
  rejected:  'pill-red',
}[s] || 'pill-amber')

const setTab = (tab) => { activeTab.value = tab; sidebarOpen.value = false }
</script>

<template>
  <div class="shell">

    <!-- ══ TOP BAR ══ -->
    <header class="topbar">
      <div class="topbar-left">
        <!-- Mobile hamburger -->
        <button class="hamburger" @click="sidebarOpen = !sidebarOpen">
          <span></span><span></span><span></span>
        </button>
        <div class="brand">🏔️ {{ userRole === 'superadmin' ? 'SuperAdmin' : 'Admin' }}</div>
      </div>

      <input
        v-show="activeTab === 'products'"
        v-model="searchText"
        class="search-input"
        placeholder="Search products…"
      />

      <div class="topbar-right">
        <!-- COD Toggle -->
        <button class="cod-btn" :class="isCodActive ? 'cod-on' : 'cod-off'" @click="toggleCod" :title="'COD ' + (isCodActive ? 'click to disable' : 'click to enable')">
          <span class="cod-dot"></span>
          <span class="cod-label">COD: {{ isCodActive ? 'On' : 'Off' }}</span>
        </button>
        <button class="top-btn" @click="showCouponPanel = !showCouponPanel">🎟️ <span class="btn-label">Coupons</span></button>
        <button class="top-btn danger" @click="handleLogout">↩ <span class="btn-label">Logout</span></button>
      </div>
    </header>

    <!-- Mobile sidebar overlay -->
    <div v-if="sidebarOpen" class="mob-overlay" @click="sidebarOpen = false"></div>

    <div class="body">

      <!-- ══ SIDEBAR ══ -->
      <aside :class="['sidebar', { 'sidebar-open': sidebarOpen }]">
        <div class="sidebar-head">Navigation</div>
        <button :class="['nav-btn', { active: activeTab === 'products' }]" @click="setTab('products')">📦 Products</button>
        <button :class="['nav-btn', { active: activeTab === 'orders'   }]" @click="setTab('orders')">🛒 Orders</button>
        <button :class="['nav-btn', { active: activeTab === 'support'  }]" @click="setTab('support')">💬 Support</button>
        <button :class="['nav-btn', { active: activeTab === 'users'    }]" @click="setTab('users')">👥 Users</button>
      </aside>

      <!-- ══ WORKSPACE ══ -->
      <main class="workspace">

        <!-- ── PRODUCTS ── -->
        <div v-if="activeTab === 'products'" class="fade-in">
          <div class="ws-head">
            <div>
              <h2 class="ws-title">Products Inventory</h2>
              <p class="ws-sub">{{ filteredProducts.length }} items</p>
            </div>
            <div class="ws-actions">
              <select v-model="selectedCategory" class="select-pill">
                <option value="All">All Categories</option>
                <option>Spices & Herbs</option>
                <option>Ghee & Oils</option>
                <option>Juices</option>
                <option>Sweets</option>
                <option>Himalayan Teas</option>
              </select>
              <button class="btn-primary" @click="goAdd">+ Add Product</button>
            </div>
          </div>

          <!-- Mobile: cards layout -->
          <div class="product-cards mobile-only">
            <div v-for="p in filteredProducts" :key="p.id" class="p-card" :class="{ inactive: !p.isActive }">
              <div class="p-card-top">
                <div class="thumb-cell">
                  <img v-if="p.imageUrls?.find(u => u?.trim())" :src="p.imageUrls.find(u => u?.trim())" class="thumb-img" />
                  <span v-else class="thumb-emoji">{{ p.emoji }}</span>
                </div>
                <div class="p-card-info">
                  <div class="item-name">{{ p.name }}</div>
                  <div class="item-sub">{{ p.weight }} · <span class="cat-pill">{{ p.category }}</span></div>
                  <!-- FIX: Price and discount separate -->
                  <div class="price-disc-row">
                    <span class="price-val">₹{{ p.price }}</span>
                    <span v-if="p.discount?.isDiscounted" class="disc-tag">{{ p.discount.percent }}% off</span>
                  </div>
                </div>
              </div>
              <div class="p-card-actions">
                <span :class="['status-pill', p.isActive ? 'pill-green' : 'pill-amber']">{{ p.isActive ? 'Active' : 'Inactive' }}</span>
                <span class="stock-num">Stock: {{ p.stock }}</span>
                <button class="btn-edit" @click="goEdit(p)">Edit</button>
                <button v-if="userRole === 'superadmin'" class="btn-del" @click="handleDel(p.id)">Del</button>
              </div>
            </div>
          </div>

          <!-- Desktop: table layout -->
          <div class="table-wrap desktop-only">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in filteredProducts" :key="p.id" :class="{ 'row-inactive': !p.isActive }">
                  <td>
                    <div class="item-meta">
                      <div class="thumb-cell">
                        <img v-if="p.imageUrls?.find(u => u?.trim())" :src="p.imageUrls.find(u => u?.trim())" class="thumb-img" />
                        <span v-else class="thumb-emoji">{{ p.emoji }}</span>
                      </div>
                      <div>
                        <div class="item-name">{{ p.name }}</div>
                        <div class="item-sub">{{ p.weight }}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="cat-pill">{{ p.category }}</span></td>
                  <!-- FIX: Price and discount on separate lines -->
                  <td>
                    <div class="price-disc-col">
                      <span class="price-val">₹{{ p.price }}</span>
                      <span v-if="p.discount?.isDiscounted" class="disc-tag">{{ p.discount.percent }}% off</span>
                    </div>
                  </td>
                  <td :class="{ 'low-stock': p.stock <= 5 }">{{ p.stock }}</td>
                  <td>
                    <span :class="['status-pill', p.isActive ? 'pill-green' : 'pill-amber']">
                      {{ p.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>
                    <div class="row-actions">
                      <button class="btn-edit" @click="goEdit(p)">Edit</button>
                      <button v-if="userRole === 'superadmin'" class="btn-del" @click="handleDel(p.id)">Delete</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── ORDERS ── -->
        <div v-if="activeTab === 'orders'" class="fade-in">
          <div class="ws-head">
            <div>
              <h2 class="ws-title">Orders</h2>
              <p class="ws-sub">{{ ordersList.length }} total orders</p>
            </div>
          </div>

          <!-- Mobile: order cards -->
          <div class="order-cards mobile-only">
            <div v-for="o in ordersList" :key="o.id" class="o-card">
              <div class="o-card-row">
                <code class="id-code">{{ o.id?.substring(0, 10) }}…</code>
                <span :class="['status-pill', statusClass(o.shippingStatus)]">{{ o.shippingStatus || 'pending' }}</span>
              </div>
              <div class="o-card-name">{{ o.customerName || '—' }}</div>
              <div class="o-card-sub">{{ fmtDate(o.createdAt) }} · ₹{{ o.amount }}</div>
              <button class="btn-view" @click="openOrder(o)">View Details →</button>
            </div>
          </div>

          <!-- Desktop: table -->
          <div class="table-wrap desktop-only">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Order ID / Date</th>
                  <th>Customer</th>
                  <th>Address</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
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
                  <td class="price-val">₹{{ o.amount }}</td>
                  <td><span :class="['status-pill', statusClass(o.shippingStatus)]">{{ o.shippingStatus || 'pending' }}</span></td>
                  <td><button class="btn-view" @click="openOrder(o)">View →</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── SUPPORT DESK ── -->
        <div v-if="activeTab === 'support'" class="fade-in support-layout">
          <div class="ws-head">
            <div>
              <h2 class="ws-title">Support Desk</h2>
              <p class="ws-sub">Customer queries</p>
            </div>
          </div>

          <div class="chat-shell">
            <!-- Thread list -->
            <div class="thread-list">
              <div class="thread-list-head">Conversations</div>
              <div v-if="supportThreads.length === 0" class="thread-empty">No chats yet</div>
              <div
                v-for="t in supportThreads" :key="t.userId"
                :class="['thread-item', { selected: selectedChatUserId === t.userId }]"
                @click="selectedChatUserId = t.userId"
              >
                <div class="thread-name">{{ t.userName || 'Anonymous' }}</div>
                <div class="thread-uid">{{ t.userId.substring(0, 8) }}…</div>
              </div>
            </div>

            <!-- Chat window -->
            <div class="chat-window">
              <div v-if="!selectedChatUserId" class="chat-placeholder">
                <span>💬</span>
                <p>Select a conversation</p>
              </div>
              <template v-else>
                <div class="chat-messages">
                  <div
                    v-for="(msg, i) in activeChatDoc?.messages || []" :key="i"
                    :class="['bubble-wrap', msg.role === 'admin' ? 'mine' : 'theirs']"
                  >
                    <div class="bubble-meta">{{ msg.role === 'admin' ? 'You' : activeChatDoc?.userName }} · {{ fmtTime(msg.timestamp) }}</div>
                    <div :class="['bubble', msg.role === 'admin' ? 'bubble-admin' : 'bubble-user']">{{ msg.text }}</div>
                  </div>
                </div>
                <div class="chat-input-bar">
                  <input v-model="adminChatText" class="chat-input" placeholder="Reply to customer…" @keyup.enter="sendAdminReply" />
                  <button class="btn-send" :disabled="chatSending" @click="sendAdminReply">
                    {{ chatSending ? '…' : 'Send' }}
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- ── USERS ── -->
        <div v-if="activeTab === 'users'" class="fade-in">
          <div class="ws-head">
            <div>
              <h2 class="ws-title">Users</h2>
              <p class="ws-sub">{{ usersList.length }} registered</p>
            </div>
          </div>

          <!-- Mobile: cards -->
          <div class="user-cards mobile-only">
            <div v-for="u in usersList" :key="u.id" class="u-card">
              <div class="u-name">{{ u.displayName || 'User' }}</div>
              <div class="u-email">{{ u.email }}</div>
              <div class="u-row">
                <span :class="['role-pill', u.role === 'superadmin' ? 'role-super' : u.role === 'admin' ? 'role-admin' : 'role-user']">{{ u.role || 'user' }}</span>
                <div v-if="userRole === 'superadmin'" class="role-btns">
                  <button class="btn-role" @click="handleRole(u.id, 'user')">User</button>
                  <button class="btn-role" @click="handleRole(u.id, 'admin')">Admin</button>
                  <button class="btn-role" @click="handleRole(u.id, 'superadmin')">Super</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Desktop: table -->
          <div class="table-wrap desktop-only">
            <table class="data-table">
              <thead>
                <tr><th>Name / UID</th><th>Email</th><th>Role</th><th>Change Role</th></tr>
              </thead>
              <tbody>
                <tr v-for="u in usersList" :key="u.id">
                  <td>
                    <div class="item-name">{{ u.displayName || 'User' }}</div>
                    <code class="id-code">{{ u.id?.substring(0, 8) }}…</code>
                  </td>
                  <td class="item-sub">{{ u.email }}</td>
                  <td>
                    <span :class="['role-pill', u.role === 'superadmin' ? 'role-super' : u.role === 'admin' ? 'role-admin' : 'role-user']">
                      {{ u.role || 'user' }}
                    </span>
                  </td>
                  <td>
                    <div v-if="userRole === 'superadmin'" class="row-actions">
                      <button class="btn-role" @click="handleRole(u.id, 'user')">User</button>
                      <button class="btn-role" @click="handleRole(u.id, 'admin')">Admin</button>
                      <button class="btn-role" @click="handleRole(u.id, 'superadmin')">Super</button>
                    </div>
                    <span v-else class="item-sub">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>

    <!-- ══ COUPON PANEL (slide-in) ══ -->
    <transition name="slide-up">
      <div v-if="showCouponPanel" class="coupon-overlay" @click.self="showCouponPanel = false">
        <div class="coupon-panel">
          <div class="panel-head">
            <h3>Coupon Management</h3>
            <button class="x-btn" @click="showCouponPanel = false">✕</button>
          </div>

          <!-- Add new coupon -->
          <div class="coupon-form">
            <h4 class="form-section-label">Add New Coupon</h4>
            <div class="coupon-grid">
              <div class="cf-field">
                <label>Code</label>
                <input v-model="newCoupon.code" class="cf-input" placeholder="PAHAD10" style="text-transform:uppercase" />
              </div>
              <div class="cf-field">
                <label>Type</label>
                <select v-model="newCoupon.type" class="cf-input">
                  <option value="percent">Percent (%)</option>
                  <option value="flat">Flat Amount (₹)</option>
                </select>
              </div>
              <div class="cf-field">
                <label>Discount {{ newCoupon.type === 'percent' ? '(%)' : '(₹)' }}</label>
                <input v-model.number="newCoupon.discount" type="number" class="cf-input" min="1" />
              </div>
              <div class="cf-field">
                <label>Min Order Amount (₹)</label>
                <input v-model.number="newCoupon.minOrderAmount" type="number" class="cf-input" min="0" />
              </div>
              <div class="cf-field">
                <label>Min Items in Cart</label>
                <input v-model.number="newCoupon.minItems" type="number" class="cf-input" min="0" />
              </div>
              <div class="cf-field">
                <label>Expires At</label>
                <input v-model="newCoupon.expiresAt" type="datetime-local" class="cf-input" />
              </div>
              
              <!-- ✨ NEW: Usage Limitation System -->
              <div class="cf-field">
                <label>Usage Limit (0 = Unlimited)</label>
                <input v-model.number="newCoupon.maxUses" type="number" class="cf-input" placeholder="e.g. 100" min="0" />
              </div>
            </div>

            <div class="coupon-form-foot">
              <label class="toggle-label">
                <input type="checkbox" v-model="newCoupon.active" /> Active
              </label>
              <button class="btn-primary" @click="addCoupon">+ Add Coupon</button>
            </div>
          </div>

          <!-- Existing coupons list -->
          <div class="coupon-list">
            <h4 class="form-section-label">Active Coupons ({{ coupons.length }})</h4>
            <div v-if="coupons.length === 0" class="empty-note">No coupons yet</div>
            <div v-for="(c, i) in coupons" :key="i" class="coupon-row">
              <div class="coupon-row-left">
                <span class="coupon-code">{{ c.code }}</span>
                <span class="coupon-meta">
                  {{ c.type === 'percent' ? c.discount + '%' : '₹' + c.discount }} off
                  <template v-if="c.minOrderAmount > 0"> · Min ₹{{ c.minOrderAmount }}</template>
                  <template v-if="c.minItems > 0"> · Min {{ c.minItems }} items</template>
                  <template v-if="c.expiresAt"> · Expires {{ new Date(c.expiresAt).toLocaleDateString('en-IN') }}</template>
                  <!-- ✨ NEW: View live usage numbers -->
                  <template v-if="c.maxUses > 0"> · <strong>{{ c.usageCount || 0 }} / {{ c.maxUses }} used</strong></template>
                </span>
              </div>
              <div class="coupon-row-right">
                <span :class="['status-pill', c.active ? 'pill-green' : 'pill-amber']">{{ c.active ? 'Active' : 'Inactive' }}</span>
                <button class="btn-role" @click="toggleCouponActive(i)">Toggle</button>
                <button class="btn-del" @click="removeCoupon(i)">Remove</button>
              </div>
            </div>
          </div>

          <div class="panel-foot">
            <button class="btn-primary" :disabled="couponSaving" @click="saveCouponList">
              {{ couponSaving ? 'Saving…' : '💾 Save All Coupons' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══ ORDER DETAIL MODAL ══ -->
    <transition name="fade">
      <div v-if="showOrderModal && selectedOrder" class="modal-backdrop" @click.self="closeOrder">
        <div class="modal-box">

          <header class="modal-head">
            <div>
              <h3 class="modal-title">Order Details</h3>
              <code class="modal-id">{{ selectedOrder.id }}</code>
            </div>
            <button class="x-btn" @click="closeOrder">✕</button>
          </header>

          <div class="modal-body">

            <!-- Status bar -->
            <div class="modal-status-bar">
              <span :class="['status-pill lg', statusClass(selectedOrder.shippingStatus)]">
                {{ selectedOrder.shippingStatus || 'pending' }}
              </span>
              <span class="modal-date">{{ fmtDate(selectedOrder.createdAt) }}</span>
            </div>

            <!-- Customer Info -->
            <section class="modal-section">
              <div class="modal-section-title">Customer Information</div>
              <div class="info-grid">
                <div class="info-cell">
                  <span class="info-label">Name</span>
                  <strong class="info-val">{{ selectedOrder.customerName }}</strong>
                </div>
                <div class="info-cell">
                  <span class="info-label">Phone</span>
                  <strong class="info-val">{{ selectedOrder.phone }}</strong>
                </div>
                <div class="info-cell full">
                  <span class="info-label">Delivery Address</span>
                  <div class="addr-block">{{ selectedOrder.address }}</div>
                </div>
              </div>
            </section>

            <!-- Order Items -->
            <section class="modal-section">
              <div class="modal-section-title">Items Ordered</div>
              <div class="items-list">
                <div v-for="item in selectedOrder.items" :key="item.productId" class="item-strip">
                  <span class="item-emoji">{{ item.emoji || '📦' }}</span>
                  <span class="item-strip-name">{{ item.name }}</span>
                  <span class="item-strip-qty">× {{ item.quantity }}</span>
                  <strong class="item-strip-price">₹{{ item.price * item.quantity }}</strong>
                </div>
              </div>
            </section>

            <!-- Payment Summary -->
            <section class="modal-section">
              <div class="modal-section-title">Payment Summary</div>
              <div class="pricing-block">
                <div class="price-row"><span>Payment Method</span><span class="tag-pill">{{ selectedOrder.paymentMethod || '—' }}</span></div>
                <div class="price-row"><span>Payment Status</span><span class="tag-pill">{{ selectedOrder.paymentStatus || '—' }}</span></div>
                <div class="price-row grand"><span>Grand Total</span><strong>₹{{ selectedOrder.amount }}</strong></div>
              </div>
            </section>

            <!-- Action section — only if pending/confirmed -->
            <section
              v-if="selectedOrder.shippingStatus !== 'shipped' && selectedOrder.shippingStatus !== 'delivered' && selectedOrder.shippingStatus !== 'rejected'"
              class="modal-section"
            >
              <div class="modal-section-title">Order Actions</div>

              <!-- Confirm button if pending -->
              <div v-if="selectedOrder.shippingStatus === 'pending'" style="margin-bottom:14px">
                <button class="btn-confirm-full" @click="confirmOrder(selectedOrder.id)">✓ Confirm Order</button>
              </div>

              <!-- AWB Tracking -->
              <div class="action-block">
                <label class="action-label">Shiprocket AWB Tracking ID</label>
                <div class="tracking-row">
                  <input
                    :id="'awb_' + selectedOrder.id"
                    type="text"
                    :value="selectedOrder.trackingId !== 'PENDING_DISPATCH' ? selectedOrder.trackingId : ''"
                    placeholder="Paste AWB tracking number…"
                    class="cf-input"
                  />
                  <button class="btn-primary" @click="saveTracking(selectedOrder.id, 'awb_' + selectedOrder.id)">
                    Mark Shipped
                  </button>
                </div>
              </div>

              <!-- Reject section -->
              <div class="action-block reject-zone">
                <label class="action-label danger">Cancel & Reject Order</label>
                <textarea
                  v-model="rejectionComment"
                  class="reject-textarea"
                  placeholder="Provide reason for customer (e.g., Refund will be processed in 3-5 days via Razorpay)…"
                ></textarea>
                <button class="btn-reject-full" @click="rejectOrder">✕ Reject Order</button>
              </div>
            </section>

            <!-- Shipped state -->
            <div v-if="selectedOrder.shippingStatus === 'shipped' || selectedOrder.shippingStatus === 'delivered'" class="shipped-tag">
              🚚 Tracking ID: <strong>{{ selectedOrder.trackingId }}</strong>
            </div>

            <!-- Rejected state -->
            <div v-if="selectedOrder.shippingStatus === 'rejected'" class="rejected-tag">
              <strong>⚠️ Order Rejected</strong>
              <p v-if="selectedOrder.adminComment">Reason: "{{ selectedOrder.adminComment }}"</p>
            </div>

          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

/* ── Variables ── */
.shell {
  --bg:       #F0F2F5;
  --white:    #FFFFFF;
  --border:   #E2E8F0;
  --text:     #0F172A;
  --muted:    #64748B;
  --green:    #15803D;
  --red:      #DC2626;
  --amber:    #92400E;
  --blue:     #2563EB;
  --radius:   10px;

  display: flex;
  flex-direction: column;
  min-height: 40vh;
  background: var(--bg);
  font-family: 'DM Sans', system-ui, sans-serif;
  color: var(--text);
  box-sizing: border-box;

  /* navbar height + desired gap */
  padding-top: 150px; /* 60px navbar + 90px space */
}

.topbar {
  position: fixed;
  top: 90px;
  left: 0;
  right: 0;
  z-index: 200;

  height: 60px;
  background: var(--white);
  border-bottom: 1px solid var(--border);

  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 20px;

  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}
.topbar-left  { display: flex; align-items: center; gap: 10px; }
.topbar-right { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.brand { font-weight: 800; font-size: 1rem; color: var(--green); white-space: nowrap; }

.hamburger {
  display: none; flex-direction: column; gap: 4px;
  width: 32px; height: 32px; border: none; background: transparent;
  cursor: pointer; padding: 6px; border-radius: 6px;
}
.hamburger span { display: block; width: 100%; height: 2px; background: var(--muted); border-radius: 2px; }
@media (max-width: 768px) { .hamburger { display: flex; } }

.search-input {
  flex: 1; max-width: 300px; padding: 8px 14px;
  border: 1.5px solid var(--border); border-radius: 20px;
  font-size: .9rem; outline: none; background: var(--bg);
  color: var(--text); font-weight: 600;
}
.search-input:focus { border-color: var(--green); background: var(--white); }

.cod-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 20px; border: 2px solid;
  font-size: .8rem; font-weight: 800; cursor: pointer; white-space: nowrap;
}
.cod-on  { border-color: var(--green); background: #f0fdf4; color: var(--green); }
.cod-off { border-color: var(--red);   background: #fef2f2; color: var(--red);   }
.cod-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.cod-label { }

.top-btn {
  padding: 6px 14px; border: 1.5px solid var(--border);
  border-radius: 20px; background: var(--white);
  font-size: .82rem; font-weight: 700; cursor: pointer; color: var(--text);
  display: flex; align-items: center; gap: 4px; white-space: nowrap;
}
.top-btn.danger { border-color: #fca5a5; color: var(--red); }
.top-btn:hover  { background: var(--bg); }

/* ── BODY LAYOUT ── */
.body { display: flex; flex: 1; }

/* ── SIDEBAR ── */
.sidebar {
  width: 200px; background: var(--white);
  border-right: 1px solid var(--border);
  padding: 16px 10px; display: flex; flex-direction: column; gap: 4px;
  flex-shrink: 0;
}
.sidebar-head { font-size: .7rem; font-weight: 800; text-transform: uppercase; color: var(--muted); padding: 6px 14px 10px; letter-spacing: .5px; }
.nav-btn { background: transparent; border: none; padding: 11px 14px; border-radius: 8px; font-size: .9rem; font-weight: 600; color: #475569; text-align: left; cursor: pointer; width: 100%; transition: all .15s; }
.nav-btn:hover  { background: #F3F4F6; color: var(--green); }
.nav-btn.active { background: var(--green); color: #fff; }

@media (max-width: 768px) {
  .sidebar {
    position: fixed; top: 60px; left: -220px; bottom: 0;
    z-index: 150; width: 220px; transition: left .25s ease;
    box-shadow: 4px 0 16px rgba(0,0,0,.1);
  }
  .sidebar.sidebar-open { left: 0; }
}
.mob-overlay { position: fixed; inset: 0; z-index: 140; background: rgba(0,0,0,.3); }

/* ── WORKSPACE ── */
.workspace { flex: 1; padding: 24px 20px; overflow-x: hidden; min-width: 0; }
.ws-head   { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.ws-title  { margin: 0; font-size: 1.5rem; font-weight: 900; color: var(--text); }
.ws-sub    { margin: 3px 0 0; color: var(--muted); font-size: .88rem; font-weight: 500; }
.ws-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

/* ── TABLE ── */
.table-wrap  { background: var(--white); border-radius: var(--radius); border: 1px solid var(--border); overflow-x: auto; }
.data-table  { width: 100%; border-collapse: collapse; min-width: 520px; }
.data-table th { background: #F8FAFC; color: var(--text); font-size: .8rem; font-weight: 800; text-transform: uppercase; padding: 14px; border-bottom: 2px solid var(--border); text-align: left; letter-spacing: .4px; }
.data-table td { padding: 14px; border-bottom: 1px solid var(--border); vertical-align: middle; color: var(--text); }
.row-inactive td { opacity: .5; background: #f8fafc; }
.low-stock { color: var(--red) !important; font-weight: 800; }

.item-meta   { display: flex; align-items: center; gap: 10px; }
.thumb-cell  { width: 42px; height: 42px; border-radius: 8px; overflow: hidden; background: #F3F4F6; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); flex-shrink: 0; }
.thumb-img   { width: 100%; height: 100%; object-fit: cover; }
.thumb-emoji { font-size: 1.5rem; }
.item-name   { font-weight: 700; font-size: .93rem; color: var(--text); }
.item-sub    { font-size: .78rem; color: var(--muted); margin-top: 2px; font-weight: 500; }
.addr-cell   { font-size: .85rem; max-width: 220px; word-break: break-word; line-height: 1.4; }
.id-code     { background: #f1f5f9; padding: 3px 7px; border-radius: 5px; font-family: monospace; font-size: .8rem; color: var(--text); border: 1px solid var(--border); font-weight: 700; }

/* FIX: Price + discount separated */
.price-disc-col { display: flex; flex-direction: column; gap: 3px; }
.price-disc-row { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
.price-val  { font-weight: 800; font-size: 1rem; color: var(--text); }
.disc-tag   { background: #fef08a; color: #854d0e; font-size: .72rem; padding: 2px 7px; border-radius: 4px; font-weight: 800; }

.cat-pill   { background: #EEF2FF; color: #4338CA; padding: 3px 8px; border-radius: 5px; font-size: .72rem; font-weight: 800; }
.row-actions { display: flex; gap: 6px; flex-wrap: wrap; }

/* Buttons */
.btn-primary { background: var(--green); color: #fff; border: none; padding: 9px 18px; border-radius: 20px; font-size: .88rem; font-weight: 700; cursor: pointer; white-space: nowrap; transition: background .2s; }
.btn-primary:hover { background: #166534; }
.btn-edit  { background: var(--white); border: 1.5px solid var(--border); padding: 6px 12px; border-radius: 6px; font-size: .8rem; font-weight: 700; cursor: pointer; color: var(--text); transition: border-color .2s; }
.btn-edit:hover { border-color: var(--green); color: var(--green); }
.btn-del   { background: #FFF5F5; border: 1.5px solid #FECACA; padding: 6px 12px; border-radius: 6px; font-size: .8rem; font-weight: 700; cursor: pointer; color: var(--red); }
.btn-del:hover { background: var(--red); color: #fff; }
.btn-view  { background: var(--text); color: #fff; border: none; padding: 7px 14px; border-radius: 6px; font-size: .82rem; font-weight: 700; cursor: pointer; transition: background .2s; }
.btn-view:hover { background: #1e293b; }
.btn-role  { background: var(--white); border: 1.5px solid var(--border); padding: 5px 10px; border-radius: 6px; font-size: .78rem; font-weight: 700; cursor: pointer; color: var(--text); }
.btn-role:hover { border-color: var(--green); color: var(--green); }
.select-pill { padding: 8px 14px; border-radius: 20px; background: var(--white); font-size: .9rem; outline: none; cursor: pointer; border: 1.5px solid var(--border); color: var(--text); font-weight: 700; }

/* Status pills */
.status-pill { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: .72rem; font-weight: 800; text-transform: capitalize; }
.pill-green { background: #DCFCE7; color: #15803D; border: 1px solid #bbf7d0; }
.pill-amber { background: #FEF3C7; color: #92400E; border: 1px solid #fde68a; }
.pill-red   { background: #FEE2E2; color: #991B1B; border: 1px solid #fca5a5; }
.pill-blue  { background: #EFF6FF; color: #1D4ED8; border: 1px solid #bfdbfe; }
.status-pill.lg { font-size: .85rem; padding: 5px 14px; }

/* Role pills */
.role-pill  { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: .72rem; font-weight: 800; text-transform: capitalize; }
.role-super { background: #fef2f2; color: var(--red); border: 1px solid #fca5a5; }
.role-admin { background: #dcfce7; color: var(--green); border: 1px solid #bbf7d0; }
.role-user  { background: #f1f5f9; color: #475569; border: 1px solid var(--border); }

/* ── MOBILE CARDS ── */
.mobile-only  { display: none; }
.desktop-only { display: block; }
@media (max-width: 768px) {
  .mobile-only  { display: flex; flex-direction: column; gap: 12px; }
  .desktop-only { display: none; }
}

.p-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; }
.p-card.inactive { opacity: .6; }
.p-card-top     { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
.p-card-info    { flex: 1; }
.p-card-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.stock-num      { font-size: .8rem; color: var(--muted); font-weight: 600; margin-left: auto; }

.o-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; display: flex; flex-direction: column; gap: 6px; }
.o-card-row  { display: flex; align-items: center; justify-content: space-between; }
.o-card-name { font-weight: 700; font-size: .95rem; }
.o-card-sub  { font-size: .82rem; color: var(--muted); }

.u-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; }
.u-name { font-weight: 700; margin-bottom: 3px; }
.u-email { font-size: .82rem; color: var(--muted); margin-bottom: 10px; }
.u-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.role-btns { display: flex; gap: 6px; flex-wrap: wrap; }

/* ── SUPPORT CHAT ── */
.support-layout { display: flex; flex-direction: column; height: calc(100vh - 140px); }
.chat-shell     { flex: 1; display: flex; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; background: var(--white); }
.thread-list    { width: 280px; border-right: 1px solid var(--border); display: flex; flex-direction: column; flex-shrink: 0; }
.thread-list-head { padding: 14px 16px; font-size: .75rem; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid var(--border); color: var(--muted); }
.thread-empty { padding: 20px; text-align: center; color: var(--muted); font-size: .85rem; }
.thread-item { padding: 14px 16px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background .15s; }
.thread-item:hover    { background: #f8fafc; }
.thread-item.selected { background: #f0fdf4; }
.thread-name { font-weight: 700; font-size: .9rem; color: var(--text); }
.thread-uid  { font-size: .72rem; color: var(--muted); margin-top: 2px; }

.chat-window      { flex: 1; display: flex; flex-direction: column; }
.chat-placeholder { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--muted); }
.chat-placeholder span { font-size: 2.5rem; }
.chat-messages { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; background: #FAFAF8; }
.bubble-wrap { display: flex; flex-direction: column; max-width: 75%; }
.bubble-wrap.mine   { align-self: flex-end; align-items: flex-end; }
.bubble-wrap.theirs { align-self: flex-start; align-items: flex-start; }
.bubble-meta { font-size: .68rem; color: var(--muted); font-weight: 700; margin-bottom: 4px; }
.bubble      { padding: 10px 14px; border-radius: 12px; font-size: .9rem; line-height: 1.5; }
.bubble-admin { background: var(--green); color: #fff; border-radius: 12px 12px 2px 12px; }
.bubble-user  { background: var(--white); color: var(--text); border: 1px solid var(--border); border-radius: 12px 12px 12px 2px; }
.chat-input-bar { padding: 14px; border-top: 1px solid var(--border); display: flex; gap: 8px; background: var(--white); }
.chat-input { flex: 1; padding: 10px 14px; border: 1.5px solid var(--border); border-radius: 8px; font-size: .9rem; outline: none; color: var(--text); }
.chat-input:focus { border-color: var(--green); }
.btn-send { background: var(--green); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; }

@media (max-width: 768px) {
  .thread-list { width: 120px; }
  .thread-name { font-size: .8rem; }
}

/* ── COUPON PANEL ── */
.coupon-overlay { position: fixed; inset: 0; z-index: 400; background: rgba(15,23,42,.6); display: flex; align-items: flex-end; justify-content: center; }
.coupon-panel   { background: var(--white); width: 100%; max-width: 720px; border-radius: 16px 16px 0 0; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; }
.panel-head     { padding: 18px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
.panel-head h3  { margin: 0; font-size: 1.1rem; font-weight: 800; color: var(--text); }
.panel-foot     { padding: 16px 24px; border-top: 1px solid var(--border); }
.coupon-form    { padding: 20px 24px; border-bottom: 1px solid var(--border); }
.form-section-label { font-size: .75rem; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); margin: 0 0 12px; }
.coupon-grid    { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.cf-field       { display: flex; flex-direction: column; gap: 4px; }
.cf-field label { font-size: .78rem; font-weight: 700; color: var(--muted); }
.cf-input       { padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 8px; font-size: .9rem; color: var(--text); outline: none; background: var(--white); font-family: inherit; }
.cf-input:focus { border-color: var(--green); }
.coupon-form-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; }
.toggle-label { font-size: .88rem; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; }
.coupon-list  { flex: 1; overflow-y: auto; padding: 16px 24px; display: flex; flex-direction: column; gap: 10px; }
.empty-note   { color: var(--muted); font-size: .88rem; text-align: center; padding: 20px 0; }
.coupon-row   { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; flex-wrap: wrap; }
.coupon-row-left  { display: flex; flex-direction: column; gap: 4px; }
.coupon-row-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.coupon-code  { font-family: monospace; font-weight: 800; font-size: .95rem; color: var(--text); background: var(--white); border: 1px solid var(--border); padding: 3px 8px; border-radius: 4px; }
.coupon-meta  { font-size: .78rem; color: var(--muted); font-weight: 500; }

/* ── ORDER MODAL ── */
.modal-backdrop { position: fixed; inset: 0; z-index: 300; background: rgba(15,23,42,.7); display: flex; align-items: center; justify-content: center; padding: 16px; }
.modal-box      { background: var(--white); width: 100%; max-width: 640px; border-radius: 14px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 25px 60px rgba(0,0,0,.25); }
.modal-head     { padding: 18px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: flex-start; background: #f8fafc; border-radius: 14px 14px 0 0; }
.modal-title    { margin: 0 0 4px; font-size: 1.1rem; font-weight: 800; color: var(--text); }
.modal-id       { font-family: monospace; font-size: .75rem; background: var(--bg); padding: 2px 6px; border-radius: 4px; color: var(--muted); border: 1px solid var(--border); }
.modal-body     { padding: 20px 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 20px; }

.modal-status-bar { display: flex; align-items: center; justify-content: space-between; }
.modal-date { font-size: .85rem; color: var(--muted); font-weight: 600; }

.modal-section       { display: flex; flex-direction: column; gap: 10px; }
.modal-section-title { font-size: .72rem; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); padding-bottom: 6px; border-bottom: 1px solid var(--border); }

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.info-cell { display: flex; flex-direction: column; gap: 3px; }
.info-cell.full { grid-column: 1 / -1; }
.info-label { font-size: .72rem; font-weight: 800; text-transform: uppercase; color: var(--muted); letter-spacing: .4px; }
.info-val   { font-size: .95rem; font-weight: 700; color: var(--text); }
.addr-block { padding: 10px 12px; background: #f8fafc; border: 1px dashed var(--border); border-radius: 8px; font-size: .9rem; line-height: 1.5; color: var(--text); }

.items-list   { display: flex; flex-direction: column; gap: 8px; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid var(--border); }
.item-strip   { display: flex; align-items: center; gap: 10px; }
.item-emoji   { font-size: 1.3rem; }
.item-strip-name  { flex: 1; font-weight: 600; font-size: .93rem; color: var(--text); }
.item-strip-qty   { color: var(--muted); font-size: .85rem; }
.item-strip-price { font-weight: 800; color: var(--text); }

.pricing-block { display: flex; flex-direction: column; gap: 8px; }
.price-row { display: flex; justify-content: space-between; font-size: .93rem; color: var(--text); font-weight: 600; }
.price-row.grand { font-size: 1.1rem; font-weight: 900; padding-top: 8px; border-top: 2px solid var(--border); }
.tag-pill { background: #e2e8f0; padding: 3px 9px; border-radius: 5px; font-family: monospace; font-size: .78rem; font-weight: 700; text-transform: uppercase; color: var(--text); }

/* Action blocks */
.action-block { display: flex; flex-direction: column; gap: 8px; }
.action-label { font-size: .8rem; font-weight: 700; color: var(--text); }
.action-label.danger { color: var(--red); }
.tracking-row { display: flex; gap: 8px; align-items: center; }
.reject-zone  { border: 1px dashed #fca5a5; border-radius: 8px; padding: 14px; background: #fff5f5; margin-top: 4px; }
.reject-textarea { padding: 10px 12px; border: 1.5px solid #fca5a5; border-radius: 8px; font-family: inherit; font-size: .9rem; resize: none; height: 72px; outline: none; color: var(--text); background: var(--white); width: 100%; box-sizing: border-box; }

.btn-confirm-full { width: 100%; background: #2563EB; color: #fff; border: none; padding: 11px; border-radius: 8px; font-weight: 700; font-size: .9rem; cursor: pointer; }
.btn-confirm-full:hover { background: #1d4ed8; }
.btn-reject-full  { width: 100%; background: #FFF5F5; border: 1.5px solid #FECACA; color: var(--red); padding: 10px; border-radius: 8px; font-weight: 700; font-size: .9rem; cursor: pointer; margin-top: 4px; }
.btn-reject-full:hover { background: var(--red); color: #fff; }

.shipped-tag  { background: #F0FDF4; border: 1px solid #BBF7D0; color: #15803D; padding: 14px; border-radius: 8px; font-weight: 700; font-size: .9rem; }
.rejected-tag { background: #FEF2F2; border: 1px solid #FECACA; padding: 14px; border-radius: 8px; color: var(--red); }
.rejected-tag p { margin: 6px 0 0; font-size: .88rem; font-style: italic; }

.x-btn { background: none; border: none; font-size: 1.1rem; font-weight: 700; cursor: pointer; color: var(--muted); padding: 4px 8px; border-radius: 4px; }
.x-btn:hover { color: var(--red); background: #fff5f5; }

/* Animations */
.fade-in { animation: fi .2s ease-out; }
@keyframes fi { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
.slide-up-enter-active, .slide-up-leave-active { transition: opacity .25s, transform .25s; }
.slide-up-enter-from, .slide-up-leave-to       { opacity: 0; transform: translateY(30px); }
</style>