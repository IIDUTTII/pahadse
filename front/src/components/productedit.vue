<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { auth, db } from '../firebase.js'
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { uploadProductImage, fetchAllProductImages, deleteProductImage } from './db.js' // 👈 IMPORT FROM DB.JS
import imageCompression from 'browser-image-compression'

defineOptions({ name: 'ProductForm' })
const route = useRoute(), router = useRouter()

const isEditing = ref(false), rawId = ref(null), activeTab = ref('basic'), saving = ref(false), initializing = ref(true)
const isUploadingImages = ref(false), uploadStatusText = ref('')

const getDefaultForm = () => ({
  name: '', description: '', price: 0, weight: '', category: 'Spices & Herbs',
  emoji: '📦', stock: 0, isActive: false, discount: { isDiscounted: false, percent: 0 },
  reviewCount: 0, ratingAverage: 0.0, createdBy: 'ADMIN_USER', 
  imageUrls: [], benefits: [''], ingredients: [''], origin: '', howToUse: '', shelfLife: '', tags: [''],
})

const form = ref(getDefaultForm())
const storageImages = ref([]) // 👈 SAARI IMAGES JO FIREBASE STORAGE MEIN HAIN
const newExternalUrl = ref('')

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
      isEditing.value = true; rawId.value = productId
      try {
        const snap = await getDoc(doc(db, 'products', productId))
        if (snap.exists()) {
          const p = snap.data()
          form.value = {
            ...getDefaultForm(), ...p,
            discount: p.discount || { isDiscounted: false, percent: 0 },
            imageUrls: p.imageUrls || [],
            benefits: p.benefits?.length ? [...p.benefits] : [''],
            ingredients: p.ingredients?.length ? [...p.ingredients] : [''],
            tags: p.tags?.length ? [...p.tags] : [''],
          }
        }
        // ✨ Load images directly from storage folder for this product
        storageImages.value = await fetchAllProductImages(productId)
      } catch (e) { console.error("Fetch Error: ", e) }
    }
    initializing.value = false
  })
})

const addArrayItem = (field) => { if (!form.value[field]) form.value[field] = []; form.value[field].push('') }
const removeArrayItem = (field, idx) => { if (form.value[field]) form.value[field].splice(idx, 1) }

// Upload local file
const handleLocalImageUpload = async (event) => {
  const files = event.target.files
  if (!files || files.length === 0) return
  isUploadingImages.value = true
  const folderId = rawId.value || `temp_${Date.now()}`

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!file.type.startsWith('image/')) continue
    try {
      uploadStatusText.value = `Processing ${i + 1}/${files.length}...`
      const url = await uploadProductImage(file, folderId)
      form.value.imageUrls.push(url)
      storageImages.value.push(url) // Add to storage preview
    } catch (error) { alert(`Upload failed: ${error.message}`) }
  }
  isUploadingImages.value = false; uploadStatusText.value = ''; event.target.value = ''
}

// ✨ Permanently delete from Storage & Array
const removeStorageImage = async (url) => {
  if (!confirm("⚠️ Permanently delete image from storage and references?")) return
  try {
    isUploadingImages.value = true
    await deleteProductImage(url)
    // Remove from UI arrays
    form.value.imageUrls = form.value.imageUrls.filter(u => u !== url)
    storageImages.value = storageImages.value.filter(u => u !== url)
    alert("Image permanently deleted.")
  } catch(e) {
    alert("Error deleting: " + e.message)
  } finally { isUploadingImages.value = false }
}

const toggleSelection = (url) => {
  const idx = form.value.imageUrls.indexOf(url)
  if (idx > -1) {
    form.value.imageUrls.splice(idx, 1) // Hide from user
  } else {
    form.value.imageUrls.push(url) // Show to user
  }
}

const isVisibleToUser = (url) => form.value.imageUrls.includes(url)

const makePrimary = (url) => {
  const arr = form.value.imageUrls
  const idx = arr.indexOf(url)
  if (idx > 0) {
    arr.splice(idx, 1)
    arr.unshift(url) // Moves to index 0
  } else if (idx === -1) {
    arr.unshift(url) // Add and make primary
  }
}

