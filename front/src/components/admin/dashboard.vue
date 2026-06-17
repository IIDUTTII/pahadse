<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../../firebase.js'
// ✨ IMPORT ALL REQUIRED FUNCTIONS
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
import newtab from './newtab.vue'


defineOptions({ name: 'AdminDashboard' })
const router = useRouter()

// ✨ STATE DECLARATIONS (Yeh sab missing tha)
const activeTab = ref('products')
const userRole = ref('user')
const sidebarOpen = ref(false)
const loading = ref(true)
const isCodActive = ref(true)

const products = ref([])
const ordersList = ref([])
const supportThreads = ref([])
const usersList = ref([])
const coupons = ref([])

// ✨ SUBSCRIPTION CLEANUP VARIABLES
let _unsubProducts = null
let _unsubOrders = null
let _unsubSupport = null

onMounted(() => {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      userRole.value = await fetchUserRole()

      // Subscribe to Products
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
        } catch(e) { console.warn(e) }
      }
      loading.value = false // ✨ Authentication done
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
    await logoutUser(); 
    router.push('/login') 
  }
}



const setTab = (tab) => { 
  activeTab.value = tab; 
  sidebarOpen.value = false; 
}
</script>

<template>
  <div v-if="loading" class="loading-screen">
    <div class="spinner"></div>
    <p>Authenticating Clearance...</p>
  </div>

  <div v-else class="shell">
    
    <aside :class="['sidebar', { 'sidebar-open': sidebarOpen }]">
      <div class="sidebar-head">
        <span class="brand-logo">🏔️</span>
        <div class="brand-text">
          <strong>PahadSe Basecamp</strong>
          <span>Admin Portal</span>
        </div>
      </div>
      
      <div class="nav-group">
        <p class="nav-label">Overview</p>
        <button :class="['nav-btn', { active: activeTab === 'analytics' }]" @click="setTab('analytics')">📊 Analytics</button>
      </div>

      <div class="nav-group">
        <p class="nav-label">Store</p>
        <button :class="['nav-btn', { active: activeTab === 'products' }]" @click="setTab('products')">📦 Inventory</button>
        <button :class="['nav-btn', { active: activeTab === 'orders' }]" @click="setTab('orders')">🛒 Orders</button>
      </div>

      <div class="nav-group">
        <p class="nav-label">Operations</p>
        <button :class="['nav-btn', { active: activeTab === 'support' }]" @click="setTab('support')">💬 Support Desk</button>
        <button :class="['nav-btn', { active: activeTab === 'users' }]" @click="setTab('users')">👥 Users</button>
        <button :class="['nav-btn', { active: activeTab === 'settings' }]" @click="setTab('settings')">⚙️ Settings</button>
        <button :class="['nav-btn',{active: activeTab==='newtab'}]" @click="setTab('newtab')">🆕 New Tab</button>
      </div>
      
      <div v-if="userRole === 'superadmin'" class="nav-group">
        <p class="nav-label">Security</p>
        <button :class="['nav-btn', { active: activeTab === 'auditLogs' }]" @click="setTab('auditLogs')">📜 Audit Logs</button>
      </div>
    </aside>

    <div v-if="sidebarOpen" class="mob-overlay" @click="sidebarOpen = false"></div>

    <div class="main-column">
      
      <header class="admin-topbar">
        <div class="topbar-left">
          <button class="hamburger" @click="sidebarOpen = !sidebarOpen">
            <span></span><span></span><span></span>
          </button>
          <div class="greeting">
            <h2>Welcome back, Admin 👋</h2>
            <p>Here's what's happening with your store today.</p>
          </div>
        </div>

        <div class="topbar-right">
          <div class="admin-badge">
            <span class="pulse-dot"></span>
            {{ userRole === 'superadmin' ? 'SuperAdmin' : 'Admin' }}
          </div>
          <button class="top-btn danger" @click="handleLogout">Logout</button>
        </div>
      </header>

      <main class="workspace">
        <AnalyticsTab v-if="activeTab === 'analytics'" />
        <ProductsTab v-if="activeTab === 'products'" :user-role="userRole" />
        <OrdersTab v-if="activeTab === 'orders'" :user-role="userRole" />
        <SupportTab v-if="activeTab === 'support'" :user-role="userRole" />
        <UsersTab v-if="activeTab === 'users'" :user-role="userRole" />
        <SettingsTab v-if="activeTab === 'settings'" :user-role="userRole" />
        <AuditLogsTab v-if="activeTab === 'auditLogs'" />
        <NewTab v-if="activeTab === 'newtab'" />
      </main>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

/* GLOBAL VARIABLES */
.shell { 
  --bg: #F8FAFC;         /* Softer, modern background */
  --white: #FFFFFF; 
  --border: #E2E8F0; 
  --text-main: #0F172A; 
  --text-muted: #64748B; 
  --premium-green: #0F2A1F; 
  --red: #DC2626; 

  /* 80px clears the global navbar completely */
  padding-top: 80px; 
  display: flex; 
  align-items: flex-start;
  min-height: 100vh; 
  background: var(--bg); 
  font-family: 'DM Sans', sans-serif; 
  color: var(--text-main); 
}

