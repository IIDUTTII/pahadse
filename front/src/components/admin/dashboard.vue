<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../../firebase.js'
import {
  fetchUserRole, logoutUser, subscribeToProducts, subscribeToOrders,
  subscribeToSupportChats, fetchGatewayConfig, fetchAllUsersFromDb, fetchCoupons
} from '../db.js'

//import ProductsTab from './ProductsTab.vue'
import OrdersTab from './OrdersTab.vue'
import UsersTab from './UsersTab.vue'
import SupportTab from './SupportTab.vue'
import AuditLogsTab from './AuditLogsTab.vue'
import SettingsTab from './SettingsTab.vue'
import AnalyticsTab from './AnalyticsTab.vue'
import NewTab from './newtab.vue'
import InventoryTab from './InventoryTab.vue'
import ContentManagerTab from './LandingTab.vue'
import PaymentsTab from './PaymentsTab.vue'

defineOptions({ name: 'AdminDashboard' })
const router = useRouter()

const activeTab   = ref('analytics')
const userRole    = ref('user')
const moreOpen    = ref(false)   // mobile "more" sheet
const loading     = ref(true)
const isCodActive = ref(true)

const products       = ref([])
const ordersList      = ref([])
const supportThreads  = ref([])
const usersList       = ref([])
const coupons         = ref([])

let _unsubProducts = null
let _unsubOrders    = null
let _unsubSupport   = null

const openOrdersFromMetric = () => {
  activeTab.value = 'orders'
  moreOpen.value = false
}

onMounted(() => {
  window.addEventListener('apply-order-filter', openOrdersFromMetric)
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      userRole.value = await fetchUserRole()

      _unsubProducts = subscribeToProducts(snap => {
        products.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      })

      if (userRole.value === 'admin' || userRole.value === 'superadmin') {
        _unsubOrders = subscribeToOrders(snap => {
          ordersList.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        })
        _unsubSupport = subscribeToSupportChats(snap => {
          supportThreads.value = snap.docs
            .map(d => ({ userId: d.id, ...d.data() }))
            .sort((a, b) => (b.lastUpdated?.seconds || 0) - (a.lastUpdated?.seconds || 0))
        })
        try {
          const cfg = await fetchGatewayConfig()
          isCodActive.value = cfg.isCodActive ?? true
          usersList.value = await fetchAllUsersFromDb()
          coupons.value = await fetchCoupons()
        } catch (e) { console.warn(e) }
      }
      loading.value = false
    } else {
      router.push('/login')
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('apply-order-filter', openOrdersFromMetric)
  if (_unsubProducts) _unsubProducts()
  if (_unsubOrders) _unsubOrders()
  if (_unsubSupport) _unsubSupport()
})

const handleLogout = async () => {
  if (confirm('Are you sure you want to securely logout?')) {
    await logoutUser()
    router.push('/login')
  }
}

const setTab = (tab) => { activeTab.value = tab; moreOpen.value = false }

const openSupportCount = computed(() =>
  supportThreads.value.filter(t => t.status !== 'closed' && t.status !== 'resolved').length
)

const primaryTabs = computed(() => {
  const tabs = [
    { id: 'analytics', label: 'Overview', icon: '📊' },
    { id: 'landing', label: 'Content', icon: '🎨' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'orders',    label: 'Orders',   icon: '🛒' },
    { id: 'payments', label: 'Payments', icon: '💳' },
    { id: 'support',   label: 'Support',  icon: '💬', badge: openSupportCount.value },
  ]
  return tabs
})

const secondaryTabs = computed(() => {
  const tabs = [
    { id: 'users',    label: 'Users',    icon: '👥' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'newtab',   label: 'New Tab',  icon: '➕' },
  ]
  if (userRole.value === 'superadmin') {
    tabs.push({ id: 'auditLogs', label: 'Audit Logs', icon: '📜' })
  }
  return tabs
})

const allTabs = computed(() => [...primaryTabs.value, ...secondaryTabs.value])
const currentTabLabel = computed(() => allTabs.value.find(t => t.id === activeTab.value)?.label ?? '')
</script>

