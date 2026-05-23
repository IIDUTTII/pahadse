<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '../../firebase.js'
import { signOut } from 'firebase/auth'
import { doc, getDoc, collection, onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import {computed } from 'vue'

defineOptions({ name: 'Admin' })
const router = useRouter()

// ── NAVIGATION & ROLE CONTROLS ──
const activeTab = ref('products')
const userRole = ref('user')
const text = ref('') 
const selectedCategory = ref('All')

// ── PRODUCT INVENTORY ENGINE CONTROLS ──
const products = ref([])
const isModalOpen = ref(false)
const isEditing = ref(false)
const currentProductId = ref(null)

// 🏔️ HIMALAYAN BLUEPRINT SCHEMA
const getDefaultForm = () => ({
  name: '',
  description: '',
  price: 0,
  weight: '',
  category: 'Spices & Herbs',
  emoji: '💛',
  stock: 0,
  isActive: true,
  discount: { isDiscounted: false, percent: 0 },
  reviewCount: 0,
  ratingAverage: 0.0,
  createdBy: 'ADMIN_USER',
  imageUrls: [''] // Array to hold multiple image URLs
})

const form = ref(getDefaultForm())

const filteredProducts = computed(() => {
  let result = products.value

  // Filter by Category Dropdown
  if (selectedCategory.value !== 'All') {
    result = result.filter(p => p.category === selectedCategory.value)
  }

  // Filter by Top Search Bar Text (wired up!)
  if (text.value.trim() !== '') {
    const searchQuery = text.value.toLowerCase()
    result = result.filter(p => 
      p.name.toLowerCase().includes(searchQuery) || 
      p.category.toLowerCase().includes(searchQuery)
    )
  }

  return result
})

onMounted(async () => {
  const currentUser = auth.currentUser
  if (currentUser) {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
      if (userDoc.exists() && userDoc.data().role) {
        // Clean up the string to prevent hidden space or casing bugs
        userRole.value = userDoc.data().role.trim().toLowerCase()
      } else {
        userRole.value = 'user' // Baseline safety fallback
      }
    } catch (error) {
      console.error("Error fetching user role:", error)
      userRole.value = 'user' // Safe fallback on network failure
    }
  }

  // Stream product inventory live from Cloud Firestore
  onSnapshot(collection(db, 'products'), (snapshot) => {
    products.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  })
})

// ── DYNAMIC IMAGE ARRAY CONTROLS ──
const addImageUrl = () => form.value.imageUrls.push('')
const removeImageUrl = (index) => form.value.imageUrls.splice(index, 1)

// ── MODAL TOGGLE CODES ──
const openAddModal = () => {
  isEditing.value = false
  currentProductId.value = null
  form.value = getDefaultForm()
  isModalOpen.value = true
}

const openEditModal = (product) => {
  isEditing.value = true
  currentProductId.value = product.id
  // Merge existing product with defaults to prevent nested null errors
  form.value = {
    ...getDefaultForm(),
    ...product,
    discount: product.discount || { isDiscounted: false, percent: 0 },
    imageUrls: product.imageUrls?.length ? [...product.imageUrls] : ['']
  }
  isModalOpen.value = true
}

// ── DATABASE WRITE CODES (Create / Update) ──
const handleSubmit = async () => {
  // Clean up empty image URLs before saving
  const cleanedImageUrls = form.value.imageUrls.filter(url => url.trim() !== '')

  const payload = {
    name: form.value.name,
    description: form.value.description,
    price: Number(form.value.price),
    weight: form.value.weight,
    category: form.value.category,
    emoji: form.value.emoji,
    stock: Number(form.value.stock),
    isActive: form.value.isActive,
    discount: {
      isDiscounted: form.value.discount.isDiscounted,
      percent: Number(form.value.discount.percent)
    },
    reviewCount: Number(form.value.reviewCount),
    ratingAverage: Number(form.value.ratingAverage),
    createdBy: form.value.createdBy,
    imageUrls: cleanedImageUrls
  }

  try {
    if (isEditing.value) {
      await updateDoc(doc(db, 'products', currentProductId.value), payload)
    } else {
      payload.createdAt = new Date()
      await addDoc(collection(db, 'products'), payload)
    }
    isModalOpen.value = false
  } catch (error) {
    alert('Error saving data: ' + error.message)
  }
}

