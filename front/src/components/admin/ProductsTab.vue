<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { subscribeToProducts, deleteProduct } from '../db.js'

const props = defineProps({
  userRole: { type: String, default: 'user' }
})
const router = useRouter()

const searchText = ref('')
const selectedCategory = ref('All')
const products = ref([])
let _unsubProducts = null

onMounted(() => {
  _unsubProducts = subscribeToProducts(snap => {
    products.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  })
})

onUnmounted(() => {
  if (_unsubProducts) _unsubProducts()
})

const filteredProducts = computed(() => {
  let r = products.value
  if (selectedCategory.value !== 'All') r = r.filter(p => p.category === selectedCategory.value)
  if (searchText.value.trim()) {
    const q = searchText.value.toLowerCase()
    r = r.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
  }
  return r
})

const goAdd = () => router.push('/admin/product/new')
const goEdit = (p) => router.push(`/admin/product/${p.id}`)
const handleDel = async (id) => { 
  if (confirm('Delete this product permanently?')) await deleteProduct(id) 
}
</script>

<template>
  <div class="fade-in">
    <div class="ws-head">
      <div>
        <h2 class="ws-title">Products Inventory</h2>
        <p class="ws-sub">{{ filteredProducts.length }} items listed</p>
      </div>
      <div class="ws-actions">
        <input v-model="searchText" class="search-input" placeholder="Search products…" />
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

    <div class="table-wrap desktop-only">
      <table class="data-table">
        <thead>
          <tr>
            <th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filteredProducts" :key="p.id" :class="{ 'row-inactive': !p.isActive }">
            <td>
              <div class="item-meta">
                <div class="thumb-cell">
                  <img v-if="p.imageUrls?.find(u => u?.trim())" :src="p.imageUrls.find(u => u?.trim())" class="thumb-img" />
                  <span v-else class="thumb-emoji">{{ p.emoji || '📦' }}</span>
                </div>
                <div>
                  <div class="item-name">{{ p.name }}</div>
                  <div class="item-sub">{{ p.weight }} · {{ p.category }}</div>
                </div>
              </div>
            </td>
            <td>₹{{ p.price }} <span v-if="p.discount?.isDiscounted" class="disc-tag">{{ p.discount.percent }}% off</span></td>
            <td :class="{ 'low-stock': p.stock <= 5 }">{{ p.stock }}</td>
            <td><span :class="['status-pill', p.isActive ? 'pill-green' : 'pill-amber']">{{ p.isActive ? 'Active' : 'Inactive' }}</span></td>
            <td>
              <div class="row-actions">
                <button class="btn-edit" @click="goEdit(p)">Edit</button>
                <button v-if="userRole === 'superadmin'" class="btn-del" @click="handleDel(p.id)">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="filteredProducts.length === 0" class="empty-state">No products found.</div>
    </div>

    <div class="mobile-only">
      <div v-for="p in filteredProducts" :key="'mob'+p.id" class="mob-card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <strong>{{p.name}}</strong>
          <span :class="['status-pill', p.isActive ? 'pill-green' : 'pill-amber']">{{ p.isActive ? 'Active' : 'Inactive' }}</span>
        </div>
        <p style="margin:4px 0; color:#64748b; font-size:0.9rem;">₹{{p.price}} | Stock: {{p.stock}}</p>
        <div style="margin-top:10px; display:flex; gap:8px;">
          <button class="btn-edit" @click="goEdit(p)">Edit</button>
          <button v-if="userRole === 'superadmin'" class="btn-del" @click="handleDel(p.id)">Del</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Scoped styles specific to Products Tab */
.fade-in { animation: fIn 0.3s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.ws-head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.ws-title { font-size: 1.6rem; font-weight: 800; color: #0F172A; margin: 0; }
.ws-sub { color: #64748B; font-size: 0.9rem; margin-top: 4px; }
.ws-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.search-input, .select-pill { padding: 10px 14px; border: 1px solid #CBD5E1; border-radius: 8px; outline: none; font-family: inherit; font-size: 0.9rem; }
.search-input:focus { border-color: #0F2A1F; }
.btn-primary { background: #0F2A1F; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; white-space: nowrap; }
.table-wrap { background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
.data-table { width: 100%; border-collapse: collapse; text-align: left; }
.data-table th { background: #F8FAFC; padding: 16px; font-size: 0.85rem; font-weight: 800; text-transform: uppercase; color: #475569; border-bottom: 2px solid #E2E8F0; }
.data-table td { padding: 16px; border-bottom: 1px solid #E2E8F0; color: #0F172A; vertical-align: middle; }
.item-meta { display: flex; align-items: center; gap: 12px; }
.thumb-cell { width: 44px; height: 44px; border-radius: 8px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid #E2E8F0; }
.thumb-img { width: 100%; height: 100%; object-fit: cover; }
.thumb-emoji { font-size: 1.5rem; }
.item-name { font-weight: 800; font-size: 0.95rem; }
.item-sub { font-size: 0.8rem; color: #64748B; margin-top: 2px; }
.row-inactive td { opacity: 0.5; background: #F8FAFC; }
.low-stock { color: #DC2626; font-weight: 800; }
.disc-tag { background: #FEF08A; color: #854D0E; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; font-weight: 800; margin-left: 6px; }
.status-pill { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; }
.pill-green { background: #DCFCE7; color: #15803D; border: 1px solid #BBF7D0; }
.pill-amber { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
.row-actions { display: flex; gap: 8px; }
.btn-edit { background: #F1F5F9; color: #0F172A; border: 1px solid #CBD5E1; padding: 6px 12px; border-radius: 6px; font-weight: 700; cursor: pointer; }
.btn-edit:hover { background: #E2E8F0; }
.btn-del { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; padding: 6px 12px; border-radius: 6px; font-weight: 700; cursor: pointer; }
.empty-state { padding: 40px; text-align: center; color: #64748B; }
.desktop-only { display: block; }
.mobile-only { display: none; }
@media (max-width: 800px) {
  .desktop-only { display: none; }
  .mobile-only { display: flex; flex-direction: column; gap: 12px; }
  .mob-card { background: white; padding: 16px; border-radius: 12px; border: 1px solid #E2E8F0; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
  .ws-head { flex-direction: column; align-items: stretch; }
  .search-input { width: 100%; box-sizing: border-box; }
}
</style>