<template>
  <div v-if="loading" class="loading-screen">
    <div class="spinner"></div>
    <p>Authenticating clearance…</p>
  </div>

  <div v-else class="shell">
    <aside class="rail">
      <div class="rail-brand">
        <span class="brand-mark">PahadS.</span>
      </div>

      <nav class="rail-nav">
        <button
          v-for="t in primaryTabs" :key="t.id"
          :class="['rail-btn', { active: activeTab === t.id }]"
          @click="setTab(t.id)"
        >
          <span class="rail-icon">{{ t.icon }}</span>
          <span class="rail-label">{{ t.label }}</span>
          <span v-if="t.badge" class="rail-badge">{{ t.badge }}</span>
        </button>

        <div class="rail-sep"></div>

        <button
          v-for="t in secondaryTabs" :key="t.id"
          :class="['rail-btn', { active: activeTab === t.id }]"
          @click="setTab(t.id)"
        >
          <span class="rail-icon">{{ t.icon }}</span>
          <span class="rail-label">{{ t.label }}</span>
        </button>
      </nav>

      <button class="rail-btn rail-logout" @click="handleLogout">
        <span class="rail-icon">⏻</span>
        <span class="rail-label">Logout</span>
      </button>
    </aside>

    <div class="main-column">
      <header class="topbar">
        <div class="topbar-title">
          <h1>{{ currentTabLabel }}</h1>
        </div>
        <div class="topbar-meta">
          <span class="clean-chip" :class="{ super: userRole === 'superadmin' }">
            <i class="chip-dot"></i>{{ userRole === 'superadmin' ? 'SuperAdmin' : 'Admin' }}
          </span>
          <span class="clean-chip cod-status" :class="{ off: !isCodActive }">
            <i class="chip-dot"></i>COD {{ isCodActive ? 'Live' : 'Paused' }}
          </span>
        </div>
      </header>

      <main class="workspace">
        <AnalyticsTab   v-if="activeTab === 'analytics'" />
        <ContentManagerTab v-if="activeTab === 'landing'" :user-role="userRole" />
        <InventoryTab   v-if="activeTab === 'inventory'" :user-role="userRole" />
        <OrdersTab      v-if="activeTab === 'orders'"   :user-role="userRole" />
        <PaymentsTab    v-if="activeTab === 'payments'" />
        <SupportTab     v-if="activeTab === 'support'"  :user-role="userRole" />
        <UsersTab       v-if="activeTab === 'users'"    :user-role="userRole" />
        <SettingsTab    v-if="activeTab === 'settings'" :user-role="userRole" />
        <AuditLogsTab   v-if="activeTab === 'auditLogs'" />
        <NewTab         v-if="activeTab === 'newtab'" />
      </main>

      <div class="mobile-bottom-spacer"></div>
    </div>

    <nav class="mobile-tabbar">
      <button
        v-for="t in primaryTabs" :key="t.id"
        :class="['tab-item', { active: activeTab === t.id }]"
        @click="setTab(t.id)"
      >
        <span class="tab-icon-wrap">
          <span class="tab-icon">{{ t.icon }}</span>
          <span v-if="t.badge" class="tab-dot"></span>
        </span>
        <span class="tab-label">{{ t.label }}</span>
      </button>

      <button class="tab-item" :class="{ active: moreOpen }" @click="moreOpen = true">
        <span class="tab-icon-wrap"><span class="tab-icon">⋯</span></span>
        <span class="tab-label">More</span>
      </button>
    </nav>

    <Transition name="fade">
      <div v-if="moreOpen" class="sheet-overlay" @click.self="moreOpen = false">
        <div class="sheet">
          <div class="sheet-header">
            <span>Menu</span>
            <button class="sheet-close" @click="moreOpen = false">✕</button>
          </div>
          <button
            v-for="t in secondaryTabs" :key="t.id"
            :class="['sheet-row', { active: activeTab === t.id }]"
            @click="setTab(t.id)"
          >
            <span class="sheet-icon">{{ t.icon }}</span>
            <span>{{ t.label }}</span>
          </button>
          <div class="sheet-sep"></div>
          <button class="sheet-row sheet-danger" @click="handleLogout">
            <span class="sheet-icon">⏻</span>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

/* ════════════ MINIMALIST DESIGN TOKENS ════════════ */
.shell {
  --bg:        #FFFFFF;
  --surface:   #FFFFFF;
  --border:    #F0F0F0;
  --ink:       #111111;
  --ink-soft:  #888888;
  --ink-faint: #CCCCCC;
  --accent:    #000000;   
  --danger:    #D32F2F;

  padding-top: 60px;          
  display: flex;
  min-height: 100vh;
  background: var(--bg);
  font-family: 'Inter', -apple-system, sans-serif;
  color: var(--ink);
}

.loading-screen { display:flex; flex-direction:column; gap:14px; align-items:center; justify-content:center; height:100vh; color:var(--ink-soft); font-size: 14px; font-weight:500; }
.spinner { width:24px; height:24px; border:2px solid var(--border); border-top-color:var(--ink); border-radius:50%; animation:spin .8s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }

/* ════════════ MINIMALIST RAIL ════════════ */
.rail {
  width: 220px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px 24px;
  position: sticky;
  top: 60px;
  height: calc(100vh - 60px);
}
.rail-brand { padding-left: 8px; }
.brand-mark { color: var(--ink); font-weight: 600; font-size: 0.95rem; letter-spacing: -0.2px; }