// ── DATABASE WIPE CODE ──
const handleDelete = async (id) => {
  // Double-check role in code before executing the database wipe
  if (userRole.value !== 'superadmin') {
    alert('Action Denied: You do not have permission to delete items.');
    return;
  }
  
  if (confirm('Are you absolutely sure you want to delete this product?')) {
    await deleteDoc(doc(db, 'products', id))
  }
}

const handleLogout = async () => {
  if (confirm('Are you sure you want to log out?')) {
    await signOut(auth)
    router.push('/login')
  }
}
// ── INLINE STATUS TOGGLE FOR SUPERADMIN ──
const toggleProductLive = async (product) => {
  // Security fallback layer
  if (userRole.value !== 'superadmin') {
    alert('Action Denied: Only superadmins can change live visibility status.')
    return
  }

  try {
    const productRef = doc(db, 'products', product.id)
    // Flips the current true/false state instantly in Firestore
    await updateDoc(productRef, {
      isActive: !product.isActive 
    })
  } catch (error) {
    alert('Failed to update status: ' + error.message)
  }
}
</script>

<template>
  <div class="admin-dashboard-container">
    
    <!-- 🏔️ HEADER BAR -->
    <header class="top-nav-bar">
      <div class="brand">
        <span class="brand-icon">🏔️</span> 
        {{ userRole === 'superadmin' ? 'Himalayan Superadmin' : 'Himalayan Admin' }}
      </div>
      
      <div class="search-box">
        <input v-model="text" placeholder="Search inventory..." />
      </div>

      <button class="logout-action-btn" @click="handleLogout">Logout</button>      
    </header>

    <!-- MAIN TWO-COLUMN SPLIT -->
    <div class="split-body-wrapper">
      
      <!-- 🪵 SIDEBAR -->
      <aside class="sidebar-navigation">
        <button :class="['nav-item', { active: activeTab === 'products' }]" @click="activeTab = 'products'">📦 Products</button>
        <button :class="['nav-item', { active: activeTab === 'orders' }]" @click="activeTab = 'orders'">🛒 Orders</button>
        <button v-if="userRole === 'superadmin'" :class="['nav-item', { active: activeTab === 'users' }]" @click="activeTab = 'users'">👥 Users</button>
      </aside>

      <!-- 🖥️ WORKSPACE -->
      <main class="main-workspace-view">
        
        <!-- 📦 TAB 1: PRODUCT MANAGEMENT -->
        <div v-if="activeTab === 'products'" class="fade-in">
          <div class="header-row">
            <div>
            <h2 class="workspace-title">Inventory</h2>
            <p class="subtitle">Showing {{ filteredProducts.length }} items</p>
          </div>
          
          <div class="header-actions">
            <!-- 🏷️ NEW Category Filter Dropdown -->
            <select v-model="selectedCategory" class="category-filter">
              <option value="All">All Categories</option>
              <option value="Spices & Herbs">Spices & Herbs</option>
              <option value="Ghee & Oils">Ghee & Oils</option>
              <option value="Organic Sweets">Organic Sweets</option>
              <option value="Himalayan Teas">Himalayan Teas</option>
            </select>

            <button class="add-btn" @click="openAddModal">➕ Add Product</button>
          </div>
        </div>

          <div class="table-wrapper">
            <table class="product-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Status & Stock</th>
                  <th>Pricing</th>
                  
                  <th>Live Status</th> 
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="product in filteredProducts" :key="product.id" :class="{ 'inactive-row': !product.isActive }">
                  <td>
                    <div class="item-meta">
                      <span class="emoji-cell">{{ product.emoji }}</span>
                      <div>
                        <strong>{{ product.name }}</strong>
                        <span class="weight-badge" v-if="product.weight">{{ product.weight }}</span>
                        <p class="desc">{{ product.category }}</p>
                      </div>
                    </div>
                  </td>
<td>
  <span :class="['status-dot', product.isActive ? 'active' : 'offline']"></span>
  {{ product.isActive ? 'Active' : 'Offline' }}
  <p class="desc">Stock: {{ product.stock }}</p>
</td>

<td>
  <div class="price-block">
    ₹{{ product.price }}
    <span v-if="product.discount?.isDiscounted" class="discount-tag">-{{ product.discount.percent }}%</span>
  </div>
