<script setup>
/**
 * User.vue — Modern Minimalist Account Management
 * Redesigned with clean typography, soft colors, and generous whitespace
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth, storage, db } from '../firebase.js'
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { doc, onSnapshot, updateDoc, setDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'
import imageCompression from 'browser-image-compression'
import { addNewUserAddress, removeUserAddressFromDb, modifyUserAddressInDb } from './db.js'

defineOptions({ name: 'User' })
const router = useRouter()

const user = ref(null)
const activeView = ref('profile')
const initializing = ref(true)
const userProfileDoc = ref(null)

const isEditingName = ref(false)
const displayName = ref('')
const isUploading = ref(false)

const addressForm = ref({
  label: 'Home',
  fullName: '',
  phone: '',
  streetAddress: '',
  city: '',
  state: 'Himachal Pradesh',
  pincode: ''
})
const addressErrors = ref({})
const editingAddressId = ref(null)
const showAddressForm = ref(false)

const supportMessages = ref([])
const newMessage = ref('')
const isSending = ref(false)
let unsubscribeChat = null

onMounted(() => {
  onAuthStateChanged(auth, (currentUser) => {
    if (!currentUser) {
      user.value = null
      initializing.value = false
      return
    }
    user.value = currentUser
    displayName.value = currentUser.displayName || ''

    onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      if (snap.exists()) userProfileDoc.value = snap.data()
      initializing.value = false
    })

    unsubscribeChat = onSnapshot(doc(db, 'supportChats', currentUser.uid), (snap) => {
      if (snap.exists()) supportMessages.value = snap.data().messages || []
    })
  })
})

onUnmounted(() => { if (unsubscribeChat) unsubscribeChat() })

const views = [
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'addresses', label: 'Addresses', icon: 'map-pin' },
  { id: 'support', label: 'Support', icon: 'message-circle' }
]

const icons = {
  user: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  'map-pin': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  'message-circle': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
  edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  camera: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="12" r="4"/></svg>',
  logout: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  send: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  chevronDown: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>'
}

const saveProfile = async () => {
  if (!displayName.value.trim()) return
  isUploading.value = true
  try {
    await updateProfile(auth.currentUser, { displayName: displayName.value.trim() })
    await updateDoc(doc(db, 'users', user.value.uid), { displayName: displayName.value.trim() })
    user.value = { ...auth.currentUser }
    isEditingName.value = false
  } catch (e) { alert(e.message) }
  isUploading.value = false
}

const uploadAvatar = async (e) => {
  const file = e.target.files[0]
  if (!file || !file.type.startsWith('image/')) return
  try {
    isUploading.value = true
    const compressed = await imageCompression(file, { maxSizeMB: 0.2, maxWidthOrHeight: 400, useWebWorker: true })
    const ext = file.name.split('.').pop()
    const ref = storageRef(storage, `avatars/${user.value.uid}/profile.${ext}`)
    await uploadBytes(ref, compressed)
    const url = await getDownloadURL(ref)
    await updateProfile(auth.currentUser, { photoURL: url })
    await updateDoc(doc(db, 'users', user.value.uid), { photoURL: url })
    user.value = { ...auth.currentUser, photoURL: url + '?t=' + Date.now() }
  } catch (e) { alert('Upload failed: ' + e.message) }
  isUploading.value = false
}

const normalizedPhone = (p = '') => String(p ?? '').replace(/\D/g, '').slice(-10)

const validateAddress = () => {
  const f = addressForm.value
  const errors = {}
  if (!f.fullName?.trim()) errors.fullName = 'Required'
  const phone = normalizedPhone(f.phone)
  if (!phone || !/^\d{10}$/.test(phone)) errors.phone = 'Valid 10-digit number required'
  if (!f.streetAddress?.trim()) errors.streetAddress = 'Required'
  if (!f.city?.trim()) errors.city = 'Required'
  if (!f.pincode?.trim() || !/^\d{6}$/.test(f.pincode)) errors.pincode = '6 digits required'
  addressErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveAddress = async () => {
  if (!validateAddress()) return
  try {
    if (editingAddressId.value) {
      await modifyUserAddressInDb(editingAddressId.value, { ...addressForm.value })
    } else {
      await addNewUserAddress({ ...addressForm.value })
    }
    closeAddressForm()
  } catch (e) { alert(e.message) }
}

const editAddress = (addr) => {
  editingAddressId.value = addr.id
  addressForm.value = { ...addr }
  showAddressForm.value = true
}

const deleteAddress = async (id) => {
  if (confirm('Delete this address?')) await removeUserAddressFromDb(id)
}

const closeAddressForm = () => {
  showAddressForm.value = false
  editingAddressId.value = null
  addressForm.value = { label: 'Home', fullName: '', phone: '', streetAddress: '', city: '', state: 'Himachal Pradesh', pincode: '' }
  addressErrors.value = {}
}

const sendMessage = async () => {
  if (!newMessage.value.trim()) return
  isSending.value = true
  try {
    const chatRef = doc(db, 'supportChats', user.value.uid)
    await setDoc(chatRef, {
      userName: user.value.displayName || 'User',
      lastUpdated: serverTimestamp(),
      messages: arrayUnion({
        text: newMessage.value.trim(),
        role: 'user',
        timestamp: Date.now()
      })
    }, { merge: true })
    newMessage.value = ''
  } catch (e) { alert(e.message) }
  isSending.value = false
}

const logout = async () => {
  if (confirm('Log out?')) {
    await signOut(auth)
    router.push('/login')
  }
}

const getInitials = (name) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
</script>

<template>
  <div class="user-page">
    <div v-if="initializing" class="loading">
      <div class="spinner"></div>
      <p>Loading account…</p>
    </div>

    <div v-else-if="user" class="dashboard">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-content">
          <div class="title-group">
            <h1 class="page-title">Account</h1>
            <p class="page-subtitle">Manage your profile, addresses & support</p>
          </div>
          <div class="user-badge">
            <div class="avatar-wrapper">
              <img
                v-if="user.photoURL"
                :src="user.photoURL"
                class="avatar"
                alt="Profile"
              />
              <div v-else class="avatar-placeholder">
                {{ getInitials(user.displayName || 'User') }}
              </div>
              <label class="avatar-upload" @click="$refs.avatarInput?.click()">
                <span v-html="icons.camera"></span>
                <input ref="avatarInput" type="file" accept="image/*" @change="uploadAvatar" :disabled="isUploading" hidden />
              </label>
            </div>
          </div>
        </div>
        <div class="user-meta">
          <span class="name">{{ user.displayName || 'User' }}</span>
          <span class="email">{{ user.email }}</span>
        </div>
      </header>

      <!-- Navigation Tabs -->
      <nav class="segmented-tabs" role="tablist" aria-label="Account sections">
        <button
          v-for="view in views"
          :key="view.id"
          :class="['tab', { active: activeView === view.id }]"
          @click="activeView = view.id"
          role="tab"
          :aria-selected="activeView === view.id"
        >
          <span class="tab-icon" v-html="icons[view.icon]"></span>
          {{ view.label }}
        </button>
      </nav>

      <!-- Content Panels -->
      <main class="content">
        <!-- Profile View -->
        <section v-if="activeView === 'profile'" class="view profile-view" role="tabpanel">
          <!-- Profile Hero -->
          <div class="profile-hero">
            <div class="profile-avatar-wrapper">
              <img
                v-if="user.photoURL"
                :src="user.photoURL"
                class="profile-avatar"
                alt="Profile"
              />
              <div v-else class="profile-avatar-placeholder">
                {{ getInitials(user.displayName || 'User') }}
              </div>
              <label class="profile-avatar-upload" @click="$refs.profileAvatarInput?.click()" aria-label="Change profile photo">
                <span v-html="icons.camera"></span>
                <input ref="profileAvatarInput" type="file" accept="image/*" @change="uploadAvatar" :disabled="isUploading" hidden />
              </label>
            </div>
            <h2 class="profile-name">{{ user.displayName || 'Your Name' }}</h2>
            <p class="profile-email">{{ user.email }}</p>
          </div>

          <div class="card">
            <div class="card-header">
              <h2>Personal Info</h2>
            </div>

            <div class="field-group">
              <div class="field">
                <label>Display Name</label>
                <div class="field-display" v-if="!isEditingName">
                  <span class="field-value">{{ user.displayName || 'Not set' }}</span>
                  <button class="icon-btn" @click="isEditingName = true" aria-label="Edit name">
                    <span v-html="icons.edit"></span>
                  </button>
                </div>
                <div v-else class="field-edit">
                  <input
                    v-model="displayName"
                    class="input"
                    placeholder="Your name"
                    @keyup.enter="saveProfile"
                    autofocus
                  />
                  <div class="field-actions">
                    <button class="btn ghost" @click="isEditingName = false">
                      <span v-html="icons.close"></span> Cancel
                    </button>
                    <button class="btn primary" @click="saveProfile" :disabled="isUploading || !displayName.trim()">
                      <span v-html="icons.check" v-if="!isUploading"></span>
                      <span class="spinner-sm" v-else></span>
                      {{ isUploading ? 'Saving…' : 'Save' }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="field">
                <label>Email</label>
                <span class="field-static">{{ user.email }}</span>
                <span class="field-hint">Email cannot be changed</span>
              </div>
            </div>

            <div class="card-divider"></div>

            <!-- Danger Zone -->
            <div class="danger-zone">
              <h3>Danger Zone</h3>
              <button class="btn danger logout-btn" @click="logout">
                <span v-html="icons.logout"></span>
                Log Out
              </button>
            </div>
          </div>
        </section>

        <!-- Addresses View -->
        <section v-else-if="activeView === 'addresses'" class="view addresses-view" role="tabpanel">
          <div class="card">
            <div class="card-header">
              <h2>Saved Addresses</h2>
              <button class="btn primary" @click="showAddressForm = true; editingAddressId = null; addressForm = { label: 'Home', fullName: '', phone: '', streetAddress: '', city: '', state: 'Himachal Pradesh', pincode: '' }">
                <span v-html="icons.plus"></span>
                Add Address
              </button>
            </div>

            <div v-if="!userProfileDoc?.addresses?.length" class="empty-state">
              <span v-html="icons['map-pin']" class="empty-icon"></span>
              <h3>No addresses saved</h3>
              <p>Add your first address to speed up checkout</p>
              <button class="btn primary" @click="showAddressForm = true; editingAddressId = null; addressForm = { label: 'Home', fullName: '', phone: '', streetAddress: '', city: '', state: 'Himachal Pradesh', pincode: '' }">
                <span v-html="icons.plus"></span>
                Add Address
              </button>
            </div>

            <div v-else class="addresses-grid">
              <div v-for="addr in userProfileDoc.addresses" :key="addr.id" class="address-card">
                <div class="addr-header">
                  <span class="badge">{{ addr.label }}</span>
                  <div class="addr-actions">
                    <button @click="editAddress(addr)" class="icon-btn" aria-label="Edit address">
                      <span v-html="icons.edit"></span>
                    </button>
                    <button @click="deleteAddress(addr.id)" class="icon-btn danger" aria-label="Delete address">
                      <span v-html="icons.trash"></span>
                    </button>
                  </div>
                </div>
                <h3 class="addr-name">{{ addr.fullName }}</h3>
                <p class="addr-detail">{{ addr.streetAddress }}, {{ addr.city }}, {{ addr.state }} - {{ addr.pincode }}</p>
                <span class="addr-phone">
                  <span v-html="icons['message-circle']" class="phone-icon"></span>
                  {{ addr.phone }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- Support View -->
        <section v-else-if="activeView === 'support'" class="view support-view" role="tabpanel">
          <div class="card chat-card">
            <div class="card-header">
              <h2>Support Chat</h2>
            </div>

            <div class="chat-messages">
              <div v-if="!supportMessages.length" class="empty-chat">
                <span v-html="icons['message-circle']" class="chat-icon"></span>
                <h3>No messages yet</h3>
                <p>Start a conversation with our support team</p>
              </div>
              <div
                v-for="(msg, i) in supportMessages"
                :key="i"
                :class="['bubble', msg.role]"
              >
                <div class="bubble-meta">{{ msg.role === 'user' ? 'You' : 'Admin' }}</div>
                <div class="bubble-text">{{ msg.text }}</div>
                <div class="bubble-time">{{ new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</div>
              </div>
            </div>

            <div class="chat-input">
              <input
                v-model="newMessage"
                placeholder="Type a message…"
                @keyup.enter="sendMessage"
                class="chat-input-field"
                aria-label="Message"
              />
              <button
                class="btn primary chat-send"
                @click="sendMessage"
                :disabled="isSending || !newMessage.trim()"
                aria-label="Send message"
              >
                <span v-html="icons.send" v-if="!isSending"></span>
                <span class="spinner-sm" v-else></span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>

    <!-- Address Modal -->
    <transition name="modal">
      <div v-if="showAddressForm" class="modal-overlay" @click.self="closeAddressForm">
        <div class="modal" @click.stop>
          <div class="modal-header">
            <h3>{{ editingAddressId ? 'Edit Address' : 'Add New Address' }}</h3>
            <button class="icon-btn" @click="closeAddressForm" aria-label="Close">
              <span v-html="icons.close"></span>
            </button>
          </div>
          <form @submit.prevent="saveAddress" class="modal-form">
            <div class="form-row">
              <div class="field">
                <label>Label <span class="required">*</span></label>
                <select v-model="addressForm.label" class="input">
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Full Name <span class="required">*</span></label>
                <input v-model="addressForm.fullName" class="input" :class="{ error: addressErrors.fullName }" placeholder="John Doe" />
                <span v-if="addressErrors.fullName" class="error-text">{{ addressErrors.fullName }}</span>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Phone <span class="required">*</span></label>
                <input v-model="addressForm.phone" class="input" :class="{ error: addressErrors.phone }" placeholder="9876543210" maxlength="10" @input="addressForm.phone = addressForm.phone.replace(/\D/g, '').slice(0, 10)" />
                <span v-if="addressErrors.phone" class="error-text">{{ addressErrors.phone }}</span>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Street Address <span class="required">*</span></label>
                <input v-model="addressForm.streetAddress" class="input" :class="{ error: addressErrors.streetAddress }" placeholder="House/Flat No, Building, Street" />
                <span v-if="addressErrors.streetAddress" class="error-text">{{ addressErrors.streetAddress }}</span>
              </div>
            </div>
            <div class="form-row two-col">
              <div class="field">
                <label>City <span class="required">*</span></label>
                <input v-model="addressForm.city" class="input" :class="{ error: addressErrors.city }" placeholder="City" />
                <span v-if="addressErrors.city" class="error-text">{{ addressErrors.city }}</span>
              </div>
              <div class="field">
                <label>State <span class="required">*</span></label>
                <input v-model="addressForm.state" class="input" placeholder="Himachal Pradesh" />
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Pincode <span class="required">*</span></label>
                <input v-model="addressForm.pincode" class="input" :class="{ error: addressErrors.pincode }" placeholder="123456" maxlength="6" @input="addressForm.pincode = addressForm.pincode.replace(/\D/g, '').slice(0, 6)" />
                <span v-if="addressErrors.pincode" class="error-text">{{ addressErrors.pincode }}</span>
              </div>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn ghost" @click="closeAddressForm">
                <span v-html="icons.close"></span> Cancel
              </button>
              <button type="submit" class="btn primary" :disabled="isUploading">
                <span v-html="icons.check" v-if="!isUploading"></span>
                <span class="spinner-sm" v-else></span>
                {{ editingAddressId ? 'Update' : 'Add' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* ===== DESIGN TOKENS ===== */