const addExternalUrl = () => {
  if(newExternalUrl.value.trim()){
    form.value.imageUrls.push(newExternalUrl.value.trim())
    storageImages.value.push(newExternalUrl.value.trim())
    newExternalUrl.value = ''
  }
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
    if (isEditing.value) { await updateDoc(doc(db, 'products', rawId.value), payload) } 
    else { payload.createdAt = serverTimestamp(); await addDoc(collection(db, 'products'), payload) }
    router.push('/admin')
  } catch (e) { alert('Error saving product: ' + e.message) } 
  finally { saving.value = false }
}
</script>

<template>
  <div class="form-workspace-page">
    <div v-if="initializing" class="loading-state"><div class="spinner"></div><p>Initializing layers...</p></div>

    <div v-else class="form-container fade-in">
      <header class="form-header">
        <div>
          <button type="button" class="back-link-btn" @click="router.push('/admin')">← Back</button>
          <h2>{{ isEditing ? 'Modify Product Blueprint' : 'Register New Harvest Item' }}</h2>
        </div>
        <div class="tabs-row">
          <button type="button" :class="['tab-btn', { active: activeTab === 'basic' }]" @click.prevent="activeTab = 'basic'">📋 Basic Info</button>
          <button type="button" :class="['tab-btn', { active: activeTab === 'detail' }]" @click.prevent="activeTab = 'detail'">📝 Descriptions</button>
          <button type="button" :class="['tab-btn', { active: activeTab === 'media' }]" @click.prevent="activeTab = 'media'">🖼️ Media Assets</button>
        </div>
      </header>

      <form @submit.prevent="handleSubmit" class="core-himalayan-form">
        <div v-show="activeTab === 'basic'" class="grid-layout">
          <div class="input-group full-width"><label>Product Title Name *</label><input v-model="form.name" required /></div>
          <div class="input-group"><label>Emoji Identifier</label><input v-model="form.emoji" /></div>
          <div class="input-group"><label>Category</label><select v-model="form.category"><option>Spices & Herbs</option><option>Ghee & Oils</option></select></div>
          <div class="input-group"><label>Price (INR) *</label><input v-model="form.price" type="number" min="0" required /></div>
          <div class="input-group"><label>Stock *</label><input v-model="form.stock" type="number" required /></div>
          <div class="input-group"><label>Weight</label><input v-model="form.weight" /></div>
          <div class="divider full-width">Promotion</div>
          <div class="input-group toggle-box"><label>Discount</label><input type="checkbox" v-model="form.discount.isDiscounted" /></div>
        </div>

        <div v-show="activeTab === 'detail'" class="grid-layout">
          <div class="input-group full-width"><label>Description</label><textarea v-model="form.description"></textarea></div>
        </div>

        <div v-show="activeTab === 'media'" class="grid-layout">
          <div class="full-width device-upload-box">
            <h4>Upload New Images</h4>
            <div class="upload-btn-wrapper">
              <label class="btn-upload-label" :class="{ 'is-disabled': isUploadingImages }">
                <span>{{ isUploadingImages ? 'Processing...' : '📁 Select Images' }}</span>
                <input type="file" multiple accept="image/*" @change="handleLocalImageUpload" :disabled="isUploadingImages" hidden />
              </label>
              <span v-if="uploadStatusText" class="upload-status-text">⏳ {{ uploadStatusText }}</span>
            </div>
          </div>

          <div class="full-width external-url-box">
            <h4>Or Add Internet Image URL</h4>
            <div class="url-input-row">
              <input v-model="newExternalUrl" type="url" placeholder="https://..." class="c-input" @keyup.enter="addExternalUrl" />
              <button type="button" class="btn-url-add" @click="addExternalUrl">Bind URL</button>
            </div>
          </div>

          <div class="divider full-width">All Stored Assets ({{ storageImages.length }})</div>

          <div class="full-width managed-image-grid">
             <div v-if="storageImages.length === 0" class="empty-images-note">No images attached yet.</div>
             
             <div v-for="(url, idx) in storageImages" :key="idx" :class="['managed-img-card', { 'is-primary-card': form.imageUrls[0] === url, 'is-hidden-card': !isVisibleToUser(url) }]">
                <div class="img-wrapper">
                   <img :src="url" alt="Product Visual" />
                   <span v-if="form.imageUrls[0] === url" class="primary-badge">⭐ PRIMARY</span>
                   <span v-if="!isVisibleToUser(url)" class="hidden-badge">👁️ HIDDEN</span>
                </div>
                <div class="img-actions-tray">
                   <button type="button" class="action-btn make-primary" @click="makePrimary(url)">★ Primary</button>
                   <button type="button" class="action-btn toggle-vis" @click="toggleSelection(url)">{{ isVisibleToUser(url) ? 'Hide' : 'Show' }}</button>
                   <button type="button" class="action-btn delete-img" @click="removeStorageImage(url)" :disabled="isUploadingImages">🗑️ Del</button>
                </div>
             </div>
          </div>
        </div>

        <div class="form-footer-actions">
          <button type="button" class="cancel-back-btn" @click="router.push('/admin')">Discard</button>
          <button type="submit" class="commit-btn" :disabled="saving || isUploadingImages">
            {{ saving ? 'Saving...' : isEditing ? 'Commit Changes' : 'Publish Product' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.form-workspace-page { min-height: 100vh; background-color: #f1f5f9; padding: 100px 20px 40px; font-family: system-ui, sans-serif; }
.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; }
.spinner { width: 40px; height: 40px; border: 4px solid #cbd5e1; border-top-color: #15803d; border-radius: 50%; animation: rot .8s linear infinite; }
@keyframes rot { to { transform: rotate(360deg); } }
.form-container { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 2px solid #cbd5e1; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); overflow: hidden; }
.form-header { padding: 24px; border-bottom: 2px solid #e2e8f0; background: #f8fafc; }
.back-link-btn { background: none; border: none; color: #475569; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 8px; }
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
.input-group input, .input-group select, .input-group textarea { padding: 12px; border: 2px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; background: #f8fafc; color: #0f172a; width: 100%; }
.input-group textarea { height: 110px; resize: vertical; }
.toggle-box { flex-direction: row; justify-content: space-between; align-items: center; background: #f8fafc; border: 2px solid #cbd5e1; padding: 12px; border-radius: 8px; }
.form-footer-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; padding-top: 20px; border-top: 2px solid #e2e8f0; }
.cancel-back-btn { background: #fff; color: #0f172a; border: 2px solid #cbd5e1; padding: 12px 24px; border-radius: 30px; cursor: pointer; font-weight: 700; }
.commit-btn { background: #15803d; color: #fff; border: none; padding: 12px 32px; border-radius: 30px; cursor: pointer; font-weight: 800; }
.commit-btn:disabled { opacity: 0.6; }

.device-upload-box { background: #f0fdf4; border: 2px dashed #86efac; border-radius: 12px; padding: 24px; text-align: center; }
.device-upload-box h4 { margin: 0 0 12px; color: #166534; font-weight: 800; }
.btn-upload-label { background: #16a34a; color: white; padding: 12px 24px; border-radius: 30px; font-weight: 700; cursor: pointer; }
.managed-image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-top: 8px; }
.empty-images-note { grid-column: 1/-1; text-align: center; padding: 40px; border: 2px dashed #cbd5e1; border-radius: 12px; color: #64748b; font-weight: 600; }
.managed-img-card { background: #fff; border: 2px solid #e2e8f0; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
.managed-img-card.is-primary-card { border-color: #16a34a; box-shadow: 0 4px 12px rgba(22,163,74,0.15); }
.managed-img-card.is-hidden-card { opacity: 0.6; border-color: #cbd5e1; }
.img-wrapper { width: 100%; aspect-ratio: 1; position: relative; background: #f1f5f9; }
.img-wrapper img { width: 100%; height: 100%; object-fit: cover; }
.primary-badge { position: absolute; top: 10px; left: 10px; background: #16a34a; color: white; font-size: 0.7rem; font-weight: 800; padding: 4px 10px; border-radius: 4px; z-index: 2; }
.hidden-badge { position: absolute; top: 10px; right: 10px; background: #64748b; color: white; font-size: 0.7rem; font-weight: 800; padding: 4px 10px; border-radius: 4px; z-index: 2; }
.img-actions-tray { display: flex; padding: 8px; gap: 8px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
.action-btn { flex: 1; padding: 8px 4px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer; border: none; }
.make-primary { background: #e2e8f0; }
.toggle-vis { background: #f1f5f9; }
.delete-img { background: #fef2f2; color: #dc2626; }
</style>