</td>
<td>
  <div class="form-group toggle-group" :style="userRole !== 'superadmin' ? 'opacity: 0.6;' : ''">
    <label>Is Active (Visible)</label>
    <input 
      type="checkbox" 
      v-model="form.isActive" 
      class="toggle-checkbox" 
      :disabled="userRole !== 'superadmin'" 
    />
  </div>
</td>

           <td>
  <div class="actions">
    <button class="edit-action" @click="openEditModal(product)">Edit</button>
    <button v-if="userRole === 'superadmin'" class="delete-action" @click="handleDelete(product.id)">Del</button>
  </div>
</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>

    <!-- 📥 SCHEMA-MAPPED FORM MODAL -->
    <div class="modal" v-if="isModalOpen" @click.self="isModalOpen = false">
      <div class="modal-content">
        <div class="modal-header">
          <h4>{{ isEditing ? 'Edit Product Blueprint' : 'New Product Blueprint' }}</h4>
          <button class="close-x" @click="isModalOpen = false">×</button>
        </div>

        <form @submit.prevent="handleSubmit" class="himalayan-form">
          
          <div class="form-grid">
            <!-- Basic Info -->
            <div class="form-group span-full">
              <label>Product Name</label>
              <input v-model="form.name" type="text" required />
            </div>
            
            <div class="form-group">
              <label>Emoji Icon</label>
              <input v-model="form.emoji" type="text" />
            </div>

            <div class="form-group">
              <label>Category</label>
              <select v-model="form.category">
                <option value="Spices & Herbs">Spices & Herbs</option>
                <option value="Ghee & Oils">Ghee & Oils</option>
                <option value="Organic Sweets">Organic Sweets</option>
                <option value="Himalayan Teas">Himalayan Teas</option>
              </select>
            </div>

            <div class="form-group span-full">
              <label>Description</label>
              <textarea v-model="form.description"></textarea>
            </div>

            <!-- Pricing & Inventory -->
            <div class="section-divider">Pricing & Inventory</div>

            <div class="form-group">
              <label>Price (₹)</label>
              <input v-model="form.price" type="number" required />
            </div>

            <div class="form-group">
              <label>Stock Quantity</label>
              <input v-model="form.stock" type="number" required />
            </div>

            <div class="form-group">
              <label>Weight (e.g., 250g)</label>
              <input v-model="form.weight" type="text" />
            </div>

            

            <!-- Discount Dictionary -->
            <div class="section-divider">Promotions (Discount Dict)</div>
            
            <div class="form-group toggle-group">
              <label>Enable Discount</label>
              <input type="checkbox" v-model="form.discount.isDiscounted" class="toggle-checkbox" />
            </div>

            <div class="form-group" v-if="form.discount.isDiscounted">
              <label>Discount Percent (%)</label>
              <input v-model="form.discount.percent" type="number" min="0" max="100" />
            </div>

            <!-- Multiple Images Array -->
            <div class="section-divider">Media (Image URLs List)</div>
            <div class="span-full image-list-container">
              <div v-for="(url, index) in form.imageUrls" :key="index" class="image-input-row">
                <input v-model="form.imageUrls[index]" type="url" placeholder="https://unsplash.com/..." />
                <button type="button" class="remove-btn" @click="removeImageUrl(index)" v-if="form.imageUrls.length > 1">✕</button>
              </div>
              <button type="button" class="add-image-btn" @click="addImageUrl">+ Add Another Image URL</button>
            </div>

            <!-- Meta Data (Read Only / Background) -->
            <div class="section-divider">Meta Data</div>
            <div class="form-group">
              <label>Review Count</label>
              <input v-model="form.reviewCount" type="number" disabled />
            </div>
            <div class="form-group">
              <label>Rating Avg</label>
              <input v-model="form.ratingAverage" type="number" step="0.1" disabled />
            </div>
            
          </div>

          <div class="modal-actions">
            <button type="button" class="cancel-btn" @click="isModalOpen = false">Cancel</button>
            <button type="submit" class="save-btn">Save Blueprint</button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template> 



<style scoped>
/* 🏔️ HIGH CONTRAST HIMALAYAN THEME */

.admin-dashboard-container { 
  display: flex; 
  flex-direction: column; 
  min-height: 100vh; 
  padding-top: 60px; /* Essential gap to clear external layouts */
  box-sizing: border-box; 
  font-family: system-ui, -apple-system, sans-serif; 
  background-color: #ffffff; 
  color: #0f172a; 
}