:root {
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.04);
  --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.06);
  --shadow-lg: 0 12px 32px rgba(15, 23, 42, 0.08);
  --shadow-xl: 0 20px 48px rgba(15, 23, 42, 0.12);
  --transition-fast: 120ms ease;
  --transition-base: 200ms ease;
  --focus-ring: 0 0 0 3px rgba(14, 165, 233, 0.4);
}

/* ===== BASE ===== */
.user-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 80px 20px 60px;
  font-family: var(--font);
  color: #0f172a;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ===== LOADING ===== */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding-top: 160px;
  color: #64748b;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #0ea5e9;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== DASHBOARD LAYOUT ===== */
.dashboard {
  max-width: 920px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
  animation: fadeUp 0.4s var(--transition-base);
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== HEADER ===== */
.dashboard-header {
  background: #ffffff;
  border-radius: var(--radius-lg);
  padding: 28px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-md);
  border: 1px solid #f1f5f9;
  position: relative;
  overflow: hidden;
}
.dashboard-header::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #0ea5e9, #10b981, #f59e0b);
}
.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}
.title-group { flex: 1; min-width: 200px; }
.page-title {
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0 0 4px;
  background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.page-subtitle {
  font-size: 0.9rem;
  color: #64748b;
  margin: 0;
  font-weight: 500;
}
.user-badge { flex-shrink: 0; }
.avatar-wrapper {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.avatar-wrapper:hover { transform: scale(1.03); box-shadow: var(--shadow-lg); }
.avatar {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-full);
  object-fit: cover;
}
.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
}
.avatar-upload {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: #0f172a;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 3px solid #fff;
  box-shadow: var(--shadow-md);
  transition: transform var(--transition-fast), background var(--transition-fast);
  opacity: 0.9;
}
.avatar-upload:hover { transform: scale(1.1); background: #1e293b; opacity: 1; }
.avatar-upload:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.user-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 20px;
  border-top: 1px solid #f1f5f9;
  width: 100%;
}
.user-meta .name {
  font-size: 1.1rem;
  font-weight: 700;
}
.user-meta .email {
  font-size: 0.85rem;
  color: #64748b;
}

