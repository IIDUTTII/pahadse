<script setup>
/**
 * Admin.vue — Premium Management Workspace Console
 * Updates: Synced routing mechanics to use organic text name slugs.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../../firebase.js'
import { collection, onSnapshot } from 'firebase/firestore'
import {
  fetchUserRole,
  updateProduct,
  deleteProduct,
  logoutUser,
  fetchAllUsersFromDb,
  updateUserRoleInDb
} from '../db.js'

defineOptions({ name: 'Admin' })
const router = useRouter()

// ── NAVIGATION & ROLES ──
const activeTab = ref('products'), userRole = ref('user'), text = ref(''), selectedCategory = ref('All')
const products = ref([]), usersList = ref([]), pendingActiveChanges = ref({})
let _unsubscribeProducts = null

const filteredProducts = computed(() => {
  let result = products.value
  if (selectedCategory.value !== 'All') result = result.filter(p => p.category === selectedCategory.value)
  if (text.value.trim()) {
    const q = text.value.toLowerCase()
    result = result.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
  }
  return result
})

const totalProductViews = computed(() => products.value.reduce((acc, p) => acc + (p.viewCount || 0), 0))
const lowestStockItems = computed(() => [...products.value].sort((a, b) => (a.stock || 0) - (b.stock || 0)).slice(0, 4))
const itemsUnderPromotion = computed(() => products.value.filter(p => p.discount?.isDiscounted).length)

// 🏔️ Uniform URL Slugifier making routes highly readable
const generateProductSlugUrl = (productItem) => {
  if (!productItem?.name) return 'product'
  const slug = productItem.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
  window.sessionStorage.setItem(`slug_map_${slug}`, productItem.id) // Map back to actual Document ID
  return slug
}

onMounted(async () => {
  userRole.value = await fetchUserRole()
  _unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
    products.value = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  })
  try { usersList.value = await fetchAllUsersFromDb() } catch (err) { console.error(err) }
})

onUnmounted(() => { if (_unsubscribeProducts) _unsubscribeProducts() })

const routeToAddNewProduct = () => router.push('/admin/product/new')
const routeToEditProduct = (productItem) => router.push(`/admin/product/${generateProductSlugUrl(productItem)}`)

const handleDelete = async (id) => {
  if (userRole.value !== 'superadmin') { alert('Action Denied: Only superadmins can delete products.'); return }
  if (!confirm('Permanently delete this product from the database?')) return
  try { await deleteProduct(id) } catch (e) { alert('Delete failed: ' + e.message) }
}

const getStagedActive = (product) => pendingActiveChanges.value[product.id] ?? product.isActive
const stageActiveChange = (product, newVal) => { pendingActiveChanges.value = { ...pendingActiveChanges.value, [product.id]: newVal } }
const hasPendingChange = (product) => product.id in pendingActiveChanges.value && pendingActiveChanges.value[product.id] !== product.isActive

const saveActiveChange = async (product) => {
  if (userRole.value !== 'superadmin') { alert('Only superadmins can change live status.'); return }
  try {
    const newVal = pendingActiveChanges.value[product.id]
    await updateProduct(product.id, { isActive: newVal })
    const copy = { ...pendingActiveChanges.value }; delete copy[product.id]; pendingActiveChanges.value = copy
  } catch (e) { alert('Failed to update status: ' + e.message) }
}
const discardActiveChange = (product) => { const copy = { ...pendingActiveChanges.value }; delete copy[product.id]; pendingActiveChanges.value = copy }

const handleRoleAlteration = async (userId, targetRole) => {
  try { await updateUserRoleInDb(userId, targetRole); alert('Clearance muted successfully.') } catch (e) { alert(e.message) }
}
const handleLogout = async () => { if (confirm('Log out?')) { await logoutUser(); router.push('/login') } }
</script>

<template>
  <div class="admin-dashboard-container">
    <header class="top-nav-bar">
      <div class="brand"><span>🏔️</span>{{ userRole === 'superadmin' ? 'PahadSe Superadmin' : 'PahadSe Admin' }}</div>
      <div class="search-box" v-show="activeTab === 'products'"><input v-model="text" placeholder="Search inventory…" /></div>
      <button class="logout-action-btn" @click="handleLogout">Logout</button>
    </header>

    <div class="split-body-wrapper">
      <aside class="sidebar-navigation">
        <button :class="['nav-item', { active: activeTab === 'products' }]" @click="activeTab = 'products'">📦 Products</button>
        <button :class="['nav-item', { active: activeTab === 'analytics' }]" @click="activeTab = 'analytics'">📈 Analytics Metrics</button>
        <button :class="['nav-item', { active: activeTab === 'users' }]" @click="activeTab = 'users'">👥 Users Panel</button>
      </aside>

      <main class="main-workspace-view">
        <div v-if="activeTab === 'products'" class="fade-in">
          <div class="header-row">
            <div><h2 class="workspace-title">Inventory Control Matrix</h2><p class="subtitle">{{ filteredProducts.length }} items cataloged</p></div>
            <div class="header-actions">
              <select v-model="selectedCategory" class="category-filter">
                <option value="All">All Categories</option><option>Spices & Herbs</option><option>Ghee & Oils</option><option>Organic Sweets</option><option>Himalayan Teas</option><option>Juices</option><option>Sweets</option>
              </select>
              <button class="add-product-btn" @click="routeToAddNewProduct">➕ Add Product</button>
            </div>
          </div>

          <div class="table-wrapper">
            <table class="product-table">
              <thead><tr><th>Item Details</th><th>Status / Stock</th><th>Pricing</th><th>Live Status</th><th>Actions</th></tr></thead>
              <tbody>
                <tr v-for="product in filteredProducts" :key="product.id" :class="{ 'inactive-row': !product.isActive }">
                  <td>
                    <div class="item-meta">
                      <div class="emoji-cell">
                        <img v-if="product.imageUrls?.find(u => u?.trim())" :src="product.imageUrls.find(u => u?.trim())" class="row-thumb-img" />
                        <span v-else>{{ product.emoji }}</span>
                      </div>
                      <div><strong>{{ product.name }}</strong><span class="weight-badge" v-if="product.weight">{{ product.weight }}</span><p class="desc">{{ product.category }}</p></div>
                    </div>
                  </td>
                  <td><span :class="['status-dot', product.isActive ? 'active' : 'offline']"></span>{{ product.isActive ? 'Active' : 'Offline' }}<p class="desc">Stock Metrics: {{ product.stock }}</p></td>
                  <td><div class="price-block">₹{{ product.price }} <span v-if="product.discount?.isDiscounted" class="discount-tag">-{{ product.discount.percent }}%</span></div></td>
                  <td>
                    <div class="toggle-cell">
                      <label class="toggle-switch"><input type="checkbox" :checked="getStagedActive(product)" :disabled="userRole !== 'superadmin'" @change="stageActiveChange(product, $event.target.checked)" /><span class="slider"></span></label>
                      <span class="toggle-label">{{ getStagedActive(product) ? 'Live Visibility' : 'Hidden Block' }}</span>
                      <div v-if="hasPendingChange(product)" class="toggle-save-row"><button class="save-toggle-btn" @click="saveActiveChange(product)">Save</button><button class="discard-toggle-btn" @click="discardActiveChange(product)">✕</button></div>
                    </div>
                  </td>
                  <td><div class="actions"><button class="edit-action" @click="routeToEditProduct(product)">Edit</button><button v-if="userRole === 'superadmin'" class="delete-action" @click="handleDelete(product.id)">Del</button></div></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="activeTab === 'users'" class="fade-in">
          <h2 class="workspace-title">System Users Authority Matrix</h2>
          <div class="table-wrapper">
            <table class="product-table">
              <thead><tr><th>User ID Hash</th><th>Username Name</th><th>Email Registry Node</th><th>Assigned Clearance Role</th><th>Modify Privileges</th></tr></thead>
              <tbody>
                <tr v-for="user in usersList" :key="user.id">
                  <td><code class="user-hash-tag">{{ user.id?.substring(0,8) }}...</code></td>
                  <td><span class="user-meta-txt-bold">{{ user.name || 'Anonymous Actor' }}</span></td>
                  <td><span class="user-email-tag">{{ user.email || 'N/A' }}</span></td>
                  <td><span :class="['role-pill-badge', user.role || 'user']">{{ user.role ? user.role.toUpperCase() : 'USER' }}</span></td>
                  <td>
                    <div class="role-action-wrap">
                      <select v-if="userRole === 'superadmin'" :value="user.role || 'user'" @change="handleRoleAlteration(user.id, $event.target.value)" class="role-selector-dropdown"><option value="user">USER</option><option value="admin">ADMIN</option><option value="superadmin">SUPERADMIN</option></select>
                      <span v-else class="locked-meta-indicator">🔒 Restricted</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="activeTab === 'analytics'" class="fade-in">
          <h2 class="workspace-title">Harvest System Analytics Metrics</h2>
          <div class="analytics-stat-grid">
            <div class="stat-card-node"><div class="stat-label">Total Product View Traffic</div><div class="stat-value text-green">{{ totalProductViews }}</div></div>
            <div class="stat-card-node"><div class="stat-label">Active Marketplace Catalog</div><div class="stat-value">{{ products.length }}</div></div>
            <div class="stat-card-node"><div class="stat-label">Active Promotions Running</div><div class="stat-value text-orange">{{ itemsUnderPromotion }}</div></div>
            <div class="stat-card-node"><div class="stat-label">Total Registered Consumer Profiles</div><div class="stat-value">{{ usersList.length }}</div></div>
          </div>
          <div class="analytics-sub-columns">
            <div class="dashboard-panel-card"><h3>🚨 Warehouse Refill Alerts</h3><div class="panel-list"><div v-for="item in lowestStockItems" :key="item.id" class="panel-list-row"><div class="panel-row-name"><span>{{ item.emoji }}</span><strong>{{ item.name }}</strong></div><span :class="['stock-badge-pill', item.stock === 0 ? 'empty' : item.stock <= 5 ? 'critical' : 'warning']">{{ item.stock }} left</span></div></div></div>
            <div class="dashboard-panel-card"><h3>🔥 Most Viewed Items</h3><div class="panel-list"><div v-for="item in [...products].sort((a,b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 4)" :key="item.id" class="panel-list-row"><div class="panel-row-name"><span>{{ item.emoji }}</span><strong>{{ item.name }}</strong></div><span class="views-metric-pill">👁️ {{ item.viewCount || 0 }} views</span></div></div></div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-dashboard-container { display: flex; flex-direction: column; min-height: 100vh; padding-top: 60px; box-sizing: border-box; font-family: system-ui, sans-serif; background-color: #f8fafc; color: #0f172a; }
.top-nav-bar { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 1% 3%; border-bottom: 2px solid #cbd5e1; flex-wrap: wrap; gap: 12px; }
.brand { font-weight: 800; font-size: 1.2rem; color: #15803d; display: flex; align-items: center; gap: 8px; }
.search-box { flex: 1; max-width: 350px; }
.search-box input { width: 100%; padding: 10px 16px; border: 2px solid #cbd5e1; border-radius: 30px; background: #f8fafc; outline: none; box-sizing: border-box; }
.logout-action-btn { background: transparent; color: #dc2626; border: 2px solid #dc2626; padding: 8px 16px; border-radius: 30px; cursor: pointer; font-weight: 600; }
.logout-action-btn:hover { background: #dc2626; color: #fff; }
.split-body-wrapper { display: flex; flex: 1; background: #e2e8f0; }
.sidebar-navigation { width: 220px; background: #fff; padding: 24px 12px; display: flex; flex-direction: column; gap: 8px; border-right: 2px solid #cbd5e1; }
.nav-item { background: transparent; border: none; color: #475569; text-align: left; padding: 12px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; }
.nav-item:hover { background: #f1f5f9; color: #15803d; }
.nav-item.active { background: #15803d; color: #fff; }
.main-workspace-view { flex: 1; padding: 2%; overflow-x: hidden; }
.fade-in { animation: fadeIn .25s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.header-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.workspace-title { margin: 0; font-size: 1.8rem; font-weight: 700; color: #15803d; }
.subtitle { margin: 4px 0 0; color: #475569; font-size: 1rem; }
.header-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.category-filter { padding: 10px 16px; border: 2px solid #cbd5e1; border-radius: 30px; background: #fff; font-size: .95rem; font-weight: 600; cursor: pointer; outline: none; }
.add-product-btn { background: #15803d; color: #fff; border: none; padding: 12px 24px; border-radius: 30px; cursor: pointer; font-weight: 600; font-size: 1rem; box-shadow: 0 4px 12px rgba(21,128,61,.3); }
.add-product-btn:hover { background: #166534; transform: translateY(-2px); }
.table-wrapper { background: #fff; border-radius: 12px; border: 2px solid #cbd5e1; overflow-x: auto; }
.product-table { width: 100%; border-collapse: collapse; min-width: 560px; }
.product-table th { background: #f8fafc; color: #0f172a; text-align: left; padding: 14px; font-weight: 700; font-size: .85rem; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
.product-table td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
.inactive-row td { opacity: .5; background: #f8fafc; }
.item-meta { display: flex; align-items: center; gap: 12px; }
.emoji-cell { font-size: 1.8rem; background: #f1f5f9; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid #cbd5e1; overflow: hidden; }
.row-thumb-img { width: 100%; height: 100%; object-fit: cover; }
.weight-badge { background: #e2e8f0; font-size: .75rem; padding: 2px 6px; border-radius: 4px; margin-left: 6px; color: #475569; font-weight: 600; }
.desc { margin: 4px 0 0; font-size: .85rem; color: #475569; }
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.status-dot.active { background: #10b981; }
.status-dot.offline { background: #94a3b8; }
.discount-tag { background: #fef08a; color: #854d0e; font-size: .75rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 4px; }
.price-block { font-weight: 600; display: flex; align-items: center; }
.toggle-cell { display: flex; flex-direction: column; gap: 6px; }
.toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background: #cbd5e1; border-radius: 24px; transition: .3s; }
.slider::before { content: ''; position: absolute; width: 18px; height: 18px; left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: .3s; }
input:checked + .slider { background: #15803d; }
input:checked + .slider::before { transform: translateX(20px); }
.toggle-label { font-size: .8rem; font-weight: 700; color: #475569; }
.toggle-save-row { display: flex; gap: 5px; }
.save-toggle-btn { background: #15803d; color: #fff; border: none; padding: 4px 10px; border-radius: 6px; font-size: .78rem; font-weight: 700; }
.discard-toggle-btn { background: #f1f5f9; color: #dc2626; border: 1px solid #fecaca; padding: 4px 8px; border-radius: 6px; font-size: .78rem; }
.actions { display: flex; gap: 6px; }
.edit-action, .delete-action { background: #f8fafc; border: 2px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: .85rem; font-weight: 600; }
.edit-action:hover { border-color: #15803d; color: #15803d; background: #f0fdf4; }
.delete-action { color: #dc2626; }
.delete-action:hover { border-color: #dc2626; color: #fff; background: #dc2626; }
.user-hash-tag { background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-family: monospace; }
.user-meta-txt-bold { font-weight: 700; }
.user-email-tag { color: #475569; font-size: 0.9rem; }
.role-pill-badge { display: inline-block; padding: 4px 10px; font-size: 0.75rem; font-weight: 800; border-radius: 20px; }
.role-pill-badge.superadmin { background-color: #fef3c7; color: #d97706; }
.role-pill-badge.admin { background-color: #dcfce7; color: #15803d; }
.role-pill-badge.user { background-color: #f1f5f9; color: #475569; }
.role-selector-dropdown { padding: 6px 12px; font-size: 0.85rem; font-weight: 600; border-radius: 6px; border: 2px solid #cbd5e1; }
.locked-meta-indicator { font-size: 0.85rem; color: #64748b; font-style: italic; }
.analytics-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 32px; }
.stat-card-node { background-color: #ffffff; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; }
.stat-label { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: #64748b; }
.stat-value { font-size: 2.2rem; font-weight: 900; margin: 8px 0 4px; }
.stat-value.text-green { color: #15803d; }
.stat-value.text-orange { color: #d97706; }
.stat-subtext { margin: 0; font-size: 0.8rem; color: #64748b; }
.analytics-sub-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.dashboard-panel-card { background: #ffffff; border: 2px solid #cbd5e1; border-radius: 12px; padding: 24px; }
.dashboard-panel-card h3 { margin: 0 0 16px 0; font-size: 1.1rem; font-weight: 800; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; }
.panel-list { display: flex; flex-direction: column; gap: 12px; }
.panel-list-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
.panel-row-name { display: flex; align-items: center; gap: 10px; }
.stock-badge-pill { padding: 4px 10px; font-size: 0.78rem; font-weight: 800; border-radius: 6px; }
.stock-badge-pill.empty { background-color: #fef2f2; color: #dc2626; }
.stock-badge-pill.critical { background-color: #fff7ed; color: #c2410c; }
.stock-badge-pill.warning { background-color: #fef9c3; color: #a16207; }
.views-metric-pill { font-size: 0.82rem; font-weight: 700; color: #15803d; background: #f0fdf4; padding: 4px 10px; border-radius: 6px; }
@media (max-width: 768px) { .split-body-wrapper { flex-direction: column; } .sidebar-navigation { width: 100%; flex-direction: row; overflow-x: auto; padding: 12px; border-bottom: 2px solid #cbd5e1; } .nav-item { flex: 1; text-align: center; } .main-workspace-view { padding: 16px 12px; } .header-row, .header-actions { flex-direction: column; } .category-filter, .add-product-btn { width: 100%; } }
</style>