/* LOADING SCREEN */
.loading-screen { display: flex; flex-direction: column; gap: 16px; align-items: center; justify-content: center; height: calc(100vh - 80px); color: var(--premium-green); font-weight: 700; }
.spinner { width: 40px; height: 40px; border: 4px solid #CBD5E1; border-top-color: var(--premium-green); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* 🟢 STICKY SIDEBAR */
.sidebar { 
  width: 260px; 
  background: var(--white); 
  border-right: 1px solid var(--border); 
  padding: 24px 16px; 
  display: flex; 
  flex-direction: column; 
  gap: 24px; 
  flex-shrink: 0;
  /* STICKY LOGIC */
  position: sticky; 
  top: 80px; 
  height: calc(100vh - 80px); 
  overflow-y: auto;
}

.sidebar-head { display: flex; align-items: center; gap: 12px; padding-bottom: 24px; border-bottom: 1px dashed var(--border); padding-left: 8px; }
.brand-logo { font-size: 2rem; }
.brand-text { display: flex; flex-direction: column; }
.brand-text strong { font-weight: 800; font-size: 1.05rem; color: var(--text-main); }
.brand-text span { font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

.nav-group { display: flex; flex-direction: column; gap: 4px; }
.nav-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #94A3B8; margin: 0 0 6px 8px; letter-spacing: 0.5px; }
.nav-btn { background: transparent; border: none; padding: 12px 16px; border-radius: 10px; font-size: 0.95rem; font-weight: 600; text-align: left; cursor: pointer; transition: all 0.2s; color: #475569; display: flex; align-items: center; gap: 8px; }
.nav-btn:hover { background: #F1F5F9; color: var(--premium-green); }
.nav-btn.active { background: var(--premium-green); color: var(--white); box-shadow: 0 4px 12px rgba(15,42,31,0.15); }

/* 🟢 MAIN COLUMN (SCROLLS NORMALLY) */
.main-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* Prevents flex blowout on mobile */
}

/* 🟢 PAGE HEADER (NOT FIXED) */
.admin-topbar { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 32px 40px; 
  background: transparent; /* Blends with background */
}

.topbar-left { display: flex; align-items: center; gap: 20px; }
.hamburger { display: none; flex-direction: column; gap: 5px; border: none; background: #FFFFFF; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; padding: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
.hamburger span { width: 22px; height: 2px; background: var(--text-main); border-radius: 2px; }

.greeting h2 { margin: 0; font-size: 1.8rem; font-weight: 800; color: var(--text-main); letter-spacing: -0.5px; }
.greeting p { margin: 4px 0 0; color: var(--text-muted); font-size: 0.95rem; font-weight: 500; }

.topbar-right { display: flex; align-items: center; gap: 16px; }
.admin-badge { display: flex; align-items: center; gap: 8px; background: #FFFFFF; border: 1px solid var(--border); padding: 8px 16px; border-radius: 20px; font-weight: 800; font-size: 0.85rem; color: var(--text-main); box-shadow: 0 2px 6px rgba(0,0,0,0.02); }
.pulse-dot { width: 8px; height: 8px; background: #16A34A; border-radius: 50%; box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.4); animation: pulse 2s infinite; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); } 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); } }

.top-btn { padding: 8px 16px; border: none; border-radius: 8px; font-weight: 800; cursor: pointer; transition: 0.2s; font-size: 0.9rem; }
.top-btn.danger { background: #FEF2F2; color: var(--red); border: 1px solid #FECACA; }
.top-btn.danger:hover { background: var(--red); color: var(--white); }

/* 🟢 WORKSPACE */
.workspace { 
  padding: 0 40px 60px; /* Sides match topbar, bottom padding to prevent cutoff */
  display: flex;
  flex-direction: column;
}

/* 📱 MOBILE RESPONSIVENESS */
@media (max-width: 900px) {
  .hamburger { display: flex; }
  .greeting p { display: none; }
  .greeting h2 { font-size: 1.4rem; }
  
  .sidebar { 
    position: fixed; 
    top: 80px; 
    left: -280px; /* Hide off-screen */
    width: 260px;
    height: calc(100vh - 80px); 
    z-index: 150; 
    transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
    box-shadow: 10px 0 25px rgba(0,0,0,0.1); 
  }
  .sidebar.sidebar-open { left: 0; }
  
  .mob-overlay { 
    position: fixed; inset: 0; background: rgba(15,23,42,0.6); z-index: 140; 
    top: 80px; backdrop-filter: blur(2px);
  }
  
  .admin-topbar { padding: 24px 20px; flex-direction: column; align-items: flex-start; gap: 20px; }
  .topbar-left { width: 100%; justify-content: flex-start; }
  .topbar-right { width: 100%; justify-content: space-between; }
  
  .workspace { padding: 0 20px 40px; }
}
</style>