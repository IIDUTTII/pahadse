<script setup>
/**
 * ProductForm.vue — Secure Standalone Product Management Workspace
 */
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchProductById, updateProduct, addProduct } from './db.js'

defineOptions({ name: 'ProductForm' })

const route = useRoute()
const router = useRouter()

const isEditing = ref(false)
const rawId = ref(null)
const activeTab = ref('basic')
const saving = ref(false)
const initializing = ref(true)
const activePreviewIdx = ref(0)

const getDefaultForm = () => ({
  name: '', description: '', price: 0, weight: '', category: 'Spices & Herbs',
  emoji: '💛', stock: 0, isActive: true, discount: { isDiscounted: false, percent: 0 },
  reviewCount: 0, ratingAverage: 0.0, createdBy: 'ADMIN_USER', imageUrls: [''],
  benefits: [''], ingredients: [''], origin: '', howToUse: '', shelfLife: '', tags: [''],
})
const form = ref(getDefaultForm())

// 🧠 Computed helper to always get clean, non-empty image URLs safely
const cleanImages = computed(() => {
  return (form.value.imageUrls || []).filter(u => u && u.trim() !== '')
})

// 🔐 De-obfuscation utility mapping token back to actual Document ID
const decryptId = (token) => {
  try {
    const raw = atob(token)
    if (raw.startsWith('himalayan_')) {
      return raw.replace('himalayan_', '')
    }
    return null
  } catch { return null }
}

onMounted(async () => {
  const token = route.params.id
  if (token && token !== 'new') {
    isEditing.value = true
    const decoded = decryptId(token)
    if (!decoded) {
      alert('Security Exception: Untrusted signature string detected.')
      router.push('/admin')
      return
    }
    rawId.value = decoded
    try {
      const productData = await fetchProductById(decoded)
      if (productData) {
        form.value = {
          ...getDefaultForm(),
          ...productData,
          discount: productData.discount || { isDiscounted: false, percent: 0 },
          imageUrls: productData.imageUrls?.length ? [...productData.imageUrls] : [''],
          benefits: productData.benefits?.length ? [...productData.benefits] : [''],
          ingredients: productData.ingredients?.length ? [...productData.ingredients] : [''],
          tags: productData.tags?.length ? [...productData.tags] : [''],
        }
      }
    } catch (e) {
      console.error(e)
    }
  }
  initializing.value = false
})

const addArrayItem = (field) => form.value[field].push('')
const removeArrayItem = (field, idx) => {
  form.value[field].splice(idx, 1)
  // Reset preview index to prevent out of bounds errors if active image was removed
  if (field === 'imageUrls') {
    activePreviewIdx.value = 0
  }
}

