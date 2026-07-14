<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  fetchLandingConfig,
  saveLandingConfig,
  uploadLandingImage,
  deleteLandingImage,
  fetchAboutConfig,
  saveAboutConfig,
  uploadAboutImage,
  deleteAboutImage
} from '../db.js'

const props = defineProps({ userRole: { type: String, default: 'user' } })

const loading = ref(true)
const activePage = ref('landing') // 'landing', 'about'
const activeSection = ref('cards') // section within a page

// Config state per page
const configs = ref({
  landing: null,
  about: null
})
const originalConfigs = ref({
  landing: null,
  about: null
})

// Card editing (landing page)
const editingCardId = ref(null)
const cardForm = ref({})

// File upload
const uploadProgress = ref(false)
const uploadError = ref('')

const isSuperAdmin = computed(() => props.userRole === 'superadmin')

// Card size/style options
const sizeOptions = [
  { value: 'sm', label: 'Small (200×400)' },
  { value: 'md', label: 'Medium (230×230)' },
  { value: 'lg', label: 'Large (280×280)' }
]
const styleOptions = [
  { value: 'distort', label: 'Liquid Distort' },
  { value: 'specular', label: 'Specular Glass' },
  { value: 'frosted', label: 'Simple Frosted' }
]

// Scattered images (landing)
const scatteredType = ref('desktop')
const newScatteredImage = ref(null)
const newScatteredPos = ref({ x: 50, y: 50, width: 20, rotation: 0 })

// Page definitions
const pages = [
  { id: 'landing', label: 'Landing Page', icon: '🏠', sections: [
    { id: 'cards', label: 'Cards', icon: '🃏' },
    { id: 'scattered', label: 'Scattered', icon: '🍃' },
    { id: 'hero', label: 'Hero', icon: '🦸' },
    { id: 'story', label: 'Story', icon: '📖' },
    { id: 'social', label: 'Social', icon: '🔗' }
  ]},
  { id: 'about', label: 'About Page', icon: '🏔️', sections: [
    { id: 'images', label: 'Images', icon: '🖼️' },
    { id: 'text', label: 'Text Content', icon: '📝' }
  ]}
]

// Sections for current page
const currentPageDef = computed(() => pages.find(p => p.id === activePage.value))
const currentSections = computed(() => currentPageDef.value?.sections || [])

// Load config for a page
async function loadConfig(pageId = activePage.value) {
  loading.value = true
  try {
    if (pageId === 'landing') {
      const data = await fetchLandingConfig()
      configs.value.landing = JSON.parse(JSON.stringify(data))
      originalConfigs.value.landing = JSON.parse(JSON.stringify(data))
    } else if (pageId === 'about') {
      const data = await fetchAboutConfig()
      configs.value.about = JSON.parse(JSON.stringify(data))
      originalConfigs.value.about = JSON.parse(JSON.stringify(data))
    }
  } catch (e) {
    console.error('Failed to load config:', e)
  } finally {
    loading.value = false
  }
}

// Watch page change
onMounted(async () => {
  await loadConfig('landing')
  await loadConfig('about')
})

function switchPage(pageId) {
  activePage.value = pageId
  activeSection.value = currentSections.value[0]?.id || ''
}

function switchSection(sectionId) {
  activeSection.value = sectionId
}

// Check if current page has changes
const hasChanges = computed(() => {
  const cfg = configs.value[activePage.value]
  const orig = originalConfigs.value[activePage.value]
  if (!cfg || !orig) return false
  return JSON.stringify(cfg) !== JSON.stringify(orig)
})

// --- Landing Page Card Editing ---
function editCard(card) {
  editingCardId.value = card.id
  cardForm.value = { ...card }
}

function saveCard() {
  const cfg = configs.value.landing
  if (!cfg) return
  const idx = cfg.cards.findIndex(c => c.id === editingCardId.value)
  if (idx >= 0) {
    cfg.cards[idx] = { ...cardForm.value }
    editingCardId.value = null
  }
}

function cancelEdit() {
  editingCardId.value = null
  cardForm.value = {}
}

// --- Image Upload Helpers ---
function getPlaceholder() {
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmMWYxIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='
}

