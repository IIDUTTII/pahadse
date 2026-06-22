<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { auth } from '../firebase.js'
import { uploadProductImage, fetchAllProductImages, deleteProductImage, fetchProductById, addProduct, updateProduct, fetchProductCategories, getStorageFileSizeLabel } from './db.js'

defineOptions({ name: 'ProductForm' })
const route = useRoute(), router = useRouter()

const isEditing = ref(false), rawId = ref(null), activeTab = ref('basic'), saving = ref(false), initializing = ref(true)
const isUploadingImages = ref(false), uploadStatusText = ref('')
const existingCategories = ref(['Spices & Herbs', 'Ghee & Oils', 'Organic Sweets', 'Himalayan Teas', 'Juices'])

// ✨ REMOVED Base Price and Base Weight
const getDefaultForm = () => ({
  name: '', shortDesc: '', description: '', category: 'Spices & Herbs', priorityOrder: 99,
  emoji: '📦', stock: null, isActive: false, discount: { isDiscounted: false, percent: 0 },
  reviewCount: 0, ratingAverage: 0.0, createdBy: 'ADMIN_USER', 
  imageUrls: [], benefits: [''], ingredients: [''], origin: '', howToUse: '', shelfLife: '', tags: [''],
  variants: [] // Mandarory now
})

const form = ref(getDefaultForm())
const storageImages = ref([]) 
const newExternalUrl = ref('')
const newVariant = ref({ type: 'Size', label: '', price: null })

// ✨ Preview calculation based on the FIRST variant
const previewBasePrice = computed(() => form.value.variants.length > 0 ? Number(form.value.variants[0].price) : 0)
const calculatedFinalPrice = computed(() => {
  if (!form.value.discount?.isDiscounted) return previewBasePrice.value
  const percentNode = Number(form.value.discount.percent) || 0
  return Math.round(previewBasePrice.value * (1 - percentNode / 100))
})
const calculatedSavingsAmount = computed(() => Math.max(previewBasePrice.value - calculatedFinalPrice.value, 0))

const formatBytes = (bytes) => {
    if(bytes === 0) return '0 Bytes';
    const k = 1024, dm = 2, sizes = ['Bytes', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

onMounted(() => {
  auth.onAuthStateChanged(async (user) => {
    if (!user) return router.push('/login')
    const productId = route.params.id

    try {
        const cats = await fetchProductCategories()
        if(cats.length > 0) existingCategories.value = cats
    } catch(e) {}

    if (productId && productId !== 'new') {
      isEditing.value = true; rawId.value = productId
      try {
        const p = await fetchProductById(productId)
        if (p) {
          form.value = {
            ...getDefaultForm(), ...p, discount: p.discount || { isDiscounted: false, percent: 0 },
            imageUrls: p.imageUrls || [], benefits: p.benefits?.length ? [...p.benefits] : [''],
            ingredients: p.ingredients?.length ? [...p.ingredients] : [''], variants: p.variants || []
          }
        }
        const urls = await fetchAllProductImages(productId)
        for (const url of urls) {
           let realSize = 'Unknown Size'
           try { realSize = await getStorageFileSizeLabel(url) } catch(e){}
           storageImages.value.push({ url, note: `DB Size: ${realSize}` })
        }
      } catch (e) { console.error("Fetch Error: ", e) }
    }
    initializing.value = false
  })
})

const addArrayItem = (field) => { if (!form.value[field]) form.value[field] = []; form.value[field].push('') }
const removeArrayItem = (field, idx) => { if (form.value[field]) form.value[field].splice(idx, 1) }

const addVariant = () => {
    if(!newVariant.value.label || !newVariant.value.price) return;
    form.value.variants.push({...newVariant.value})
    newVariant.value.label = ''; newVariant.value.price = null
}
const removeVariant = (idx) => { form.value.variants.splice(idx, 1) }

const handleLocalImageUpload = async (event) => {
  if (!isEditing.value) { alert("Please save Basic Info first!"); return; }
  const files = event.target.files
  if (!files || files.length === 0) return
  isUploadingImages.value = true

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!file.type.startsWith('image/')) continue
    try {
      uploadStatusText.value = `Compressing ${i + 1}/${files.length}...`
      const url = await uploadProductImage(file, rawId.value) 
      form.value.imageUrls.push(url)
      const realSize = await getStorageFileSizeLabel(url)
      storageImages.value.push({ url, note: `DB Size: ${realSize}` })
    } catch (error) { alert(`Upload failed: ${error.message}`) }
  }
  isUploadingImages.value = false; uploadStatusText.value = ''; event.target.value = ''
}

