<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { auth, storage, db } from '../firebase.js'
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import imageCompression from 'browser-image-compression'

defineOptions({ name: 'ProductForm' })
const route = useRoute()
const router = useRouter()

const isEditing = ref(false)
const rawId = ref(null)
const activeTab = ref('basic')
const saving = ref(false)
const initializing = ref(true)
const activePreviewIdx = ref(0)
const isUploadingImages = ref(false)
const uploadStatusText = ref('')

// ✨ SECURE DEFAULT FORM
const getDefaultForm = () => ({
  name: '', description: '', price: 0, weight: '', category: 'Spices & Herbs',
  emoji: '📦', stock: 0, 
  isActive: false, // 👈 NEW PRODUCT WILL BE HIDDEN BY DEFAULT
  discount: { isDiscounted: false, percent: 0 },
  reviewCount: 0, ratingAverage: 0.0, createdBy: 'ADMIN_USER', 
  imageUrls: [], benefits: [''], ingredients: [''], origin: '', howToUse: '', shelfLife: '', tags: [''],
})

const form = ref(getDefaultForm())

// Safe computed properties
const cleanImages = computed(() => {
  if (!form.value || !form.value.imageUrls) return []
  return form.value.imageUrls.filter(u => u && u.trim() !== '')
})

const calculatedFinalPrice = computed(() => {
  if (!form.value) return 0
  const basePrice = Number(form.value.price) || 0
  if (!form.value.discount?.isDiscounted) return basePrice
  const percentNode = Number(form.value.discount.percent) || 0
  return Math.round(basePrice * (1 - percentNode / 100))
})

const calculatedSavingsAmount = computed(() => {
  if (!form.value) return 0
  const basePrice = Number(form.value.price) || 0
  return Math.max(basePrice - calculatedFinalPrice.value, 0)
})

onMounted(() => {
  auth.onAuthStateChanged(async (user) => {
    if (!user) return router.push('/login')
    
    const productId = route.params.id
    if (productId && productId !== 'new') {
      isEditing.value = true
      rawId.value = productId
      
      try {
        const snap = await getDoc(doc(db, 'products', productId))
        if (snap.exists()) {
          const p = snap.data()
          form.value = {
            ...getDefaultForm(),
            ...p,
            discount: p.discount || { isDiscounted: false, percent: 0 },
            imageUrls: p.imageUrls && p.imageUrls.length ? [...p.imageUrls] : [],
            benefits: p.benefits && p.benefits.length ? [...p.benefits] : [''],
            ingredients: p.ingredients && p.ingredients.length ? [...p.ingredients] : [''],
            tags: p.tags && p.tags.length ? [...p.tags] : [''],
          }
        }
      } catch (e) {
        console.error("Fetch Error: ", e)
      }
    }
    initializing.value = false
  })
})

const addArrayItem = (field) => {
  if (!form.value[field]) form.value[field] = []
  form.value[field].push('')
}

const removeArrayItem = (field, idx) => {
  if (form.value[field]) form.value[field].splice(idx, 1)
  if (field === 'imageUrls') activePreviewIdx.value = 0
}

// ✨ LOCAL IMAGE UPLOAD TO FIREBASE
const handleLocalImageUpload = async (event) => {
  const files = event.target.files
  if (!files || files.length === 0) return

  isUploadingImages.value = true
  const folderId = rawId.value || `temp_${Date.now()}`

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!file.type.startsWith('image/')) continue

    try {
      uploadStatusText.value = `Compressing ${i + 1}/${files.length}...`
      const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1200, useWebWorker: true }
      const compressedFile = await imageCompression(file, options)
      
      uploadStatusText.value = `Uploading ${i + 1}/${files.length}...`
      const fileExt = file.name.split('.').pop()
      const filePath = `products/${folderId}/${Date.now()}_${i}.${fileExt}`
      const imageRef = storageRef(storage, filePath)
      
      await uploadBytes(imageRef, compressedFile)
      const downloadURL = await getDownloadURL(imageRef)
      
      if (!form.value.imageUrls) form.value.imageUrls = []
      form.value.imageUrls.push(downloadURL)
    } catch (error) {
      alert(`Upload failed: ${error.message}`)
    }
  }
  isUploadingImages.value = false
  uploadStatusText.value = ''
  event.target.value = '' // reset input
}

const handleSubmit = async () => {
  saving.value = true
  const clean = (arr) => (arr || []).filter(v => v?.trim())
  
  const payload = {
    name: form.value.name, description: form.value.description, price: Number(form.value.price),
    weight: form.value.weight, category: form.value.category, emoji: form.value.emoji,
    stock: Number(form.value.stock), isActive: form.value.isActive,
    discount: { isDiscounted: form.value.discount.isDiscounted, percent: Number(form.value.discount.percent) },
    reviewCount: Number(form.value.reviewCount), ratingAverage: Number(form.value.ratingAverage),
    createdBy: form.value.createdBy, imageUrls: clean(form.value.imageUrls),
    benefits: clean(form.value.benefits), ingredients: clean(form.value.ingredients),
    tags: clean(form.value.tags), origin: form.value.origin, howToUse: form.value.howToUse, shelfLife: form.value.shelfLife,
    updatedAt: serverTimestamp()
  }
  
  try {
    if (isEditing.value) {
      await updateDoc(doc(db, 'products', rawId.value), payload)
    } else {
      payload.createdAt = serverTimestamp()
      await addDoc(collection(db, 'products'), payload)
    }
    router.push('/admin')
  } catch (e) { 
    alert('Error saving product: ' + e.message) 
  } finally { 
    saving.value = false 
  }
}
</script>