async function uploadImage(file, context) {
  if (!file || !file.type.startsWith('image/')) {
    uploadError.value = 'Please select an image file'
    return null
  }
  if (file.size > 2 * 1024 * 1024) {
    uploadError.value = 'File too large. Maximum 2MB.'
    return null
  }

  uploadProgress.value = true
  uploadError.value = ''

  try {
    if (activePage.value === 'landing') {
      return await uploadLandingImage(file, context)
    } else if (activePage.value === 'about') {
      return await uploadAboutImage(file, context)
    }
  } catch (e) {
    console.error('Upload failed:', e)
    uploadError.value = 'Upload failed: ' + e.message
  } finally {
    uploadProgress.value = false
  }
  return null
}

async function deleteImage(url, context) {
  if (!url) return
  try {
    if (activePage.value === 'landing') {
      await deleteLandingImage(url)
    } else if (activePage.value === 'about') {
      await deleteAboutImage(url)
    }
  } catch (e) {
    console.warn('Delete failed:', e.message)
  }
}

// --- Landing Card Image Upload ---
async function uploadCardImage(cardId, file) {
  const url = await uploadImage(file, `card_${cardId}`)
  if (url) {
    const cfg = configs.value.landing
    const idx = cfg.cards.findIndex(c => c.id === cardId)
    if (idx >= 0) cfg.cards[idx].image = url
  }
}

async function removeCardImage(cardId) {
  const cfg = configs.value.landing
  const idx = cfg.cards.findIndex(c => c.id === cardId)
  if (idx >= 0 && cfg.cards[idx].image) {
    await deleteImage(cfg.cards[idx].image, `card_${cardId}`)
    cfg.cards[idx].image = ''
  }
}

// --- Landing Scattered Images ---
function addScatteredImage() {
  if (!newScatteredImage.value) return
  uploadScatteredImage(newScatteredImage.value)
  newScatteredImage.value = null
}

async function uploadScatteredImage(file) {
  const url = await uploadImage(file, `scattered_${scatteredType.value}`)
  if (url) {
    const cfg = configs.value.landing
    cfg.scatteredImages[scatteredType.value].push({
      src: url,
      x: newScatteredPos.value.x,
      y: newScatteredPos.value.y,
      width: newScatteredPos.value.width,
      rotation: newScatteredPos.value.rotation
    })
    newScatteredPos.value = { x: 50, y: 50, width: 20, rotation: 0 }
  }
}

function removeScatteredImage(type, index) {
  const cfg = configs.value.landing
  const img = cfg.scatteredImages[type][index]
  if (img?.src) deleteImage(img.src, `scattered_${type}`)
  cfg.scatteredImages[type].splice(index, 1)
}

// --- About Page Images ---
async function uploadAboutImg(key, file) {
  const url = await uploadImage(file, `about_${key}`)
  if (url) {
    configs.value.about.images[key] = url
  }
}

async function removeAboutImg(key) {
  const cfg = configs.value.about
  if (cfg.images[key]) {
    await deleteImage(cfg.images[key], `about_${key}`)
    cfg.images[key] = ''
  }
}

// --- Save All ---
async function saveAll() {
  if (!isSuperAdmin.value) {
    alert('❌ Only SuperAdmins can save configuration')
    return
  }

  const cfg = configs.value[activePage.value]
  if (!cfg) return

  try {
    let result
    if (activePage.value === 'landing') {
      result = await saveLandingConfig(cfg)
    } else if (activePage.value === 'about') {
      result = await saveAboutConfig(cfg)
    }

    if (result.success) {
      originalConfigs.value[activePage.value] = JSON.parse(JSON.stringify(cfg))
      alert(`✅ ${currentPageDef.value.label} configuration saved successfully!`)
    } else {
      alert('❌ Error saving: ' + result.error)
    }
  } catch (e) {
    alert('❌ Error saving: ' + e.message)
  }
}

function discardChanges() {
  const orig = originalConfigs.value[activePage.value]
  if (orig) {
    configs.value[activePage.value] = JSON.parse(JSON.stringify(orig))
  }
  editingCardId.value = null
  cardForm.value = {}
}

// --- Position Presets for Cards ---
function applyPreset(form, preset) {
  const card = configs.value.landing?.cards.find(c => c.id === editingCardId.value)
  if (!card) return

  const width = card.size === 'lg' ? 280 : card.size === 'md' ? 230 : 200
  const offset = width * 0.3

  switch (preset) {
    case 'left':
      form.imgOffsetX = -offset
      form.imgOffsetY = 0
      break
    case 'right':
      form.imgOffsetX = offset
      form.imgOffsetY = 0
      break
    case 'center':
      form.imgOffsetX = 0
      form.imgOffsetY = 0
      break
  }
}

function resetPosition(form) {
  form.imgOffsetX = 0
  form.imgOffsetY = 0
  form.imgScale = 1.05
}