const removeStorageImage = async (url) => {
  if (!confirm("⚠️ Permanently delete this image from Storage?")) return
  try {
    isUploadingImages.value = true
    await deleteProductImage(url)
    form.value.imageUrls = form.value.imageUrls.filter(u => u !== url)
    storageImages.value = storageImages.value.filter(u => (u.url ? u.url !== url : u !== url))
  } catch(e) { alert("Error deleting: " + e.message) } finally { isUploadingImages.value = false }
}

const toggleSelection = (url) => {
  const idx = form.value.imageUrls.indexOf(url)
  if (idx > -1) form.value.imageUrls.splice(idx, 1)
  else form.value.imageUrls.push(url)
}
const isVisibleToUser = (url) => form.value.imageUrls.includes(url)
const makePrimary = (url) => {
  const arr = form.value.imageUrls; const idx = arr.indexOf(url)
  if (idx > 0) { arr.splice(idx, 1); arr.unshift(url) }
  else if (idx === -1) { arr.unshift(url) }
}
const getRawUrl = (img) => typeof img === 'object' ? img.url : img;
const getImgNote = (img) => typeof img === 'object' ? img.note : null;

const handleSubmit = async () => {
  // ✨ MUST HAVE AT LEAST 1 VARIANT
  if (form.value.variants.length === 0) {
    alert("You must add at least one Size or Weight variant (e.g., 250g - ₹500) to define the product's price.");
    activeTab.value = 'basic';
    return;
  }

  saving.value = true
  const clean = (arr) => (arr || []).filter(v => v?.trim())
  
  const payload = {
    name: form.value.name, shortDesc: form.value.shortDesc, description: form.value.description,
    category: form.value.category, emoji: form.value.emoji, priorityOrder: Number(form.value.priorityOrder),
    stock: Number(form.value.stock), isActive: form.value.isActive,
    discount: { isDiscounted: form.value.discount.isDiscounted, percent: Number(form.value.discount.percent) },
    reviewCount: Number(form.value.reviewCount), ratingAverage: Number(form.value.ratingAverage),
    createdBy: form.value.createdBy, imageUrls: clean(form.value.imageUrls),
    benefits: clean(form.value.benefits), ingredients: clean(form.value.ingredients),
    tags: clean(form.value.tags), origin: form.value.origin, howToUse: form.value.howToUse, shelfLife: form.value.shelfLife,
    variants: form.value.variants, updatedAt: new Date()
  }
  
  try {
    if (isEditing.value) { await updateProduct(rawId.value, payload) } 
    else { await addProduct(payload) }
    router.push('/admin')
  } catch (e) { alert('Error saving: ' + e.message) } 
  finally { saving.value = false }
}
</script>

