<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../../firebase.js'
import {
  fetchUserRole, logoutUser, subscribeToProducts, subscribeToOrders,
  subscribeToSupportChats, fetchGatewayConfig, fetchAllUsersFromDb, fetchCoupons
} from '../db.js'

import ProductsTab from './ProductsTab.vue'
import OrdersTab from './OrdersTab.vue'
import UsersTab from './UsersTab.vue'
import SupportTab from './SupportTab.vue'
import AuditLogsTab from './AuditLogsTab.vue'
import SettingsTab from './SettingsTab.vue'
import AnalyticsTab from './AnalyticsTab.vue'
import NewTab from './newtab.vue'

defineOptions({ name: 'AdminDashboard' })
const router = useRouter()

const activeTab   = ref('products')
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

onMounted(() => {
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

// Pending support count → small badge on the rail/tab-bar
const openSupportCount = computed(() =>
  supportThreads.value.filter(t => t.status !== 'closed' && t.status !== 'resolved').length
)

// ✨ FIX: Using standard Emojis instead of confusing shapes
const primaryTabs = computed(() => {
  const tabs = [
    { id: 'analytics', label: 'Overview', icon: '📊' },
    { id: 'products',  label: 'Inventory', icon: '📦' },
    { id: 'orders',    label: 'Orders',   icon: '🛒' },
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
      <div class="rail-brand" :title="userRole === 'superadmin' ? 'SuperAdmin' : 'Admin'">
        <span class="brand-mark">🏔️ PahadSe</span>
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
          <span class="role-chip" :class="{ super: userRole === 'superadmin' }">
            <i class="chip-dot"></i>{{ userRole === 'superadmin' ? 'SuperAdmin' : 'Admin' }}
          </span>
        </div>
        <div class="topbar-meta">
          <span class="cod-status" :class="{ off: !isCodActive }">
            COD {{ isCodActive ? 'live' : 'paused' }}
          </span>
        </div>
      </header>

      <main class="workspace">
        <AnalyticsTab v-if="activeTab === 'analytics'" />
        <ProductsTab  v-if="activeTab === 'products'" :user-role="userRole" />
        <OrdersTab    v-if="activeTab === 'orders'"   :user-role="userRole" />
        <SupportTab   v-if="activeTab === 'support'"  :user-role="userRole" />
        <UsersTab     v-if="activeTab === 'users'"    :user-role="userRole" />
        <SettingsTab  v-if="activeTab === 'settings'" :user-role="userRole" />
        <AuditLogsTab v-if="activeTab === 'auditLogs'" />
        <NewTab       v-if="activeTab === 'newtab'" />
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

    <Transition name="sheet">
      <div v-if="moreOpen" class="sheet-overlay" @click.self="moreOpen = false">
        <div class="sheet">
          <div class="sheet-handle"></div>
          <div class="sheet-header">
            <span>More Options</span>
            <button class="sheet-close" @click="moreOpen = false">✕</button>
          </div>
          <button
            v-for="t in secondaryTabs" :key="t.id"
            :class="['sheet-row', { active: activeTab === t.id }]"
            @click="setTab(t.id)"
          >
            <span class="sheet-icon">{{ t.icon }}</span>
            <span>{{ t.label }}</span>
            <span v-if="activeTab === t.id" class="sheet-check">✓</span>
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
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

/* ════════════ DESIGN TOKENS ════════════ */
.shell {
  --bg:        #FAFAF9;
  --surface:   #FFFFFF;
  --border:    #E7E5E2;
  --ink:       #1C1C1A;
  --ink-soft:  #6B6862;
  --ink-faint: #A6A39C;
  --accent:    #3D5A40;   
  --accent-soft: #EEF2EC;
  --danger:    #B3261E;
  --danger-soft: #FBEAE9;
  --radius:    14px;

  padding-top: 80px;          
  display: flex;
  min-height: 100vh;
  background: var(--bg);
  font-family: 'DM Sans', sans-serif;
  color: var(--ink);
}

.loading-screen { display:flex; flex-direction:column; gap:14px; align-items:center; justify-content:center; height:100vh; color:#3D5A40; font-weight:600; }
.spinner { width:34px; height:34px; border:3px solid #E7E5E2; border-top-color:#3D5A40; border-radius:50%; animation:spin .8s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }

/* ✨ EXPANDED DESKTOP SIDEBAR RAIL WITH TEXT */
.rail {
  width: 240px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  padding: 24px 16px;
  position: sticky;
  top: 80px;
  height: calc(100vh - 80px);
}
.rail-brand { margin-bottom: 12px; padding: 0 12px; }
.brand-mark { color: var(--ink); font-weight: 800; font-size: 1.3rem; font-family: 'Cinzel', serif; letter-spacing: -0.5px;}

.rail-nav { display:flex; flex-direction:column; gap:6px; flex:1; width:100%; }
.rail-btn {
  width: 100%; height: 44px;
  border: none; background: transparent; border-radius: 8px;
  display: flex; align-items: center; justify-content: flex-start;
  padding: 0 12px; gap: 12px;
  cursor: pointer; position: relative;
  color: var(--ink-soft);
  transition: background .15s, color .15s;
}
.rail-btn:hover { background: #F2F1EE; color: var(--ink); }
.rail-btn.active { background: var(--accent-soft); color: var(--accent); }

.rail-icon { font-size: 1.2rem; display: flex; align-items: center; justify-content: center; width: 24px; }
.rail-label { font-size: 0.95rem; font-weight: 700; }

.rail-badge { margin-left: auto; background: var(--danger); color: white; font-size: 0.75rem; padding: 2px 8px; border-radius: 12px; font-weight: 800; }
.rail-sep { width: 100%; height: 1px; background: var(--border); margin: 8px 0; }
.rail-logout { color: var(--danger); margin-top: auto; }
.rail-logout:hover { background: var(--danger-soft); color: var(--danger); }

/* ════════════ MAIN COLUMN ════════════ */
.main-column { flex: 1; display:flex; flex-direction:column; min-width:0; }

.topbar { display: flex; align-items: center; justify-content: space-between; padding: 28px 36px 20px; }
.topbar-title { display:flex; align-items:baseline; gap:14px; flex-wrap:wrap; }
.topbar-title h1 { margin:0; font-size:1.5rem; font-weight:800; letter-spacing:-0.3px; color:var(--ink); }
.role-chip { display:inline-flex; align-items:center; gap:6px; font-size:.74rem; font-weight:700; color:var(--ink-soft); background:var(--surface); border:1px solid var(--border); padding:4px 11px; border-radius:20px; }
.role-chip.super { color:var(--danger); border-color:#F1D4D2; background:var(--danger-soft); }
.chip-dot { width:6px; height:6px; border-radius:50%; background: var(--accent); display:inline-block; }
.role-chip.super .chip-dot { background: var(--danger); }

.topbar-meta { display:flex; align-items:center; gap:10px; }
.cod-status { font-size:.78rem; font-weight:700; color:var(--accent); background:var(--accent-soft); padding:5px 12px; border-radius:20px; }
.cod-status.off { color:var(--danger); background:var(--danger-soft); }

.workspace { padding: 4px 36px 48px; flex:1; }
.mobile-bottom-spacer { display:none; }

.mobile-tabbar { display: none; }

/* ════════════ MOBILE "MORE" SHEET ════════════ */
.sheet-overlay { position: fixed; inset: 0; z-index: 400; background: rgba(28,28,26,0.4); display:flex; align-items:flex-end; }
.sheet { width: 100%; background: var(--surface); border-radius: 20px 20px 0 0; padding: 10px 8px 28px; display: flex; flex-direction: column; max-height: 70vh; }
.sheet-handle { width:36px; height:4px; background:var(--border); border-radius:4px; margin:4px auto 12px; }
.sheet-header { display:flex; justify-content:space-between; align-items:center; padding:4px 14px 12px; font-weight:800; font-size:.95rem; color:var(--ink); }
.sheet-close { border:none; background:#F2F1EE; width:28px; height:28px; border-radius:50%; font-size:.8rem; color:var(--ink-soft); cursor:pointer; }
.sheet-row { display:flex; align-items:center; gap:14px; width:100%; border:none; background:transparent; padding:14px 16px; border-radius:12px; font-size:.95rem; font-weight:600; color:var(--ink); text-align:left; cursor:pointer; }
.sheet-row:active { background:#F2F1EE; }
.sheet-row.active { background:var(--accent-soft); color:var(--accent); }
.sheet-icon { width:22px; text-align:center; font-size:1.05rem; }
.sheet-check { margin-left:auto; color:var(--accent); font-weight:800; }
.sheet-sep { height:1px; background:var(--border); margin:8px 14px; }
.sheet-danger { color: var(--danger); }
.sheet-danger:active { background: var(--danger-soft); }

.sheet-enter-active, .sheet-leave-active { transition: opacity .22s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-active .sheet, .sheet-leave-active .sheet { transition: transform .25s cubic-bezier(.2,.8,.2,1); }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(100%); }

/* ════════════ RESPONSIVE (MOBILE) ════════════ */
@media (max-width: 900px) {
  .rail { display: none; } /* Hide desktop sidebar completely */

  .topbar { padding: 20px 18px 14px; }
  .topbar-title h1 { font-size: 1.25rem; }
  .workspace { padding: 0 18px 90px; }   
  .mobile-bottom-spacer { display: block; height: 76px; }

  .mobile-tabbar {
    display: flex; position: fixed; bottom: 0; left: 0; right: 0; z-index: 300; background: var(--surface); border-top: 1px solid var(--border); padding: 8px 6px calc(8px + env(safe-area-inset-bottom, 0px)); justify-content: space-around; box-shadow: 0 -2px 12px rgba(0,0,0,0.04);
  }
  .tab-item { flex: 1; max-width: 84px; display: flex; flex-direction: column; align-items: center; gap: 3px; background: transparent; border: none; cursor: pointer; color: var(--ink-faint); padding: 4px 0 2px; }
  .tab-icon-wrap { position: relative; }
  .tab-icon { font-size: 1.2rem; line-height: 1; }
  .tab-dot { position:absolute; top:-2px; right:-6px; width:7px; height:7px; border-radius:50%; background:var(--danger); border:1.5px solid var(--surface); }
  .tab-label { font-size: .66rem; font-weight: 700; letter-spacing: .1px; }
  .tab-item.active { color: var(--accent); }
}
</style>