// --- File Input Triggers ---
function triggerFileInput(id) {
  document.getElementById('file-' + id)?.click()
}

function onFileSelect(event, cardId) {
  const file = event.target.files[0]
  if (file) uploadCardImage(cardId, file)
  event.target.value = ''
}

function onDrop(event, cardId) {
  const file = event.dataTransfer.files[0]
  if (file) uploadCardImage(cardId, file)
}

function triggerScatteredFile() {
  document.getElementById('scattered-file')?.click()
}

function onScatteredFileSelect(event) {
  const file = event.target.files[0]
  if (file) newScatteredImage.value = file
  event.target.value = ''
}

function onScatteredDrop(event) {
  const file = event.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) newScatteredImage.value = file
}

function triggerAboutFile(key) {
  document.getElementById('about-file-' + key)?.click()
}

function onAboutFileSelect(event, key) {
  const file = event.target.files[0]
  if (file) uploadAboutImg(key, file)
  event.target.value = ''
}

function onAboutDrop(event, key) {
  const file = event.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) uploadAboutImg(key, file)
}
</script>

<template>
  <div class="content-manager-tab">
    <div class="ws-head">
      <div>
        <h2 class="ws-title">Content Manager</h2>
        <p class="ws-subtitle">Manage images and content for Landing Page & About Page</p>
      </div>
      <div class="ws-actions">
        <button v-if="hasChanges && isSuperAdmin" class="btn-primary" @click="saveAll" :disabled="loading">
          💾 Save Changes
        </button>
        <button v-if="hasChanges" class="btn-outline" @click="discardChanges">
          ↩️ Discard
        </button>
      </div>
    </div>

    <!-- Page Selector -->
    <div class="page-selector" v-if="!loading">
      <button
        v-for="page in pages"
        :key="page.id"
        :class="['page-btn', { active: activePage === page.id }]"
        @click="switchPage(page.id)"
      >
        {{ page.icon }} {{ page.label }}
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading configuration...</p>
    </div>

    <div v-else class="fade-in">
      <!-- Section Navigation -->
      <div class="section-nav">
        <button
          v-for="section in currentSections"
          :key="section.id"
          :class="['section-btn', { active: activeSection === section.id }]"
          @click="switchSection(section.id)"
        >
          {{ section.icon }} {{ section.label }}
        </button>
      </div>

      <!-- LANDING PAGE SECTIONS -->
      <template v-if="activePage === 'landing'">
        <!-- CARDS SECTION -->
        <div v-if="activeSection === 'cards'" class="section-content">
          <div class="section-header">
            <h3 class="subsection-title">🃏 Card Images & Settings</h3>
            <p class="subsection-desc">Manage the 5 glass cards shown on the landing page. Each card can have its own image, style, size, and positioning.</p>
          </div>

          <div class="cards-grid">
            <div v-for="card in configs.landing?.cards" :key="card.id" class="card-editor">
              <div class="card-preview">
                <div class="preview-frame" :class="['size-' + card.size, 'style-' + card.style]">
                  <img
                    v-if="card.image"
                    :src="card.image"
                    class="preview-img"
                    :style="{
                      transform: `translate(${card.imgOffsetX || 0}px, ${card.imgOffsetY || 0}px) scale(${card.imgScale || 1.05})`
                    }"
                  />
                  <span v-else class="preview-placeholder">🖼️ No Image</span>
                  <div class="preview-overlay">
                    <span class="card-badge">{{ card.label }}</span>
                    <span class="card-size">{{ card.size.toUpperCase() }}</span>
                  </div>
                </div>
              </div>

              <div class="card-controls">
                <div class="control-row">
                  <label>Label</label>
                  <input :value="editingCardId === card.id ? cardForm.label : card.label"
                         @input="editingCardId === card.id && (cardForm.label = $event.target.value)"
                         :disabled="editingCardId !== card.id" class="input-field" />
                </div>

                <div class="control-row">
                  <label>Style</label>
                  <select
                    :value="editingCardId === card.id ? cardForm.style : card.style"
                    @input="editingCardId === card.id && (cardForm.style = $event.target.value)"
                    :disabled="editingCardId !== card.id"
                    class="input-field"
                  >
                    <option v-for="opt in styleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>

                <div class="control-row">
                  <label>Size</label>
                  <select
                    :value="editingCardId === card.id ? cardForm.size : card.size"
                    @input="editingCardId === card.id && (cardForm.size = $event.target.value)"
                    :disabled="editingCardId !== card.id"
                    class="input-field"
                  >
                    <option v-for="opt in sizeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>

                <div class="control-row">
                  <label>Rotation (°)</label>
                  <input type="number" :value="editingCardId === card.id ? cardForm.rotation : card.rotation"
                         @input="editingCardId === card.id && (cardForm.rotation = $event.target.value)"
                         :disabled="editingCardId !== card.id" class="input-field" step="1" />
                </div>

                <div class="control-row">
                  <label>Z-Index Priority</label>
                  <input type="number" :value="editingCardId === card.id ? cardForm.initialZ : card.initialZ"
                         @input="editingCardId === card.id && (cardForm.initialZ = $event.target.value)"
                         :disabled="editingCardId !== card.id" class="input-field" min="1" max="10" />
                </div>

                <!-- Image Position Controls -->
                <div class="position-controls" v-if="editingCardId === card.id">
                  <h4>🖼️ Image Positioning</h4>
                  <div class="control-row">
                    <label>Offset X (px)</label>
                    <input type="number" v-model.number="cardForm.imgOffsetX" class="input-field" step="1" />
                  </div>
                  <div class="control-row">
                    <label>Offset Y (px)</label>
                    <input type="number" v-model.number="cardForm.imgOffsetY" class="input-field" step="1" />
                  </div>
                  <div class="control-row">
                    <label>Scale</label>
                    <input type="number" v-model.number="cardForm.imgScale" class="input-field" step="0.01" min="0.5" max="3" />
                  </div>
                  <div class="position-presets">
                    <button type="button" class="preset-btn" @click="applyPreset(cardForm, 'left')">📍 Left</button>
                    <button type="button" class="preset-btn" @click="applyPreset(cardForm, 'right')">📍 Right</button>
                    <button type="button" class="preset-btn" @click="applyPreset(cardForm, 'center')">📍 Center</button>
                    <button type="button" class="preset-btn" @click="resetPosition(cardForm)">↺ Reset</button>
                  </div>
                </div>

                <!-- Image Upload -->
                <div class="control-row image-upload">
                  <label>Card Image</label>
                  <div class="upload-area" @click="triggerFileInput(card.id)" @dragover.prevent @drop="onDrop($event, card.id)">
                    <input type="file" :id="'file-' + card.id" ref="fileInputs" accept="image/*" @change="onFileSelect($event, card.id)" class="file-input" />
                    <img v-if="card.image" :src="card.image" class="image-preview" />
                    <div v-else class="upload-placeholder">
                      <span class="upload-icon">☁️</span>
                      <span>{{ card.image ? 'Click to change' : 'Click to upload' }}</span>
                      <small>JPG, PNG, WebP • Max 2MB</small>
                    </div>
                    <div v-if="card.image" class="image-actions">
                      <button type="button" class="btn-sm btn-outline" @click.stop="removeCardImage(card.id)">🗑️ Remove</button>
                    </div>
                  </div>
                  <div v-if="uploadError" class="error-msg">{{ uploadError }}</div>
                  <div v-if="uploadProgress" class="progress-bar"><div class="progress-fill"></div></div>
                </div>

                <!-- Action Buttons -->
                <div class="card-actions">
                  <button v-if="editingCardId !== card.id" class="btn-edit" @click="editCard(card)">✏️ Edit</button>
                  <template v-else>
                    <button class="btn-primary" @click="saveCard">✓ Save</button>
                    <button class="btn-outline" @click="cancelEdit">✕ Cancel</button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SCATTERED IMAGES SECTION -->
        <div v-if="activeSection === 'scattered'" class="section-content">
          <div class="section-header">
            <h3 class="subsection-title">🍃 Scattered Background Images</h3>
            <p class="subsection-desc">Manage the leaf/branch images that float in the background. Different layouts for desktop, tablet, and mobile.</p>
          </div>

          <div class="scattered-tabs">
            <button
              v-for="type in ['desktop', 'tablet', 'mobile']"
              :key="type"
              :class="['scatter-tab', { active: scatteredType === type }]"
              @click="scatteredType = type"
            >
              {{ type.charAt(0).toUpperCase() + type.slice(1) }} ({{ configs.landing?.scatteredImages?.[type]?.length || 0 }})
            </button>
          </div>

          <!-- Upload New Scattered Image -->
          <div class="scattered-upload">
            <h4>Add New Image</h4>
            <div class="control-row">
              <label>Image</label>
              <div class="upload-area" @click="triggerScatteredFile" @dragover.prevent @drop="onScatteredDrop">
                <input type="file" id="scattered-file" ref="scatteredFileInput" accept="image/*" @change="onScatteredFileSelect" style="display: none;" />
                <img v-if="newScatteredImage" :src="URL.createObjectURL(newScatteredImage)" class="image-preview" />
                <div v-else class="upload-placeholder">
                  <span class="upload-icon">🍃</span>
                  <span>Click to upload leaf/branch image</span>
                </div>
              </div>
            </div>

            <div class="position-grid">
              <div class="control-row">
                <label>X Position (%)</label>
                <input type="number" v-model.number="newScatteredPos.x" class="input-field" step="0.5" min="-50" max="150" />
              </div>
              <div class="control-row">
                <label>Y Position (%)</label>
                <input type="number" v-model.number="newScatteredPos.y" class="input-field" step="0.5" min="-50" max="200" />
              </div>
              <div class="control-row">
                <label>Width (%)</label>
                <input type="number" v-model.number="newScatteredPos.width" class="input-field" step="0.5" min="5" max="100" />
              </div>
              <div class="control-row">
                <label>Rotation (°)</label>
                <input type="number" v-model.number="newScatteredPos.rotation" class="input-field" step="5" />
              </div>
            </div>

            <button class="btn-primary" @click="addScatteredImage" :disabled="!newScatteredImage || uploadProgress">
              {{ uploadProgress ? '⏳ Uploading...' : '➕ Add Image' }}
            </button>
          </div>

          <!-- Existing Scattered Images -->
          <div class="scattered-list">
            <div v-for="(img, index) in configs.landing?.scatteredImages?.[scatteredType]" :key="index" class="scattered-item">
              <img :src="img.src" class="scattered-thumb" />
              <div class="scattered-info">
                <div class="pos-info">X: {{ img.x }}% • Y: {{ img.y }}% • W: {{ img.width }}% • R: {{ img.rotation }}°</div>
                <div class="pos-controls">
                  <input type="number" v-model.number="img.x" class="input-field input-sm" step="0.5" placeholder="X%" />
                  <input type="number" v-model.number="img.y" class="input-field input-sm" step="0.5" placeholder="Y%" />
                  <input type="number" v-model.number="img.width" class="input-field input-sm" step="0.5" placeholder="W%" />
                  <input type="number" v-model.number="img.rotation" class="input-field input-sm" step="5" placeholder="Rot°" />
                </div>
              </div>
              <button class="btn-sm btn-del" @click="removeScatteredImage(scatteredType, index)">🗑️</button>
            </div>
          </div>
        </div>

        <!-- HERO SECTION -->
        <div v-if="activeSection === 'hero'" class="section-content">
          <div class="section-header">
            <h3 class="subsection-title">🦸 Hero Section</h3>
          </div>
          <div class="form-grid">
            <div class="control-row full">
              <label>Brand Name (e.g. "Pahad")</label>
              <input v-model="configs.landing.hero.title" class="input-field" />
            </div>
            <div class="control-row full">
              <label>Subtitle Character (e.g. "S")</label>
              <input v-model="configs.landing.hero.subtitle" class="input-field" maxlength="1" />
            </div>
            <div class="control-row full">
              <label>Tagline</label>
              <input v-model="configs.landing.hero.tagline" class="input-field" />
            </div>
          </div>
        </div>

        <!-- STORY SECTION -->
        <div v-if="activeSection === 'story'" class="section-content">
          <div class="section-header">
            <h3 class="subsection-title">📖 Our Story Section</h3>
          </div>
          <div class="form-grid">
            <div class="control-row full">
              <label>Eyebrow Text</label>
              <input v-model="configs.landing.story.eyebrow" class="input-field" />
            </div>
            <div class="control-row full">
              <label>Heading (HTML allowed)</label>
              <textarea v-model="configs.landing.story.heading" class="input-field" rows="3" style="font-family: inherit;"></textarea>
            </div>
            <div class="control-row full">
              <label>Body Text</label>
              <textarea v-model="configs.landing.story.body" class="input-field" rows="4" style="font-family: inherit;"></textarea>
            </div>
          </div>
        </div>

        <!-- SOCIAL SECTION -->
        <div v-if="activeSection === 'social'" class="section-content">
          <div class="section-header">
            <h3 class="subsection-title">🔗 Social Links</h3>
          </div>
          <div class="social-list">
            <div v-for="(link, index) in configs.landing.socialLinks" :key="index" class="social-item">
              <div class="control-row">
                <label>Emoji</label>
                <input v-model="link.emoji" class="input-field" maxlength="2" />
              </div>
              <div class="control-row">
                <label>Label</label>
                <input v-model="link.label" class="input-field" />
              </div>
              <div class="control-row">
                <label>URL</label>
                <input v-model="link.href" class="input-field" />
              </div>
              <button v-if="configs.landing.socialLinks.length > 1" class="btn-sm btn-del" @click="configs.landing.socialLinks.splice(index, 1)">🗑️ Remove</button>
            </div>
          </div>
          <button class="btn-outline" @click="configs.landing.socialLinks.push({ emoji: '🔗', label: 'New Link', href: '#' })">➕ Add Social Link</button>
        </div>
      </template>

      <!-- ABOUT PAGE SECTIONS -->
      <template v-if="activePage === 'about'">
        <!-- IMAGES SECTION -->
        <div v-if="activeSection === 'images'" class="section-content">
          <div class="section-header">
            <h3 class="subsection-title">🖼️ About Page Images</h3>
            <p class="subsection-desc">Manage all images used on the About page. Click to upload or replace.</p>
          </div>

          <div class="about-images-grid">
            <div v-for="(imgKey, index) in aboutImageKeys" :key="imgKey" class="about-image-editor">
              <div class="about-image-preview">
                <img v-if="configs.about?.images?.[imgKey]"
                     :src="configs.about.images[imgKey]"
                     class="about-preview-img"
                     alt="About page {{ imgKey }} image" />
                <div v-else class="about-preview-placeholder">
                  <span class="placeholder-icon">🏔️</span>
                  <span>{{ imageLabels[imgKey] }}</span>
                  <small>No image set</small>
                </div>
              </div>
              <div class="about-image-controls">
                <div class="control-row">
                  <label>{{ imageLabels[imgKey] }}</label>
                  <div class="upload-area about-upload" @click="triggerAboutFile(imgKey)" @dragover.prevent @drop="onAboutDrop($event, imgKey)">
                    <input type="file" :id="'about-file-' + imgKey" accept="image/*" @change="onAboutFileSelect($event, imgKey)" style="display: none;" />
                    <img v-if="configs.about?.images?.[imgKey]" :src="configs.about.images[imgKey]" class="image-preview" />
                    <div v-else class="upload-placeholder">
                      <span class="upload-icon">☁️</span>
                      <span>Click to upload</span>
                      <small>JPG, PNG, WebP • Max 2MB</small>
                    </div>
                    <div v-if="configs.about?.images?.[imgKey]" class="image-actions">
                      <button type="button" class="btn-sm btn-outline" @click.stop="removeAboutImg(imgKey)">🗑️ Remove</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TEXT CONTENT SECTION -->
        <div v-if="activeSection === 'text'" class="section-content">
          <div class="section-header">
            <h3 class="subsection-title">📝 About Page Text Content</h3>
            <p class="subsection-desc">Edit the textual content of the About page sections.</p>
          </div>

          <div class="form-grid">
            <div class="control-row full">
              <label>Hero Title</label>
              <input v-model="configs.about.text.heroTitle" class="input-field" />
            </div>
            <div class="control-row full">
              <label>Hero Subtitle</label>
              <input v-model="configs.about.text.heroSubtitle" class="input-field" />
            </div>
            <div class="control-row full">
              <label>Section 1 Title</label>
              <input v-model="configs.about.text.section1Title" class="input-field" />
            </div>
            <div class="control-row full">
              <label>Section 1 Body</label>
              <textarea v-model="configs.about.text.section1Body" class="input-field" rows="4" style="font-family: inherit;"></textarea>
            </div>
            <div class="control-row full">
              <label>Section 2 Title</label>
              <input v-model="configs.about.text.section2Title" class="input-field" />
            </div>
            <div class="control-row full">
              <label>Section 2 Body</label>
              <textarea v-model="configs.about.text.section2Body" class="input-field" rows="4" style="font-family: import;"></textarea>
            </div>
            <div class="control-row full">
              <label>Founder Story Title</label>
              <input v-model="configs.about.text.founderTitle" class="input-field" />
            </div>
            <div class="control-row full">
              <label>Founder Story Body</label>
              <textarea v-model="configs.about.text.founderBody" class="input-field" rows="5" style="font-family: inherit;"></textarea>
            </div>
            <div class="control-row full">
              <label>Founder Quote</label>
              <textarea v-model="configs.about.text.founderQuote" class="input-field" rows="3" style="font-family: inherit;"></textarea>
            </div>
            <div class="control-row full">
              <label>Founder Name</label>
              <input v-model="configs.about.text.founderName" class="input-field" />
            </div>
            <div class="control-row full">
              <label>Community Section Text</label>
              <textarea v-model="configs.about.text.communityText" class="input-field" rows="3" style="font-family: inherit;"></textarea>
            </div>
            <div class="control-row full">
              <label>Thank You Title</label>
              <input v-model="configs.about.text.thankYouTitle" class="input-field" />
            </div>
            <div class="control-row full">
              <label>Thank You Body</label>
              <textarea v-model="configs.about.text.thankYouBody" class="input-field" rows="4" style="font-family: inherit;"></textarea>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.landing-tab { padding: 0; }