<template>
  <div class="form-workspace-page">
    <div v-if="initializing" class="loading-state"><div class="spinner"></div><p>Loading Product Blueprint...</p></div>

    <div v-else class="form-container fade-in">
      <header class="form-header">
        <div>
          <button type="button" class="back-link-btn" @click="router.push('/admin')">← Back to Dashboard</button>
          <h2>{{ isEditing ? 'Modify Product Blueprint' : 'Register New Item' }}</h2>
        </div>
        <div class="tabs-row">
          <button type="button" :class="['tab-btn', { active: activeTab === 'basic' }]" @click.prevent="activeTab = 'basic'">📋 Basic Info</button>
          <button type="button" :class="['tab-btn', { active: activeTab === 'detail' }]" @click.prevent="activeTab = 'detail'">📝 Descriptions</button>
          <button type="button" :class="['tab-btn', { active: activeTab === 'media' }]" @click.prevent="activeTab = 'media'" :disabled="!isEditing">🖼️ Media</button>
        </div>
      </header>

      <form @submit.prevent="handleSubmit" class="core-himalayan-form">
        <div v-show="activeTab === 'basic'" class="grid-layout">
          <div class="input-group full-width"><label>Product Title Name *</label><input v-model="form.name" required /></div>
          <div class="input-group full-width"><label>Short Description (Home Page Subtitle) *</label><input v-model="form.shortDesc" required maxlength="60" /></div>

          <div class="input-group"><label>Category *</label>
             <input v-model="form.category" list="catList" required />
             <datalist id="catList"><option v-for="c in existingCategories" :key="c" :value="c"></option></datalist>
          </div>
          
          <div class="input-group"><label>Overall Available Stock</label><input v-model="form.stock" type="number" /></div>
          <div class="input-group"><label>Display Priority (1=Top)</label><input v-model="form.priorityOrder" type="number" /></div>
          <div class="input-group"><label>Shelf Life</label><input v-model="form.shelfLife" placeholder="e.g., 12 Months" /></div>

          <div class="divider full-width">Mandatory Pricing & Options (Sizes/Weights/Pieces)</div>
          <div class="full-width variants-builder-box">
             <div class="variants-row input-row">
                 <select v-model="newVariant.type" class="v-select">
                    <option value="Size">Size (e.g. XL, UK-8)</option>
                    <option value="Weight">Weight (e.g. 500g, 1L)</option>
                    <option value="Pack">Pack (e.g. Pack of 3)</option>
                 </select>
                 <input v-model="newVariant.label" placeholder="e.g. 500g" class="v-input" />
                 <input v-model="newVariant.price" type="number" placeholder="Price (₹)" class="v-input" />
                 <button type="button" class="btn-url-add" @click="addVariant">Add Variant</button>
             </div>
             <div class="variants-list" v-if="form.variants.length > 0">
                 <div class="v-badge" v-for="(v, i) in form.variants" :key="i">
                     <strong>{{v.type}}:</strong> {{v.label}} (₹{{v.price}})
                     <button type="button" @click="removeVariant(i)">✕</button>
                 </div>
             </div>
             <p v-else style="color:red; font-size:0.85rem; font-weight: bold; margin-top: 10px;">⚠️ You must add at least one option to set the price.</p>
          </div>
          
          <div class="divider full-width">Global Discount Promotion</div>
          <div class="input-group toggle-box"><label>Enable Discount</label><input type="checkbox" v-model="form.discount.isDiscounted" /></div>
          <div class="input-group" v-if="form.discount.isDiscounted"><label>Discount (%)</label><input v-model="form.discount.percent" type="number" min="0" max="100" /></div>
          
          <div class="full-width dynamic-math-display-panel" v-if="form.variants.length > 0 && form.discount.isDiscounted">
            <div class="math-panel-title">Preview on 1st Variant</div>
            <div class="math-grid-summary">
              <div class="math-node-card"><span class="math-label">Base</span><span class="math-number">₹{{ previewBasePrice }}</span></div>
              <div class="math-node-card text-orange"><span class="math-label">Reduction</span><span class="math-number">-₹{{ calculatedSavingsAmount }}</span></div>
              <div class="math-node-card text-green"><span class="math-label">Final Cost</span><span class="math-number">₹{{ calculatedFinalPrice }}</span></div>
            </div>
          </div>
        </div>

        <div v-show="activeTab === 'detail'" class="grid-layout">
          <div class="input-group full-width"><label>Full Detailed Description</label><textarea class="preserves-lines" v-model="form.description"></textarea></div>
          <div class="input-group full-width"><label>Directions / How To Use</label><textarea class="preserves-lines" v-model="form.howToUse"></textarea></div>
          <div class="input-group full-width"><label>Regional Origin</label><input v-model="form.origin" /></div>
          
          <div class="divider full-width">Benefits</div>
          <div class="full-width list-stack">
            <div v-for="(_, i) in form.benefits" :key="'b'+i" class="list-item-row"><input v-model="form.benefits[i]" /><button type="button" @click="removeArrayItem('benefits', i)" v-if="form.benefits.length > 1">✕</button></div>
            <button type="button" class="add-row-btn" @click="addArrayItem('benefits')">+ Add</button>
          </div>
          <div class="divider full-width">Ingredients</div>
          <div class="full-width list-stack">
            <div v-for="(_, i) in form.ingredients" :key="'ing'+i" class="list-item-row"><input v-model="form.ingredients[i]" /><button type="button" @click="removeArrayItem('ingredients', i)" v-if="form.ingredients.length > 1">✕</button></div>
            <button type="button" class="add-row-btn" @click="addArrayItem('ingredients')">+ Add</button>
          </div>
        </div>

        <div v-show="activeTab === 'media'" class="grid-layout">
          <div class="full-width live-hero-preview-box">
             <div class="preview-header-label">🛒 Home Page Preview</div>
             <div class="product-card mock-card">
                <div class="product-thumb">
                  <img v-if="form.imageUrls.length > 0" :src="form.imageUrls[0]" class="thumb-img" />
                  <div v-else class="emoji-fallback"><span>{{ form.emoji || '📦' }}</span></div>
                </div>
                <div class="product-body">
                  <h3 class="product-name">{{ form.name || 'Your Product Title' }}</h3>
                  <p class="product-desc">{{ form.shortDesc || 'Short description...' }}</p>
                  <div class="price-block">
                    <span class="product-price">Starts at ₹{{ calculatedFinalPrice || previewBasePrice || '0' }}</span>
                  </div>
                </div>
             </div>
          </div>

          <div class="full-width device-upload-box">
            <input type="file" multiple accept="image/*" @change="handleLocalImageUpload" :disabled="isUploadingImages" />
            <span v-if="uploadStatusText">{{ uploadStatusText }}</span>
          </div>

          <div class="full-width managed-image-grid">
             <div v-for="(imgItem, idx) in storageImages" :key="idx" :class="['managed-img-card', { 'is-primary-card': form.imageUrls[0] === getRawUrl(imgItem), 'is-hidden-card': !isVisibleToUser(getRawUrl(imgItem)) }]">
                <div class="img-wrapper">
                   <img :src="getRawUrl(imgItem)" />
                   <div v-if="getImgNote(imgItem)" class="compression-note">{{ getImgNote(imgItem) }}</div>
                </div>
                <div class="img-actions-tray">
                   <button type="button" class="action-btn make-primary" @click="makePrimary(getRawUrl(imgItem))">★</button>
                   <button type="button" class="action-btn toggle-vis" @click="toggleSelection(getRawUrl(imgItem))">👁️</button>
                   <button type="button" class="action-btn delete-img" @click="removeStorageImage(getRawUrl(imgItem))">🗑️</button>
                </div>
             </div>
          </div>
        </div>

        <div class="form-footer-actions">
          <button type="button" class="cancel-back-btn" @click="router.push('/admin')">Discard</button>
          <button type="submit" class="commit-btn" :disabled="saving || isUploadingImages">{{ saving ? 'Saving...' : 'Save Product' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Keeping UI exactly same as last version */
.form-workspace-page { min-height: 100vh; background-color: #f1f5f9; padding: 100px 20px 40px; box-sizing: border-box; font-family: system-ui, sans-serif; }
.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; color: #475569; }
.spinner { width: 40px; height: 40px; border: 4px solid #cbd5e1; border-top-color: #15803d; border-radius: 50%; animation: rot .8s linear infinite; }
@keyframes rot { to { transform: rotate(360deg); } }
.form-container { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 2px solid #cbd5e1; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); overflow: hidden; }
.form-header { padding: 24px; border-bottom: 2px solid #e2e8f0; background: #f8fafc; }
.back-link-btn { background: none; border: none; color: #475569; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 8px; }
.form-header h2 { margin: 0 0 16px; font-size: 1.5rem; color: #0f172a; font-weight: 800; }
.tabs-row { display: flex; gap: 8px; border-bottom: 2px solid #e2e8f0; }
.tab-btn { padding: 10px 16px; background: none; border: none; font-size: 0.9rem; font-weight: 700; color: #64748b; cursor: pointer; border-bottom: 3px solid transparent; }
.tab-btn.active { color: #15803d; border-bottom-color: #15803d; }
.tab-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.core-himalayan-form { padding: 32px; }
.grid-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.full-width { grid-column: 1 / -1; }
.divider { font-size: 0.85rem; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-top: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
.input-group { display: flex; flex-direction: column; gap: 6px; }
.input-group label { font-size: 0.9rem; font-weight: 700; color: #0f172a; }
.input-group input, .input-group select, .input-group textarea { padding: 12px; border: 2px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; background: #f8fafc; color: #0f172a; width: 100%; box-sizing: border-box; }
.input-group textarea { height: 110px; resize: vertical; }
.preserves-lines { white-space: pre-wrap; }
.toggle-box { flex-direction: row; justify-content: space-between; align-items: center; background: #f8fafc; border: 2px solid #cbd5e1; padding: 12px; border-radius: 8px; }
.variants-builder-box { background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #cbd5e1; }
.variants-row { display: flex; gap: 10px; margin-bottom: 12px; }
.v-select, .v-input { padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-family: inherit; }
.variants-list { display: flex; flex-wrap: wrap; gap: 10px; }
.v-badge { background: #ffffff; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 30px; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; }
.v-badge button { background: #fef2f2; color: #ef4444; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; }
.list-stack { display: flex; flex-direction: column; gap: 8px; }
.list-item-row { display: flex; gap: 8px; }
.add-row-btn { background: #f0fdf4; color: #15803d; border: 2px dashed #15803d; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 700; }
.form-footer-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; padding-top: 20px; border-top: 2px solid #e2e8f0; }
.commit-btn { background: #15803d; color: #fff; border: none; padding: 12px 32px; border-radius: 30px; cursor: pointer; font-weight: 800; box-shadow: 0 4px 12px rgba(21,128,61,0.2); }
.commit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.fade-in { animation: fIn 0.2s ease-out; }

/* Dashboard preview & Image Grid classes (identical to previous) */
.live-hero-preview-box { background-color: #f1f5f9; border: 2px dashed #94a3b8; border-radius: 12px; padding: 24px; display: flex; flex-direction: column; align-items: center; margin-bottom: 20px; }
.mock-card { width: 100%; max-width: 280px; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
.mock-card .product-thumb { height: 260px; background: #f8fafc; display: flex; justify-content: center; align-items: center; overflow: hidden; border-bottom: 1px solid #f1f5f9; }
.mock-card .thumb-img { width: 100%; height: 100%; object-fit: cover; }
.mock-card .product-body { padding: 16px; text-align: left; }
.mock-card .product-name { font-size: 16px; font-weight: 700; color: #0f2a1f; margin: 0 0 4px; }
.mock-card .product-desc { font-size: 12px; color: #5a6e52; margin: 0 0 12px; }
.mock-card .product-price { font-size: 18px; font-weight: 800; color: #c9a96e; }
.dynamic-math-display-panel { background-color: #f8fafc; border: 2px dashed #cbd5e1; padding: 18px; border-radius: 10px; margin-top: 10px; }
.math-grid-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
.math-node-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 4px; }
.math-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; opacity: 0.8; }
.math-number { font-size: 1.3rem; font-weight: 900; }
.device-upload-box { background: #f0fdf4; border: 2px dashed #86efac; border-radius: 12px; padding: 24px; text-align: center; }
.managed-image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-top: 8px; }
.managed-img-card { background: #fff; border: 2px solid #e2e8f0; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; position: relative; }
.img-wrapper { width: 100%; aspect-ratio: 1; background: #f1f5f9; display: flex; align-items: center; justify-content: center; position: relative;}
.img-wrapper img { width: 100%; height: 100%; object-fit: cover; }
.compression-note { position: absolute; bottom: 0; left: 0; width: 100%; background: rgba(0,0,0,0.8); color: white; font-size: 0.75rem; padding: 6px; text-align: center; z-index: 2; font-weight: 600; }
.img-actions-tray { display: flex; padding: 8px; gap: 8px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
.action-btn { flex: 1; padding: 8px 4px; border-radius: 6px; font-size: 0.8rem; font-weight: 700; cursor: pointer; border: none; }
/* ✨ ADD THIS TO THE BOTTOM OF YOUR PRODUCTEDIT.VUE <style> SECTION */
@media (max-width: 768px) {
  .form-workspace-page { padding: 90px 12px 40px; }
  .grid-layout { grid-template-columns: 1fr; gap: 16px; }
  .tabs-row { overflow-x: auto; white-space: nowrap; padding-bottom: 4px; }
  .form-container { border-radius: 8px; }
  .form-header { padding: 16px; }
  .core-himalayan-form { padding: 16px; }
  
  .math-grid-summary { grid-template-columns: 1fr; }
  .variants-row { flex-direction: column; gap: 8px; }
  .v-select, .v-input, .btn-url-add { width: 100%; box-sizing: border-box; }
  
  .managed-image-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
  .form-footer-actions { flex-direction: column; gap: 12px; }
  .cancel-back-btn, .commit-btn { width: 100%; text-align: center; }
}
</style>