.rail-nav { display:flex; flex-direction:column; gap:4px; flex:1; width:100%; }
.rail-btn {
  width: 100%; height: 36px;
  border: none; background: transparent; 
  display: flex; align-items: center; justify-content: flex-start;
  padding: 0 8px; gap: 14px;
  cursor: pointer;
  color: var(--ink-soft);
  transition: color .2s ease;
}
.rail-btn:hover { color: var(--ink); }
.rail-btn.active { color: var(--ink); font-weight: 600; }

.rail-icon { font-size: 1.05rem; display: flex; align-items: center; justify-content: center; width: 20px; opacity: 0.7; }
.rail-btn.active .rail-icon { opacity: 1; }
.rail-label { font-size: 13px; font-weight: 500; }

.rail-badge { margin-left: auto; color: var(--danger); font-size: 12px; font-weight: 600; }
.rail-sep { width: 100%; height: 1px; background: var(--border); margin: 16px 0; }
.rail-logout { color: var(--ink-faint); margin-top: auto; }
.rail-logout:hover { color: var(--danger); }

/* ════════════ MAIN COLUMN & TOPBAR ════════════ */
.main-column { flex: 1; display:flex; flex-direction:column; min-width:0; }

.topbar { display: flex; align-items: center; justify-content: space-between; padding: 40px 48px 32px; }
.topbar-title h1 { margin:0; font-size:1.4rem; font-weight:500; letter-spacing:-0.5px; color:var(--ink); }

.topbar-meta { display:flex; align-items:center; gap:24px; }
.clean-chip { display:inline-flex; align-items:center; gap:8px; font-size:12px; font-weight:500; color:var(--ink-soft); }
.chip-dot { width:6px; height:6px; border-radius:50%; background: var(--ink-faint); display:inline-block; }
.clean-chip.super .chip-dot { background: var(--danger); }
.cod-status { color: var(--ink-soft); }
.cod-status .chip-dot { background: #4CAF50; }
.cod-status.off .chip-dot { background: var(--danger); }

.workspace { padding: 0 48px 64px; flex:1; }
.mobile-bottom-spacer { display:none; }
.mobile-tabbar { display: none; }

/* ════════════ MOBILE "MORE" OVERLAY ════════════ */
.sheet-overlay { position: fixed; inset: 0; z-index: 400; background: rgba(0,0,0,0.1); backdrop-filter: blur(2px); display:flex; align-items:center; justify-content: center; }
.sheet { width: 90%; max-width: 320px; background: var(--surface); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; box-shadow: 0 10px 40px rgba(0,0,0,0.08); border: 1px solid var(--border); }
.sheet-header { display:flex; justify-content:space-between; align-items:center; padding:8px 8px 24px; font-weight:500; font-size:14px; color:var(--ink-soft); }
.sheet-close { border:none; background:transparent; font-size:16px; color:var(--ink-soft); cursor:pointer; }
.sheet-row { display:flex; align-items:center; gap:16px; width:100%; border:none; background:transparent; padding:12px 8px; font-size:14px; font-weight:500; color:var(--ink-soft); text-align:left; cursor:pointer; }
.sheet-row.active { color:var(--ink); font-weight:600; }
.sheet-icon { width:20px; text-align:center; font-size:1.1rem; opacity: 0.7; }
.sheet-row.active .sheet-icon { opacity: 1; }
.sheet-sep { height:1px; background:var(--border); margin:12px 0; }
.sheet-danger:hover { color: var(--danger); }

.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ════════════ RESPONSIVE (MOBILE) ════════════ */
@media (max-width: 900px) {
  .rail { display: none; } 

  .topbar { padding: 24px 20px 24px; flex-direction: column; align-items: flex-start; gap: 12px; }
  .topbar-title h1 { font-size: 1.2rem; }
  .workspace { padding: 0 20px 90px; }   
  .mobile-bottom-spacer { display: block; height: 70px; }

  .mobile-tabbar {
    display: flex; position: fixed; bottom: 0; left: 0; right: 0; z-index: 300; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); border-top: 1px solid var(--border); padding: 12px 8px calc(12px + env(safe-area-inset-bottom, 0px)); justify-content: space-around;
  }
  .tab-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; background: transparent; border: none; cursor: pointer; color: var(--ink-faint); }
  .tab-icon-wrap { position: relative; }
  .tab-icon { font-size: 1.1rem; line-height: 1; opacity: 0.8; }
  .tab-dot { position:absolute; top:-2px; right:-4px; width:6px; height:6px; border-radius:50%; background:var(--danger); }
  .tab-label { font-size: 10px; font-weight: 500; letter-spacing: 0.2px; }
  .tab-item.active { color: var(--ink); }
  .tab-item.active .tab-icon { opacity: 1; }
}
</style>