<template>
  <div class="form-workspace-page">
    <div v-if="initializing" class="loading-state"><div class="spinner"></div><p>Initializing security layers...</p></div>

    <div v-else class="form-container fade-in">
      <header class="form-header">
        <div>
          <button type="button" class="back-link-btn" @click="router.push('/admin')">← Back to Dashboard</button>
          <h2>{{ isEditing ? 'Modify Product Blueprint' : 'Register New Harvest Item' }}</h2>
        </div>
        <div class="tabs-row">
          <button type="button" :class="['tab-btn', { active: activeTab === 'basic' }]" @click.prevent="activeTab = 'basic'">📋 Basic Info</button>
          <button type="button" :class="['tab-btn', { active: activeTab === 'detail' }]" @click.prevent="activeTab = 'detail'">📝 Descriptions</button>
          <button type="button" :class="['tab-btn', { active: activeTab === 'media' }]" @click.prevent="activeTab = 'media'">🖼️ Media</button>
        </div>
      </header>

      <form @submit.prevent="handleSubmit" class="core-himalayan-form">
        <div v-show="activeTab === 'basic'" class="grid-layout">
          <div class="input-group full-width"><label>Product Title Name *</label><input v-model="form.name" required placeholder="e.g., Pure Himalayan Shilajit" /></div>
          <div class="input-group"><label>Emoji Identifier</label><input v-model="form.emoji" placeholder="🍯" /></div>
          <div class="input-group">
            <label>Category Sector</label>
            <select v-model="form.category">
              <option>Spices & Herbs</option><option>Ghee & Oils</option><option>Organic Sweets</option><option>Himalayan Teas</option><option>Juices</option><option>Sweets</option>
            </select>
          </div>
          <div class="input-group"><label>Base Retail Price (INR) *</label><input v-model="form.price" type="number" min="0" required /></div>
          <div class="input-group"><label>Available Warehouse Stock *</label><input v-model="form.stock" type="number" required /></div>
          <div class="input-group"><label>Weight Sizing Metric</label><input v-model="form.weight" placeholder="e.g., 250g" /></div>
          <div class="input-group"><label>Guaranteed Shelf Life</label><input v-model="form.shelfLife" placeholder="e.g., 12 Months" /></div>
          
          <div class="divider full-width">Promotional Configuration Matrix</div>
          <div class="input-group toggle-box"><label>Activate Active Discount Rules</label><input type="checkbox" v-model="form.discount.isDiscounted" /></div>
          <div class="input-group" v-if="form.discount.isDiscounted"><label>Deduction Percentage (%)</label><input v-model="form.discount.percent" type="number" min="0" max="100" /></div>
          
          <div class="full-width dynamic-math-display-panel" v-if="form.price > 0">
            <div class="math-panel-title">🧮 Live Promotion Calculation Verification</div>
            <div class="math-grid-summary">
              <div class="math-node-card">
                <span class="math-label">Base Retail Price</span>
                <span class="math-number">₹{{ form.price }}</span>
              </div>
              <div class="math-node-card text-orange" v-if="form.discount.isDiscounted && form.discount.percent > 0">
                <span class="math-label">Admin Reduction Margin</span>
                <span class="math-number">-₹{{ calculatedSavingsAmount }} ({{ form.discount.percent }}%)</span>
              </div>
              <div class="math-node-card text-green">
                <span class="math-label">Consumer Final Cost</span>
                <span class="math-number">₹{{ calculatedFinalPrice }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-show="activeTab === 'detail'" class="grid-layout">
          <div class="input-group full-width"><label>Public Description Summary</label><textarea v-model="form.description" placeholder="Write insights here..."></textarea></div>
          <div class="input-group full-width"><label>Directions / How To Use</label><textarea v-model="form.howToUse" placeholder="Guidelines..."></textarea></div>
          <div class="input-group full-width"><label>Regional Origin Location</label><input v-model="form.origin" placeholder="e.g., Mandi, Himachal Pradesh" /></div>
          
          <div class="divider full-width">Key Wholesome Benefits</div>
          <div class="full-width list-stack">
            <div v-for="(_, i) in form.benefits" :key="'b'+i" class="list-item-row"><input v-model="form.benefits[i]" placeholder="Benefit detail..." /><button type="button" @click="removeArrayItem('benefits', i)" v-if="form.benefits.length > 1">✕</button></div>
            <button type="button" class="add-row-btn" @click="addArrayItem('benefits')">+ Append New Benefit</button>
          </div>
          
          <div class="divider full-width">Composed Ingredients</div>
          <div class="full-width list-stack">
            <div v-for="(_, i) in form.ingredients" :key="'ing'+i" class="list-item-row"><input v-model="form.ingredients[i]" placeholder="Ingredient..." /><button type="button" @click="removeArrayItem('ingredients', i)" v-if="form.ingredients.length > 1">✕</button></div>
            <button type="button" class="add-row-btn" @click="addArrayItem('ingredients')">+ Append Ingredient</button>
          </div>
        </div>

        <div v-show="activeTab === 'media'" class="grid-layout">
          <div class="full-width device-upload-box">
            <h4>Upload from Device (Gallery/PC)</h4>
            <div class="upload-btn-wrapper">
              <label class="btn-upload-label" :class="{ 'is-disabled': isUploadingImages }">
                <span>{{ isUploadingImages ? 'Uploading...' : '📁 Select Images' }}</span>
                <input type="file" multiple accept="image/*" @change="handleLocalImageUpload" :disabled="isUploadingImages" hidden />
              </label>
              <span v-if="uploadStatusText" class="upload-status-text">⏳ {{ uploadStatusText }}</span>
            </div>
          </div>

          <div class="divider full-width" style="text-align: center;">OR PASTE INTERNET URLS</div>

          <div class="full-width live-hero-preview-box" v-if="cleanImages.length > 0">
            <div class="main-preview-viewport"><img :src="cleanImages[activePreviewIdx] || cleanImages[0]" alt="Preview" /></div>
          </div>
          
          <div class="full-width list-stack">
            <div v-for="(url, i) in form.imageUrls" :key="'img'+i" class="list-item-row">
              <input v-model="form.imageUrls[i]" type="url" placeholder="https://images.unsplash.com/your-asset" />
              <button type="button" @click="removeArrayItem('imageUrls', i)">✕</button>
            </div>
            <button type="button" class="add-row-btn" @click="addArrayItem('imageUrls')">+ Add Blank URL Field</button>
          </div>
          
          <div v-if="cleanImages.length > 0" class="full-width thumb-interactive-tray">
            <div class="thumb-flex-wrapper">
              <div v-for="(url, i) in cleanImages" :key="'prev'+i" :class="['interactive-thumb-card', { 'is-currently-active': activePreviewIdx === i }]" @click="activePreviewIdx = i"><img :src="url" /></div>
            </div>
          </div>
        </div>

        <div class="form-footer-actions">
          <button type="button" class="cancel-back-btn" @click="router.push('/admin')">Discard</button>
          <button type="submit" class="commit-btn" :disabled="saving || isUploadingImages">
            {{ saving ? 'Uploading...' : isEditing ? 'Commit Changes' : 'Publish Product' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.form-workspace-page { min-height: 100vh; background-color: #f1f5f9; padding: 100px 20px 40px; box-sizing: border-box; font-family: system-ui, sans-serif; }
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
.commit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.fade-in { animation: fIn 0.2s ease-out; }
.device-upload-box { background: #e0f2fe; border: 2px dashed #bae6fd; border-radius: 12px; padding: 24px; text-align: center; }
.device-upload-box h4 { margin: 0 0 8px; color: #0369a1; font-weight: 800; font-size: 1.1rem; }
.upload-btn-wrapper { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.btn-upload-label { background: #0284c7; color: white; padding: 12px 24px; border-radius: 30px; font-weight: 700; cursor: pointer; transition: 0.2s; }
.btn-upload-label:hover:not(.is-disabled) { background: #0369a1; }
.upload-status-text { font-size: 0.85rem; font-weight: 700; color: #0369a1; }
.dynamic-math-display-panel { background-color: #f8fafc; border: 2px dashed #cbd5e1; padding: 18px; border-radius: 10px; margin-top: 10px; }
.math-panel-title { font-size: 0.8rem; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 12px; }
.math-grid-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
.math-node-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 4px; }
.math-node-card.text-orange { border-color: #ffedd5; background: #fff7ed; color: #c2410c; }
.math-node-card.text-green { border-color: #dcfce7; background: #f0fdf4; color: #16a34a; }
.math-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; opacity: 0.8; }
.math-number { font-size: 1.3rem; font-weight: 900; }
.live-hero-preview-box { background-color: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; position: relative; margin-bottom: 12px; }
.main-preview-viewport { width: 100%; max-width: 320px; aspect-ratio: 1; border-radius: 8px; overflow: hidden; border: 1px solid #cbd5e1; background: #ffffff; }
.main-preview-viewport img { width: 100%; height: 100%; object-fit: cover; }
.preview-badge { position: absolute; top: 12px; left: 12px; background-color: #0f172a; color: #ffffff; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; padding: 4px 8px; border-radius: 4px; }
.thumb-flex-wrapper { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
.interactive-thumb-card { cursor: pointer; }
.interactive-thumb-card img { width: 76px; height: 76px; object-fit: cover; border-radius: 6px; border: 2px solid #cbd5e1; }
.interactive-thumb-card.is-currently-active img { border-color: #15803d; }
</style>