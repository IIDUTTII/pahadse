<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../../firebase.js'
// ✨ FIXED: Removed orderBy from import as we don't need it for legacy products
import { collection, query, limit, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore'

const props = defineProps({ userRole: { type: String, default: 'user' } })
const router = useRouter()

const searchText = ref('')
const products = ref([])
const loadLimit = ref(6) 
let _unsubProducts = null

// ✨ FIXED PAGINATION LOGIC: 
// Removed orderBy('createdAt') so older products without timestamps still load perfectly!
watch(loadLimit, (newLimit) => {
  if (_unsubProducts) _unsubProducts()
  
  const q = query(collection(db, 'products'), limit(newLimit))
  _unsubProducts = onSnapshot(q, snap => {
    products.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  })
}, { immediate: true })

const filteredProducts = computed(() => {
  if (!searchText.value.trim()) return products.value
  const q = searchText.value.toLowerCase()
  return products.value.filter(p => (p.name && p.name.toLowerCase().includes(q)) || p.id.toLowerCase().includes(q))
})

const goAdd = () => router.push('/admin/product/new')
const goEdit = (p) => router.push(`/admin/product/${p.id}`)

const goPublicView = (p) => {
  const slug = p.name ? p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : 'item'
  window.open(`/product/${slug}--${p.id}`, '_blank')
}

// ✨ SUPERADMIN ONLY TOGGLE WITH WARNING
const handleToggle = async (p) => {
  if (props.userRole !== 'superadmin') {
    alert("❌ ACCESS DENIED: Only SuperAdmins can change the visibility status of a product.")
    return
  }

  const actionText = p.isActive ? "HIDE this product from the public store" : "PUBLISH this product to the public store"
  if (!confirm(`⚠️ SECURITY WARNING: Are you sure you want to ${actionText}?`)) {
    return // User cancelled
  }

  try {
    const newStatus = !p.isActive
    await updateDoc(doc(db, 'products', p.id), { isActive: newStatus })
  } catch(e) {
    alert("Error changing status: " + e.message)
  }
}

const handleDelete = async (id) => {
  if (!confirm('Are you sure you want to permanently delete this product?')) return
  try {
    await deleteDoc(doc(db, 'products', id))
  } catch(e) {
    alert("Error deleting product: " + e.message)
  }
}
</script>

<template>
  <div class="fade-in">
    <div class="ws-head">
      <div><h2 class="ws-title">Products Inventory</h2></div>
      <div class="ws-actions">
        <input v-model="searchText" class="search-input" placeholder="Search name or ID…" />
        <button class="btn-primary" @click="goAdd">+ Add Product</button>
      </div>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="p in filteredProducts" :key="p.id" @click="goPublicView(p)" class="clickable-row">
            <td>
              <div class="item-meta">
                <div class="thumb-cell"><img v-if="p.imageUrls?.[0]" :src="p.imageUrls[0]" class="thumb-img" /></div>
                <div><div class="item-name">{{ p.name }}</div><code class="item-sub">ID: {{ p.id.substring(0,8) }}</code></div>
              </div>
            </td>
            <td>₹{{ p.price }}</td><td>{{ p.stock }}</td>
            <td><span :class="['status-pill', p.isActive ? 'pill-green' : 'pill-amber']">{{ p.isActive ? 'Active' : 'Hidden' }}</span></td>
            
            <td @click.stop> 
              <div class="row-actions">
                
                <button v-if="userRole === 'superadmin'" class="btn-outline" @click="handleToggle(p)">
                  {{ p.isActive ? '👁️ Hide' : '🟢 Publish' }}
                </button>
                <button v-else class="btn-outline disabled-btn" title="SuperAdmin Access Required" @click="handleToggle(p)">
                  🔒 Locked
                </button>

                <button class="btn-edit" @click="goEdit(p)">Edit</button>
                <button v-if="userRole === 'superadmin'" class="btn-del" @click="handleDelete(p.id)">Del</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="load-more-zone">
      <button class="btn-load" @click="loadLimit += 6">↓ Load Next 6 Products</button>
    </div>
  </div>
</template>

<style scoped>
.fade-in { animation: fIn 0.3s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.ws-head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.ws-title { font-size: 1.6rem; font-weight: 800; color: #0F172A; margin: 0; }
.ws-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.search-input { padding: 10px 14px; border: 1px solid #CBD5E1; border-radius: 8px; outline: none; font-family: inherit; font-size: 0.9rem; }
.search-input:focus { border-color: #0F2A1F; }
.btn-primary { background: #0F2A1F; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; white-space: nowrap; }
.table-wrap { background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
.data-table { width: 100%; border-collapse: collapse; text-align: left; }
.data-table th { background: #F8FAFC; padding: 16px; font-size: 0.85rem; font-weight: 800; text-transform: uppercase; color: #475569; border-bottom: 2px solid #E2E8F0; }
.data-table td { padding: 16px; border-bottom: 1px solid #E2E8F0; color: #0F172A; vertical-align: middle; }

.clickable-row { cursor: pointer; transition: background 0.2s; }
.clickable-row:hover { background: #f8fafc; }

.item-meta { display: flex; align-items: center; gap: 12px; }
.thumb-cell { width: 44px; height: 44px; border-radius: 8px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid #E2E8F0; }
.thumb-img { width: 100%; height: 100%; object-fit: cover; }
.item-name { font-weight: 800; font-size: 0.95rem; }
.item-sub { font-size: 0.75rem; color: #64748B; margin-top: 2px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; }
.status-pill { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; }
.pill-green { background: #DCFCE7; color: #15803D; border: 1px solid #BBF7D0; }
.pill-amber { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
.row-actions { display: flex; gap: 8px; }

.btn-outline { background: #ffffff; color: #0f172a; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-weight: 700; cursor: pointer; }
.btn-outline:hover { border-color: #0F2A1F; background: #f8fafc; }

/* ✨ NEW DISABLED BUTTON STYLING */
.disabled-btn { opacity: 0.5; cursor: not-allowed; border-color: #cbd5e1 !important; color: #94a3b8 !important; background: #f1f5f9; }

.btn-edit { background: #F1F5F9; color: #0F172A; border: 1px solid #CBD5E1; padding: 6px 12px; border-radius: 6px; font-weight: 700; cursor: pointer; }
.btn-edit:hover { background: #E2E8F0; }
.btn-del { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; padding: 6px 12px; border-radius: 6px; font-weight: 700; cursor: pointer; }

.load-more-zone { display: flex; justify-content: center; padding: 24px 0; }
.btn-load { background: white; border: 2px solid #cbd5e1; padding: 12px 24px; border-radius: 30px; font-weight: 700; cursor: pointer; color: #0f172a; transition: 0.2s; }
.btn-load:hover { border-color: #0F2A1F; color: #0F2A1F; }
</style>