.ws-head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.ws-title { font-size: 1.6rem; font-weight: 800; color: #0F172A; margin: 0; }
.ws-subtitle { color: #64748B; font-size: 0.9rem; margin-top: 4px; }
.ws-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

.section-nav { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; background: #fff; padding: 12px; border-radius: 12px; border: 1px solid #E2E8F0; }
.section-btn { padding: 8px 16px; border: none; background: transparent; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; color: #64748B; transition: all 0.2s; }
.section-btn:hover { background: #F1F5F9; color: #0F172A; }
.section-btn.active { background: #0F2A1F; color: white; }

.section-content { background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; padding: 24px; }
.subsection-title { font-size: 1.1rem; font-weight: 700; color: #0F172A; margin: 0 0 4px; }
.subsection-desc { color: #64748B; font-size: 0.85rem; margin: 0 0 20px; }

.loading-state { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 60px; color: #3D5A40; font-weight: 600; }
.spinner { width: 34px; height: 34px; border: 3px solid #E7E5E2; border-top-color: #3D5A40; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.fade-in { animation: fIn 0.3s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

/* CARDS GRID */
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px; }
.card-editor { background: #FAFAF8; border: 1px solid #E7E5E2; border-radius: 12px; overflow: hidden; }
.card-preview { background: #f8f9fa; padding: 16px; border-bottom: 1px solid #E7E5E2; }
.preview-frame { position: relative; width: 100%; aspect-ratio: 1; max-width: 300px; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
.preview-frame.size-lg { max-width: 280px; }
.preview-frame.size-md { max-width: 230px; }
.preview-frame.size-sm { max-width: 200px; aspect-ratio: 1/2; }
.preview-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.preview-placeholder { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: #f1f1f1; color: #999; font-size: 0.85rem; }
.preview-overlay { position: absolute; bottom: 8px; left: 8px; right: 8px; display: flex; gap: 6px; flex-wrap: wrap; }
.card-badge { background: rgba(0,0,0,0.6); color: white; padding: 2px 8px; border-radius: 20px; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; }
.card-size { background: rgba(255,255,255,0.9); color: #1a2a1a; padding: 2px 8px; border-radius: 20px; font-size: 0.6rem; font-weight: 700; }

/* CARD CONTROLS */
.card-controls { padding: 16px; }
.control-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.control-row label { font-size: 0.75rem; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
.input-field { padding: 10px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-family: inherit; font-size: 0.9rem; background: #fff; transition: border-color 0.2s; }
.input-field:focus { outline: none; border-color: #0F2A1F; }
.input-sm { padding: 6px 8px; font-size: 0.8rem; }

.position-controls { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
.position-controls h4 { margin: 0 0 12px; font-size: 0.8rem; font-weight: 700; color: #15803D; }
.position-presets { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.preset-btn { padding: 6px 12px; background: #fff; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.preset-btn:hover { border-color: #0F2A1F; background: #F8FAFC; }

.image-upload { }
.upload-area { position: relative; border: 2px dashed #CBD5E1; border-radius: 12px; cursor: pointer; transition: all 0.2s; min-height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; }
.upload-area:hover { border-color: #0F2A1F; background: #F8FAFC; }
.upload-area img.image-preview { max-width: 100%; max-height: 150px; object-fit: contain; border-radius: 8px; }
.upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #94A3B8; text-align: center; }
.upload-icon { font-size: 2rem; }
.upload-placeholder small { font-size: 0.7rem; color: #CBD5E1; }
.image-actions { position: absolute; top: 8px; right: 8px; display: flex; gap: 6px; }
.file-input { display: none; }

.card-actions { display: flex; gap: 8px; margin-top: 8px; }
.btn-primary { background: #0F2A1F; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.9rem; transition: all 0.2s; flex: 1; }
.btn-primary:hover:not(:disabled) { background: #1a3d2e; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-edit { background: #F1F5F9; color: #0F172A; border: 1px solid #CBD5E1; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; flex: 1; }
.btn-edit:hover { background: #E2E8F0; }
.btn-outline { background: #ffffff; color: #0f172a; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; flex: 1; }
.btn-outline:hover { border-color: #0F2A1F; background: #f8fafc; }
.btn-sm { padding: 6px 12px; font-size: 0.8rem; }
.btn-del { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; padding: 6px 12px; border-radius: 6px; font-weight: 700; cursor: pointer; }
.btn-del:hover { background: #FEE2E2; }

.error-msg { color: #DC2626; font-size: 0.8rem; margin-top: 6px; }
.progress-bar { height: 4px; background: #E2E8F0; border-radius: 2px; overflow: hidden; margin-top: 8px; }
.progress-fill { height: 100%; background: #0F2A1F; animation: progress 1.5s ease-in-out infinite; }
@keyframes progress { 0% { width: 0%; transform: translateX(-100%); } 100% { width: 100%; transform: translateX(0); } }

/* SCATTERED TABS */
.scattered-tabs { display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; }
.scatter-tab { padding: 8px 16px; background: transparent; border: none; border-radius: 8px 8px 0 0; cursor: pointer; font-weight: 600; font-size: 0.85rem; color: #64748B; transition: all 0.2s; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.scatter-tab:hover { color: #0F172A; background: #F1F5F9; }
.scatter-tab.active { color: #0F2A1F; border-bottom-color: #0F2A1F; }

.scattered-upload { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
.scattered-upload h4 { margin: 0 0 16px; font-size: 0.9rem; font-weight: 700; color: #0F172A; }
.position-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin: 16px 0; }

.scattered-list { display: flex; flex-direction: column; gap: 12px; }
.scattered-item { display: flex; align-items: center; gap: 16px; padding: 12px; background: #FAFAF8; border: 1px solid #E7E5E2; border-radius: 10px; }
.scattered-thumb { width: 60px; height: 60px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
.scattered-info { flex: 1; min-width: 0; }
.pos-info { font-size: 0.75rem; color: #64748B; font-family: monospace; margin-bottom: 8px; }
.pos-controls { display: flex; gap: 8px; flex-wrap: wrap; }

.social-list { display: flex; flex-direction: column; gap: 16px; }
.social-item { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; padding: 16px; background: #FAFAF8; border: 1px solid #E7E5E2; border-radius: 10px; }
.social-item .control-row { flex: 1; min-width: 180px; margin-bottom: 0; }

.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.control-row.full { grid-column: 1 / -1; }

/* Page Selector */
.page-selector { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; background: #fff; padding: 12px; border-radius: 12px; border: 1px solid #E2E8F0; }
.page-btn { padding: 10px 20px; border: none; background: transparent; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; color: #64748B; transition: all 0.2s; }
.page-btn:hover { background: #F1F5F9; color: #0F172A; }
.page-btn.active { background: #0F2A1F; color: white; }

/* ABOUT PAGE IMAGES GRID */
.about-images-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
.about-image-editor { background: #FAFAF8; border: 1px solid #E7E5E2; border-radius: 12px; overflow: hidden; }
.about-image-preview { position: relative; aspect-ratio: 4/3; background: #f8f9fa; overflow: hidden; }
.about-preview-img { width: 100%; height: 100%; object-fit: cover; }
.about-preview-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; background: #f1f1f1; color: #999; text-align: center; padding: 20px; }
.about-preview-placeholder .placeholder-icon { font-size: 3rem; margin-bottom: 8px; }
.about-preview-placeholder span { font-weight: 600; font-size: 1rem; }
.about-preview-placeholder small { color: #CBD5E1; }

.about-image-controls { padding: 16px; }
.about-upload { transition: border-color 0.2s; }
.about-upload:hover { border-color: #0F2A1F; }

@media (max-width: 768px) {
  .cards-grid { grid-template-columns: 1fr; }
  .section-nav { justify-content: center; }
  .form-grid { grid-template-columns: 1fr; }
  .scattered-item { flex-direction: column; align-items: flex-start; }
  .scattered-thumb { width: 100%; height: 120px; }
  .pos-controls { width: 100%; }
  .page-selector { justify-content: center; }
  .about-images-grid { grid-template-columns: 1fr; }
}
</style>