/* ===== TABS ===== */
.segmented-tabs {
  display: flex;
  gap: 4px;
  background: #fff;
  padding: 4px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
  box-shadow: var(--shadow-sm);
  border: 1px solid #f1f5f9;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.tab {
  flex: 1;
  min-width: 120px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 0.875rem;
  color: #64748b;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  white-space: nowrap;
}
.tab:hover { background: #f8fafc; color: #0f172a; }
.tab.active {
  background: #0f172a;
  color: #fff;
  box-shadow: var(--shadow-sm);
}
.tab:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.tab-icon { display: flex; flex-shrink: 0; }

/* ===== CONTENT ===== */
.content {
  background: #fff;
  border-radius: var(--radius-lg);
  padding: 0;
  box-shadow: var(--shadow-md);
  border: 1px solid #f1f5f9;
  overflow: hidden;
}
.view { padding: 28px; animation: fadeIn 0.25s var(--transition-base); }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* ===== CARDS ===== */
.card {
  background: transparent;
  border: none;
  box-shadow: none;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}
.card-header h2 {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
}

/* ===== FIELDS ===== */
.field-group { margin-bottom: 8px; }
.field { margin-bottom: 20px; }
.field:last-child { margin-bottom: 0; }
.field label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  color: #475569;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.required { color: #ef4444; margin-left: 2px; }
.field-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: var(--radius-sm);
  transition: border-color var(--transition-fast), background var(--transition-fast);
}
.field-display:hover { border-color: #e2e8f0; background: #f1f5f9; }
.field-value {
  font-size: 0.95rem;
  color: #0f172a;
  font-weight: 500;
}
.field-static {
  display: block;
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: var(--radius-sm);
  color: #0f172a;
  font-size: 0.95rem;
}
.field-hint {
  display: block;
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 6px;
}
.field-edit { display: flex; flex-direction: column; gap: 12px; }
.field-actions { display: flex; gap: 10px; justify-content: flex-end; padding-top: 4px; }

/* ===== INPUTS ===== */
.input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d1d5db;
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: 0.95rem;
  background: #fff;
  color: #0f172a;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  box-sizing: border-box;
}
.input:focus {
  outline: none;
  border-color: #0ea5e9;
  box-shadow: var(--focus-ring);
}
.input.error { border-color: #ef4444; }
.input.error:focus { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2); }
.input::placeholder { color: #94a3b8; }
.input:disabled { background: #f1f5f9; color: #64748b; cursor: not-allowed; }
.error-text { display: block; font-size: 0.75rem; color: #ef4444; margin-top: 6px; }

/* ===== BUTTONS ===== */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  border: none;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn.primary {
  background: #0f172a;
  color: #fff;
}
.btn.primary:hover:not(:disabled) { background: #1e293b; }
.btn.primary:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.btn.ghost {
  background: transparent;
  color: #475569;
}
.btn.ghost:hover:not(:disabled) { background: #f1f5f9; color: #0f172a; }
.btn.danger {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
}
.btn.danger:hover:not(:disabled) { background: #fecaca; color: #b91c1c; }
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  color: #64748b;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.icon-btn:hover { background: #f1f5f9; color: #0f172a; }
.icon-btn.danger:hover { background: #fee2e2; color: #dc2626; }
.icon-btn:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  opacity: 0.7;
}
.logout-btn { width: 100%; margin-top: 4px; }

/* ===== DANGER ZONE ===== */
.danger-zone {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #f1f5f9;
}
.danger-zone h3 {
  font-size: 0.875rem;
  font-weight: 700;
  color: #64748b;
  margin: 0 0 16px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ===== ADDRESSES ===== */
.addresses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}
.address-card {
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: var(--radius-md);
  padding: 20px;
  transition: all var(--transition-base);
  position: relative;
}
.address-card:hover {
  border-color: #e2e8f0;
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.addr-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}
.badge {
  background: #dcfce7;
  color: #16a34a;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.addr-actions { display: flex; gap: 4px; }
.addr-name {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 6px;
  color: #0f172a;
}
.addr-detail {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0 0 8px;
  line-height: 1.5;
}
.addr-phone {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #475569;
  font-weight: 500;
}
.phone-icon { color: #0ea5e9; flex-shrink: 0; }

/* ===== EMPTY STATES ===== */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
}
.empty-icon {
  display: inline-flex;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-full);
  background: #f1f5f9;
  color: #94a3b8;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.empty-state h3 {
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px;
}
.empty-state p { margin: 0 0 20px; font-size: 0.9rem; }
.empty-state .btn { margin-top: 8px; }

/* ===== SUPPORT CHAT ===== */
.chat-card {
  display: flex;
  flex-direction: column;
  min-height: 400px;
  max-height: 70vh;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 20px;
  padding-right: 4px;
}
.empty-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #94a3b8;
  padding: 40px 20px;
}
.chat-icon {
  display: inline-flex;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background: #f1f5f9;
  color: #94a3b8;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.empty-chat h3 { font-size: 1rem; font-weight: 700; color: #334155; margin: 0 0 6px; }
.empty-chat p { margin: 0; font-size: 0.85rem; }
.bubble {
  max-width: 75%;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  line-height: 1.5;
  animation: bubbleIn 0.2s var(--transition-base);
}
@keyframes bubbleIn { from { opacity: 0; transform: translateY(8px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
.bubble.user {
  align-self: flex-end;
  background: #0f172a;
  color: #fff;
  border-bottom-right-radius: 4px;
  box-shadow: var(--shadow-sm);
}
.bubble.admin {
  align-self: flex-start;
  background: #f1f5f9;
  color: #0f172a;
  border-bottom-left-radius: 4px;
}
.bubble-meta {
  font-size: 0.65rem;
  font-weight: 700;
  opacity: 0.7;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.bubble-text { word-wrap: break-word; }
.bubble-time {
  font-size: 0.65rem;
  opacity: 0.5;
  margin-top: 6px;
  text-align: right;
}
.bubble.admin .bubble-time { text-align: left; }
.chat-input {
  display: flex;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}
.chat-input-field {
  flex: 1;
  padding: 14px 16px;
  border: 1px solid #d1d5db;
  border-radius: var(--radius-full);
  font: inherit;
  font-size: 0.95rem;
  background: #fff;
  color: #0f172a;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.chat-input-field:focus {
  outline: none;
  border-color: #0ea5e9;
  box-shadow: var(--focus-ring);
}
.chat-send {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  padding: 0;
}
.chat-send:disabled { opacity: 0.4; }

/* ===== MODAL ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
  animation: fadeIn 0.2s var(--transition-base);
}
.modal {
  background: #fff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.25s var(--transition-base);
}
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
}
.modal-header h3 { font-size: 1.125rem; font-weight: 700; margin: 0; }
.modal-form { padding: 24px; }
.form-row { margin-bottom: 20px; }
.form-row:last-of-type { margin-bottom: 24px; }
.form-row.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
}

/* ===== CARD DIVIDER ===== */
.card-divider { margin: 24px 0; border-top: 1px solid #f1f5f9; }

/* ===== TRANSITIONS ===== */
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal, .modal-leave-to .modal { transform: translateY(20px) scale(0.98); }

/* ===== RESPONSIVE ===== */
/* ===== PROFILE HERO ===== */
.profile-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 20px 24px;
  margin: -28px -28px 8px;
  background: linear-gradient(180deg, rgba(14, 165, 233, 0.08) 0%, transparent 100%);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  border-bottom: 1px solid #f1f5f9;
}
.profile-avatar-wrapper {
  position: relative;
  width: 104px;
  height: 104px;
  border-radius: 50%;
  background: transparent;
  margin-bottom: 16px;
  cursor: pointer;
  transition: transform var(--transition-fast);
  overflow: hidden;
}
.profile-avatar-wrapper:hover { transform: scale(1.03); box-shadow: var(--shadow-xl), 0 0 0 4px #fff, 0 0 0 6px #e2e8f0; }
.profile-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}
.profile-avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.25rem;
  font-weight: 700;
  color: #fff;
}
.profile-avatar-upload {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background: #0f172a;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 3px solid #fff;
  box-shadow: var(--shadow-md);
  transition: transform var(--transition-fast), background var(--transition-fast);
  opacity: 0.9;
}
.profile-avatar-upload:hover { transform: scale(1.1); background: #1e293b; opacity: 1; }
.profile-avatar-upload:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.profile-name {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0 0 4px;
  background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.profile-email {
  font-size: 0.95rem;
  color: #64748b;
  margin: 0;
  font-weight: 500;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 768px) {
  .user-page { padding: 70px 12px 32px; }
  .dashboard-header { padding: 20px; }
  .title-group { min-width: 0; }
  .page-title { font-size: 1.5rem; }
  .avatar-wrapper { width: 60px; height: 60px; }
  .user-meta { padding-top: 16px; }
  .view { padding: 20px; }
  .addresses-grid { grid-template-columns: 1fr; }
  .bubble { max-width: 90%; }
  .form-row.two-col { grid-template-columns: 1fr; }
  .segmented-tabs { justify-content: center; }
  .profile-hero { margin: -20px -20px 8px; padding: 24px 16px 16px; }
  .profile-avatar-wrapper { width: 88px; height: 88px; box-shadow: var(--shadow-md), 0 0 0 3px #fff, 0 0 0 5px #f1f5f9; }
  .profile-avatar-placeholder { font-size: 1.75rem; }
  .profile-name { font-size: 1.25rem; }
}

@media (max-width: 480px) {
  .page-title { font-size: 1.25rem; }
  .page-subtitle { font-size: 0.8rem; }
  .btn { padding: 10px 14px; font-size: 0.8125rem; }
  .modal { margin: 10px; max-height: calc(100vh - 20px); }
}

/* ===== SCROLLBAR ===== */
.chat-messages::-webkit-scrollbar { width: 6px; }
.chat-messages::-webkit-scrollbar-track { background: transparent; }
.chat-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
.chat-messages::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

/* ===== FOCUS VISIBLE POLYFILL ===== */
:focus:not(:focus-visible) { outline: none; }
:focus-visible { outline: none; }
</style>