const handleSubmit = async () => {
  saving.value = true
  const clean = (arr) => arr.filter(v => v?.trim())

  const payload = {
    name: form.value.name, description: form.value.description, price: Number(form.value.price),
    weight: form.value.weight, category: form.value.category, emoji: form.value.emoji,
    stock: Number(form.value.stock), isActive: form.value.isActive,
    discount: { isDiscounted: form.value.discount.isDiscounted, percent: Number(form.value.discount.percent) },
    reviewCount: Number(form.value.reviewCount), ratingAverage: Number(form.value.ratingAverage),
    createdBy: form.value.createdBy, imageUrls: clean(form.value.imageUrls),
    benefits: clean(form.value.benefits), ingredients: clean(form.value.ingredients),
    tags: clean(form.value.tags), origin: form.value.origin, howToUse: form.value.howToUse, shelfLife: form.value.shelfLife,
  }

  try {
    if (isEditing.value) {
      await updateProduct(rawId.value, payload)
    } else {
      await addProduct(payload)
    }
    router.push('/admin')
  } catch (e) {
    alert('Error saving data mapping: ' + e.message)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="form-workspace-page">
    <div v-if="initializing" class="loading-state">
      <div class="spinner"></div>
      <p>Initializing security layers...</p>
    </div>

    <div v-else class="form-container fade-in">
      <header class="form-header">
        <div>
          <button class="back-link-btn" @click="router.push('/admin')">← Back to Dashboard</button>
          <h2>{{ isEditing ? 'Modify Product Blueprint' : 'Register New Harvest Item' }}</h2>
        </div>
        <div class="tabs-row">
          <button v-for="t in ['basic', 'detail', 'media']" :key="t" :class="['tab-btn', { active: activeTab === t }]" @click="activeTab = t">
            {{ t === 'basic' ? '📋 Basic Info' : t === 'detail' ? '📝 Rich Descriptions' : '🖼️ Media' }}
          </button>
        </div>
      </header>

      <form @submit.prevent="handleSubmit" class="core-himalayan-form">
        
        <div v-show="activeTab === 'basic'" class="grid-layout">
          <div class="input-group full-width">
            <label>Product Title Name *</label>
            <input v-model="form.name" required placeholder="e.g., Pure Himalayan Shilajit Resins" />
          </div>
          <div class="input-group">
            <label>Emoji Identifier</label>
            <input v-model="form.emoji" placeholder="🍯" />
          </div>
          <div class="input-group">
            <label>Category Sector</label>
            <select v-model="form.category">
              <option>Spices & Herbs</option><option>Ghee & Oils</option><option>Organic Sweets</option><option>Himalayan Teas</option><option>Juices</option><option>Sweets</option>
            </select>
          </div>
          <div class="input-group">
            <label>Base Retail Price (INR) *</label>
            <input v-model="form.price" type="number" required />
          </div>
          <div class="input-group">
            <label>Available Warehouse Stock *</label>
            <input v-model="form.stock" type="number" required />
          </div>
          <div class="input-group">
            <label>Weight Sizing Metric</label>
            <input v-model="form.weight" placeholder="e.g., 250g" />
          </div>
          <div class="input-group">
            <label>Guaranteed Shelf Life</label>
            <input v-model="form.shelfLife" placeholder="e.g., 12 Months from harvest" />
          </div>
          <div class="divider full-width">Promotional Configuration</div>
          <div class="input-group toggle-box">
            <label>Activate Active Discount Rules</label>
            <input type="checkbox" v-model="form.discount.isDiscounted" />
          </div>
          <div class="input-group" v-if="form.discount.isDiscounted">
            <label>Deduction Percentage (%)</label>
            <input v-model="form.discount.percent" type="number" min="0" max="100" />
          </div>
        </div>

        <div v-show="activeTab === 'detail'" class="grid-layout">
          <div class="input-group full-width">
            <label>Public Description Summary</label>
            <textarea v-model="form.description" placeholder="Write deep insights regarding origins, textures, purity..."></textarea>
          </div>
          <div class="input-group full-width">
            <label>Step-by-Step Directions / How To Use</label>
            <textarea v-model="form.howToUse" placeholder="Recommended dosage guidelines..."></textarea>
          </div>
          <div class="input-group full-width">
            <label>Regional Origin Location</label>
            <input v-model="form.origin" placeholder="e.g., Kinnaur District, Himachal Pradesh" />
          </div>
          <div class="divider full-width">Key Wholesome Benefits</div>
          <div class="full-width list-stack">
            <div v-for="(_, i) in form.benefits" :key="'b'+i" class="list-item-row">
              <input v-model="form.benefits[i]" placeholder="e.g., Boosts daily metabolic immunity safely" />
              <button type="button" @click="removeArrayItem('benefits', i)" v-if="form.benefits.length > 1">✕</button>
            </div>
            <button type="button" class="add-row-btn" @click="addArrayItem('benefits')">+ Append New Benefit</button>
          </div>
          <div class="divider full-width">Composed Ingredients Array</div>
          <div class="full-width list-stack">
            <div v-for="(_, i) in form.ingredients" :key="'ing'+i" class="list-item-row">
              <input v-model="form.ingredients[i]" placeholder="e.g., Wild Flora Forest Honey extracts" />
              <button type="button" @click="removeArrayItem('ingredients', i)" v-if="form.ingredients.length > 1">✕</button>
            </div>
            <button type="button" class="add-row-btn" @click="addArrayItem('ingredients')">+ Append Component Ingredient</button>
          </div>
        </div>

        <div v-show="activeTab === 'media'" class="grid-layout">
          <p class="helper-text full-width">
            Paste direct image URLs (Unsplash, Cloudinary, etc). The primary asset maps as the main store thumbnail.
          </p>

          <div class="full-width live-hero-preview-box" v-if="cleanImages.length > 0">
            <div class="main-preview-viewport">
              <img 
                :src="cleanImages[activePreviewIdx] || cleanImages[0]" 
                alt="Active Asset Preview"
                @error="$event.target.src='https://placehold.co/600x600?text=Invalid+Image+URL'"
              />
            </div>
            <div class="preview-badge">Live Viewport Preview</div>
          </div>

          <div class="full-width list-stack">
            <label>Image Assets Array List</label>
            <div v-for="(url, i) in form.imageUrls" :key="'img'+i" class="list-item-row">
              <input 
                v-model="form.imageUrls[i]" 
                type="url" 
                placeholder="https://images.unsplash.com/your-asset-path" 
              />
              <button type="button" @click="removeArrayItem('imageUrls', i)" v-if="form.imageUrls.length > 1">✕</button>
            </div>
            <button type="button" class="add-row-btn" @click="addArrayItem('imageUrls')">+ Append Image Resource Asset URL</button>
          </div>

          <div v-if="cleanImages.length > 0" class="full-width thumb-interactive-tray">
            <div class="divider">Click a thumbnail to switch preview:</div>
            <div class="thumb-flex-wrapper">
              <div
                v-for="(url, i) in cleanImages"
                :key="'prev'+i"
                :class="['interactive-thumb-card', { 'is-currently-active': activePreviewIdx === i }]"
                @click="activePreviewIdx = i"
              >
                <img :src="url" @error="$event.target.style.opacity='0.3'" />
                <span class="thumb-status-tag">{{ i === 0 ? 'Primary' : `Alt ${i}` }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="form-footer-actions">
          <button type="button" class="cancel-back-btn" @click="router.push('/admin')">Discard</button>
          <button type="submit" class="commit-btn" :disabled="saving">
            {{ saving ? 'Uploading Mutations...' : isEditing ? 'Commit Changes' : 'Publish Product Record' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.form-workspace-page { min-height: 100vh; background-color: #f1f5f9; padding: 40px 20px; box-sizing: border-box; font-family: system-ui, sans-serif; }
.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; color: #475569; }
.spinner { width: 40px; height: 40px; border: 4px solid #cbd5e1; border-top-color: #15803d; border-radius: 50%; animation: rot .8s linear infinite; }
@keyframes rot { to { transform: rotate(360deg); } }
.form-container { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 2px solid #cbd5e1; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); overflow: hidden; }
.form-header { padding: 24px; border-bottom: 2px solid #e2e8f0; background: #f8fafc; }
.back-link-btn { background: none; border: none; color: #475569; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 8px; }
.back-link-btn:hover { color: #15803d; }
.form-header h2 { margin: 0 0 16px; font-size: 1.5rem; color: #0f172a; font-weight: 800; }
.tabs-row { display: flex; gap: 8px; border-bottom: 2px solid #e2e8f0; }
.tab-btn { padding: 10px 16px; background: none; border: none; font-size: 0.9rem; font-weight: 700; color: #64748b; cursor: pointer; border-bottom: 3px solid transparent; }
.tab-btn.active { color: #15803d; border-bottom-color: #15803d; }
.core-himalayan-form { padding: 32px; }
.grid-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.full-width { grid-column: 1 / -1; }
.divider { font-size: 0.85rem; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-top: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
.input-group { display: flex; flex-direction: column; gap: 6px; }
.input-group label { font-size: 0.9rem; font-weight: 700; color: #0f172a; }
.input-group input, .input-group select, .input-group textarea { padding: 12px; border: 2px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; background: #f8fafc; color: #0f172a; width: 100%; box-sizing: border-box; }
.input-group textarea { height: 110px; resize: vertical; }
.input-group input:focus { outline: none; border-color: #15803d; background: #fff; }
.toggle-box { flex-direction: row; justify-content: space-between; align-items: center; background: #f8fafc; border: 2px solid #cbd5e1; padding: 12px; border-radius: 8px; }
.toggle-box input { width: 20px; height: 20px; accent-color: #15803d; }
.list-stack { display: flex; flex-direction: column; gap: 8px; }
.list-item-row { display: flex; gap: 8px; }
.list-item-row button { background: #fef2f2; color: #dc2626; border: 2px solid #fecaca; border-radius: 8px; width: 40px; cursor: pointer; font-weight: bold; }
.add-row-btn { background: #f0fdf4; color: #15803d; border: 2px dashed #15803d; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 700; }
.form-footer-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; padding-top: 20px; border-top: 2px solid #e2e8f0; }
.cancel-back-btn { background: #fff; color: #0f172a; border: 2px solid #cbd5e1; padding: 12px 24px; border-radius: 30px; cursor: pointer; font-weight: 700; }
.commit-btn { background: #15803d; color: #fff; border: none; padding: 12px 32px; border-radius: 30px; cursor: pointer; font-weight: 800; box-shadow: 0 4px 12px rgba(21,128,61,0.2); }
.fade-in { animation: fIn 0.2s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (max-width: 600px) { .grid-layout { grid-template-columns: 1fr; } .form-container { border-radius: 0; } .core-himalayan-form { padding: 16px; } }

/* 🖼️ INTERACTIVE MEDIA PREVIEW TERMINAL STYLES */
.live-hero-preview-box {
  background-color: #f8fafc;
  border: 2px solid #cbd5e1;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-bottom: 12px;
}
.main-preview-viewport {
  width: 100%;
  max-width: 320px;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #cbd5e1;
  background: #ffffff;
}
.main-preview-viewport img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.preview-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  background-color: #0f172a;
  color: #ffffff;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 4px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}
.thumb-interactive-tray { margin-top: 16px; }
.thumb-flex-wrapper { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
.interactive-thumb-card { display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; position: relative; transition: transform 0.2s, border-color 0.2s; }
.interactive-thumb-card img { width: 76px; height: 76px; object-fit: cover; border-radius: 6px; border: 2px solid #cbd5e1; background: #fff; }
.interactive-thumb-card.is-currently-active img { border-color: #15803d; box-shadow: 0 0 0 2px rgba(21, 128, 61, 0.2); }
.interactive-thumb-card:hover { transform: translateY(-2px); }
.thumb-status-tag { font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
.interactive-thumb-card.is-currently-active .thumb-status-tag { color: #15803d; }
</style>