/* 👑 TOP NAV */
.top-nav-bar { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  background-color: #ffffff; 
  padding: 1% 3%; 
  border-bottom: 2px solid #cbd5e1; 
  flex-wrap: wrap; 
  gap: 12px;
}
.brand { 
  font-weight: 800; 
  font-size: 1.2rem; 
  color: #15803d; 
  display: flex; 
  align-items: center; 
  gap: 8px;
}
.search-box { flex: 1; max-width: 350px; }
.search-box input { 
  width: 100%; 
  padding: 10px 16px; 
  border: 2px solid #cbd5e1; 
  border-radius: 30px; 
  background-color: #f8fafc; 
  color: #0f172a;
  outline: none;
  font-weight: 500;
}
.search-box input:focus { border-color: #15803d; }
.logout-action-btn { 
  background-color: transparent; 
  color: #dc2626; 
  border: 2px solid #dc2626; 
  padding: 8px 16px; 
  border-radius: 30px; 
  cursor: pointer; 
  font-weight: 600; 
  transition: 0.2s;
}
.logout-action-btn:hover { 
  background-color: #dc2626; 
  color: #ffffff; 
}

/* 🪵 SPLIT BODY */
.split-body-wrapper { 
  display: flex; 
  flex-direction: row; 
  flex: 1; 
  background-color: #e2e8f0; 
}

/* SIDEBAR */
.sidebar-navigation { 
  width: 220px; 
  background-color: #ffffff; 
  padding: 24px 12px; 
  display: flex; 
  flex-direction: column; 
  gap: 8px; 
  border-right: 2px solid #cbd5e1;
}
.nav-item { 
  background-color: transparent; 
  border: none; 
  color: #475569; 
  text-align: left; 
  padding: 12px 16px; 
  border-radius: 8px; 
  cursor: pointer; 
  font-size: 1rem; 
  font-weight: 600; 
  transition: 0.2s; 
}
.nav-item:hover { background-color: #f1f5f9; color: #15803d; }
.nav-item.active { background-color: #15803d; color: #ffffff; }

/* 🖥️ WORKSPACE */
.main-workspace-view { 
  flex: 1; 
  padding: 2%; 
  overflow-x: hidden; 
}
.header-row { 
  display: flex; 
  justify-content: space-between; 
  align-items: flex-end; 
  margin-bottom: 24px; 
  flex-wrap: wrap; 
  gap: 16px; 
}
.workspace-title { margin: 0; font-size: 1.8rem; font-weight: 700; color: #15803d; }
.subtitle { margin: 4px 0 0; color: #475569; font-size: 1rem; font-weight: 500; }
.header-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.category-filter {
  padding: 10px 16px;
  border: 2px solid #cbd5e1;
  border-radius: 30px;
  background-color: #ffffff;
  color: #0f172a;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  transition: 0.2s;
}
.category-filter:focus { border-color: #15803d; }

.add-btn { 
  background-color: #15803d; 
  color: #ffffff; 
  border: none; 
  padding: 12px 24px; 
  border-radius: 30px; 
  cursor: pointer; 
  font-weight: 600; 
  font-size: 1rem;
  box-shadow: 0 4px 12px rgba(21, 128, 61, 0.3); 
  transition: 0.3s;
}
.add-btn:hover { background-color: #166534; transform: translateY(-2px); }

/* 📦 RESPONSIVE TABLE LAYER */
.table-wrapper { 
  background-color: #ffffff; 
  border-radius: 12px; 
  border: 2px solid #cbd5e1; 
  overflow-x: auto; 
  -webkit-overflow-scrolling: touch; /* Butter-smooth momentum scrolling for mobile */
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  width: 100%;
}
.product-table { 
  width: 100%; 
  border-collapse: collapse; 
  min-width: 500px; /* Keeps structural shape intact when scrolling horizontally */
}
.product-table th { 
  background-color: #f8fafc; 
  color: #0f172a; 
  text-align: left; 
  padding: 14px; 
  font-weight: 700; 
  font-size: 0.85rem; 
  text-transform: uppercase; 
  border-bottom: 2px solid #cbd5e1; 
  white-space: nowrap;
}
.product-table td { 
  padding: 14px; 
  border-bottom: 1px solid #e2e8f0; 
  vertical-align: middle; 
  font-size: 0.95rem;
}
.inactive-row td { opacity: 0.5; background-color: #f8fafc; }
.item-meta { display: flex; align-items: center; gap: 12px; }

.emoji-cell { 
  font-size: 1.8rem; 
  background-color: #f1f5f9; 
  width: 48px; 
  height: 48px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  border-radius: 10px; 
  border: 1px solid #cbd5e1;
  flex-shrink: 0; /* Prevents emoji box from warping or squishing */
}
.weight-badge { background-color: #e2e8f0; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; margin-left: 6px; color: #475569; font-weight: 600;}
.desc { margin: 4px 0 0 0; font-size: 0.85rem; color: #475569; line-height: 1.3; }
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.status-dot.active { background-color: #10b981; }
.status-dot.offline { background-color: #94a3b8; }
.discount-tag { background-color: #fef08a; color: #854d0e; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 4px; }
.price-block { font-weight: 600; display: flex; align-items: center; flex-wrap: wrap; gap: 2px; }

.actions { display: flex; gap: 6px; }
.edit-action, .delete-action { 
  background-color: #f8fafc; 
  border: 2px solid #cbd5e1; 
  padding: 6px 12px; 
  border-radius: 6px; 
  cursor: pointer; 
  font-size: 0.85rem; 
  font-weight: 600;
  transition: 0.2s; 
}
.edit-action { color: #0f172a; }
.edit-action:hover { border-color: #15803d; color: #15803d; background-color: #f0fdf4; }
.delete-action { color: #dc2626; }
.delete-action:hover { border-color: #dc2626; color: #ffffff; background-color: #dc2626; }

/* 📥 FORM MODAL (FLUID PERCENTAGE-BASED) */
.modal { 
  position: fixed; top:0; left:0; width:100%; height:100%; 
  background-color: rgba(15, 23, 42, 0.75); 
  backdrop-filter: blur(4px); 
  display:flex; justify-content:center; align-items:center; 
  z-index: 1000; padding: 4%; box-sizing: border-box; 
}
.modal-content { 
  background-color: #ffffff; 
  border-radius: 16px; 
  width: 100%; 
  max-width: 580px; 
  max-height: 85vh; 
  overflow-y: auto; 
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); 
  border: 3px solid #15803d;
}
.modal-header { 
  padding: 4% 5%; 
  border-bottom: 2px solid #cbd5e1; 
  display: flex; justify-content: space-between; align-items: center; 
  position: sticky; top: 0; background-color: #ffffff; z-index: 2; 
}
.modal-header h4 { margin: 0; font-size: 1.3rem; color: #15803d; font-weight: 800; }
.close-x { background: transparent; border: none; font-size: 1.8rem; cursor: pointer; color: #475569; font-weight: bold; }

.himalayan-form { padding: 5%; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.span-full { grid-column: 1 / -1; }
.section-divider { 
  grid-column: 1 / -1; 
  font-size: 0.9rem; 
  font-weight: 800; 
  color: #0f172a; 
  text-transform: uppercase; 
  margin-top: 16px; 
  border-bottom: 2px solid #cbd5e1; 
  padding-bottom: 6px; 
}

.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 0.9rem; color: #0f172a; font-weight: 700; }
.form-group input, .form-group select, .form-group textarea { 
  padding: 10px 12px; 
  border: 2px solid #cbd5e1; 
  border-radius: 8px; 
  font-size: 0.95rem; 
  width: 100%; 
  box-sizing: border-box; 
  background-color: #f8fafc; 
  color: #0f172a;
}
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { 
  outline: none; border-color: #15803d; background-color: #ffffff; 
}
.form-group input:disabled { opacity: 0.6; background-color: #e2e8f0; }
.form-group textarea { height: 90px; resize: vertical; }

.toggle-group { flex-direction: row; align-items: center; justify-content: space-between; background-color: #f8fafc; padding: 12px; border-radius: 8px; border: 2px solid #cbd5e1; }
.toggle-checkbox { width: 20px; height: 20px; accent-color: #15803d; }

.image-list-container { display: flex; flex-direction: column; gap: 10px; }
.image-input-row { display: flex; gap: 8px; }
.image-input-row input { flex: 1; }
.remove-btn { background-color: #fef2f2; color: #dc2626; border: 2px solid #fecaca; border-radius: 8px; width: 44px; cursor: pointer; font-weight: bold; }
.add-image-btn { background-color: #f0fdf4; color: #15803d; border: 2px dashed #15803d; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 700; }

.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; padding-top: 16px; border-top: 2px solid #cbd5e1; }
.cancel-btn { background-color: #ffffff; color: #0f172a; border: 2px solid #cbd5e1; padding: 10px 20px; border-radius: 30px; cursor: pointer; font-weight: 700; }
.save-btn { background-color: #ca8a04; color: #ffffff; border: none; padding: 10px 28px; border-radius: 30px; cursor: pointer; font-weight: 800; }

/* 📱 🖥️ INTERMEDIATE TABLET & SMALL LAPTOP BREAKPOINT */
@media (max-width: 1024px) {
  .product-table th { padding: 12px 10px; font-size: 0.8rem; }
  .product-table td { padding: 12px 10px; font-size: 0.9rem; }
  .emoji-cell { width: 42px; height: 42px; font-size: 1.5rem; }
}

/* 📱 MOBILE RESPONSIVE LAYOUT ENGINE */
@media (max-width: 768px) {
  .split-body-wrapper { flex-direction: column; }
  
  /* Convert layout sidebar into a relaxed, horizontally scrollable top menu */
  .sidebar-navigation { 
    width: 100%; 
    flex-direction: row; 
    overflow-x: auto; 
    padding: 12px; 
    border-right: none; 
    border-bottom: 2px solid #cbd5e1;
    box-sizing: border-box;
    scrollbar-width: none; /* Blends scroll bars completely out of sight on Firefox */
  }
  .sidebar-navigation::-webkit-scrollbar { display: none; } /* Hides scroll bars on Chrome/Safari */
  
  .nav-item { 
    white-space: nowrap; 
    text-align: center; 
    padding: 8px 16px; 
    font-size: 0.9rem;
    flex: 1;
  }
  
  .main-workspace-view { padding: 16px 12px; }
  .header-row { flex-direction: column; align-items: stretch; gap: 14px; }
  .header-actions { flex-direction: column; align-items: stretch; gap: 10px; }
  .category-filter, .add-btn { width: 100%; text-align: center; box-sizing: border-box; }

  /* Dynamic Font Downscaling for Extreme High-Density Scannability */
  .product-table th { 
    padding: 10px 8px; 
    font-size: 0.75rem; /* Drastically scaled down to protect viewports */
  }
  .product-table td { 
    padding: 10px 8px; 
    font-size: 0.8rem; /* Highly relaxed layout sizing for small phone touch targets */
  }
  .emoji-cell { 
    width: 36px; 
    height: 36px; 
    font-size: 1.25rem; 
    border-radius: 6px; 
  }
  .desc { font-size: 0.75rem; margin-top: 2px; }
  .weight-badge { font-size: 0.7rem; padding: 1px 4px; }
  .discount-tag { font-size: 0.7rem; padding: 1px 4px; }
  
  /* Mini Mobile Actions Button Sizing */
  .edit-action, .delete-action { 
    padding: 4px 8px; 
    font-size: 0.75rem; 
    border-radius: 4px;
  }
  .actions { gap: 4px; }

  /* Form Modal Mobile Fine-Tuning */
  .form-grid { grid-template-columns: 1fr; gap: 12px; } 
  .modal { padding: 0; } /* Maximum viewport usage */
  .modal-content { 
    max-height: 92vh; 
    border-radius: 16px 16px 0 0; 
    position: fixed; 
    bottom: 0; 
    border-left: none;
    border-right: none;
    border-bottom: none;
  }
}

@media (max-width: 480px) {
  .top-nav-bar { justify-content: center; flex-direction: column; padding: 12px; }
  .search-box { width: 100%; max-width: 100%; }
  .brand { font-size: 1.1rem; }
}


.table-toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.table-toggle-checkbox {
  width: 20px;
  height: 20px;
  accent-color: #15803d; /* High contrast matching green */
  cursor: pointer;
}

.table-toggle-checkbox:disabled {
  cursor: not-allowed;
}

.toggle-label-text {
  font-size: 0.85rem;
  font-weight: 700;
  color: #0f172a;
}

/* Ensure font scale handles it beautifully on mobile screens */
@media (max-width: 768px) {
  .table-toggle-checkbox {
    width: 16px;
    height: 16px;
  }
  .toggle-label-text {
    font-size: 0.75rem;
  }
}
</style>