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
    <div v-if="initializing" class="center-state">
      <div class="spinner"></div>
      <p>Loading account…</p>
    </div>

    <div v-else-if="user" class="account-container fade-in">
      
      <!-- Minimal Page Header -->
      <header class="page-header">
        <h1 class="page-title">My Account</h1>
      </header>

      <!-- Sleek, Borderless Tabs -->
      <nav class="clean-tabs-bar" role="tablist">
        <button
          v-for="view in views"
          :key="view.id"
          :class="['clean-tab', { active: activeView === view.id }]"
          @click="activeView = view.id"
          role="tab"
        >
          <span class="tab-icon" v-html="icons[view.icon]"></span>
          {{ view.label }}
        </button>
      </nav>

      <!-- Content Panels -->
      <main class="tab-content-area">
        
        <!-- ─── PROFILE VIEW ─── -->
        <section v-if="activeView === 'profile'" class="view-panel profile-view">
          
          <div class="profile-hero">
            <div class="avatar-wrapper">
              <img v-if="user.photoURL" :src="user.photoURL" class="avatar-img" alt="Profile" />
              <div v-else class="avatar-placeholder">{{ getInitials(user.displayName || 'User') }}</div>
              
              <label class="avatar-upload-btn" @click="$refs.avatarInput?.click()" aria-label="Change photo">
                <span v-html="icons.camera"></span>
                <input ref="avatarInput" type="file" accept="image/*" @change="uploadAvatar" :disabled="isUploading" hidden />
              </label>
            </div>
            <h2 class="profile-name">{{ user.displayName || 'Your Name' }}</h2>
            <p class="profile-email">{{ user.email }}</p>
          </div>

          <div class="details-section">
            <h3 class="section-label">Personal Information</h3>
            
            <div class="minimal-field">
              <label>Display Name</label>
              <div v-if="!isEditingName" class="field-row">
                <span class="field-text">{{ user.displayName || 'Not set' }}</span>
                <button class="icon-action-btn" @click="isEditingName = true"><span v-html="icons.edit"></span></button>
              </div>
              <div v-else class="field-edit-row">
                <input v-model="displayName" class="clean-input" placeholder="Your name" @keyup.enter="saveProfile" autofocus />
                <div class="edit-actions">
                  <button class="btn-text" @click="isEditingName = false">Cancel</button>
                  <button class="btn-primary-small" @click="saveProfile" :disabled="isUploading || !displayName.trim()">
                    {{ isUploading ? 'Saving…' : 'Save' }}
                  </button>
                </div>
              </div>
            </div>

            <div class="minimal-field">
              <label>Registered Email</label>
              <div class="field-row">
                <span class="field-text disabled-text">{{ user.email }}</span>
              </div>
              <span class="field-hint">Email cannot be changed</span>
            </div>
          </div>

          <div class="danger-zone">
            <button class="btn-logout" @click="logout">
              <span v-html="icons.logout"></span> Log Out
            </button>
          </div>
        </section>

        <!-- ─── ADDRESSES VIEW ─── -->
        <section v-else-if="activeView === 'addresses'" class="view-panel addresses-view">
          
          <div class="section-header-row">
            <h3 class="section-label">Saved Addresses</h3>
            <button class="btn-text-primary" @click="showAddressForm = true; editingAddressId = null; addressForm = { label: 'Home', fullName: '', phone: '', streetAddress: '', city: '', state: 'Himachal Pradesh', pincode: '' }">
              + Add New
            </button>
          </div>

          <div v-if="!userProfileDoc?.addresses?.length" class="empty-state">
            <span v-html="icons['map-pin']" class="empty-icon"></span>
            <h4>No addresses saved</h4>
            <p>Add an address for faster checkout.</p>
          </div>

          <div v-else class="addresses-grid">
            <div v-for="addr in userProfileDoc.addresses" :key="addr.id" class="address-card">
              <div class="addr-header">
                <span class="addr-badge">{{ addr.label }}</span>
                <div class="addr-actions">
                  <button @click="editAddress(addr)" class="icon-action-btn"><span v-html="icons.edit"></span></button>
                  <button @click="deleteAddress(addr.id)" class="icon-action-btn danger"><span v-html="icons.trash"></span></button>
                </div>
              </div>
              <h4 class="addr-name">{{ addr.fullName }}</h4>
              <p class="addr-detail">{{ addr.streetAddress }}, {{ addr.city }}, {{ addr.state }} - {{ addr.pincode }}</p>
              <span class="addr-phone">Phone: {{ addr.phone }}</span>
            </div>
          </div>
        </section>

        <!-- ─── SUPPORT CHAT VIEW ─── -->
        <section v-else-if="activeView === 'support'" class="view-panel support-view">
          <div class="chat-viewport">
            <div class="chat-messages">
              <div v-if="!supportMessages.length" class="empty-state">
                <span v-html="icons['message-circle']" class="empty-icon"></span>
                <h4>How can we help?</h4>
                <p>Send us a message and we'll reply shortly.</p>
              </div>
              <div v-for="(msg, i) in supportMessages" :key="i" :class="['chat-bubble', msg.role]">
                <div class="bubble-text">{{ msg.text }}</div>
                <div class="bubble-time">{{ new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</div>
              </div>
            </div>

            <div class="chat-input-area">
              <input v-model="newMessage" placeholder="Type a message…" @keyup.enter="sendMessage" class="clean-chat-input" />
              <button class="chat-send-btn" @click="sendMessage" :disabled="isSending || !newMessage.trim()">
                <span v-html="icons.send" v-if="!isSending"></span>
                <span class="spinner-sm" v-else></span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>

    <!-- ─── ADDRESS MODAL (Bottom Sheet on Mobile) ─── -->
    <transition name="sheet">
      <div v-if="showAddressForm" class="modal-overlay" @click.self="closeAddressForm">
        <div class="modal-sheet">
          <div class="modal-header">
            <h3>{{ editingAddressId ? 'Edit Address' : 'New Address' }}</h3>
            <button class="icon-action-btn" @click="closeAddressForm"><span v-html="icons.close"></span></button>
          </div>
          <form @submit.prevent="saveAddress" class="modal-form">
            <div class="form-grid">
              <div class="field">
                <label>Label</label>
                <select v-model="addressForm.label" class="clean-input">
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="field">
                <label>Full Name</label>
                <input v-model="addressForm.fullName" class="clean-input" :class="{ error: addressErrors.fullName }" placeholder="John Doe" />
              </div>
              <div class="field">
                <label>Phone Number</label>
                <input v-model="addressForm.phone" class="clean-input" :class="{ error: addressErrors.phone }" placeholder="10-digit mobile" maxlength="10" @input="addressForm.phone = addressForm.phone.replace(/\D/g, '').slice(0, 10)" />
              </div>
              <div class="field full-width">
                <label>Complete Address</label>
                <input v-model="addressForm.streetAddress" class="clean-input" :class="{ error: addressErrors.streetAddress }" placeholder="House/Flat No, Building, Street" />
              </div>
              <div class="field">
                <label>City</label>
                <input v-model="addressForm.city" class="clean-input" :class="{ error: addressErrors.city }" placeholder="City" />
              </div>
              <div class="field">
                <label>State</label>
                <input v-model="addressForm.state" class="clean-input disabled-text" readonly />
              </div>
              <div class="field">
                <label>Pincode</label>
                <input v-model="addressForm.pincode" class="clean-input" :class="{ error: addressErrors.pincode }" placeholder="6-digit code" maxlength="6" @input="addressForm.pincode = addressForm.pincode.replace(/\D/g, '').slice(0, 6)" />
              </div>
            </div>
            <div class="modal-actions">
              <button type="submit" class="btn-primary-large" :disabled="isUploading">
                {{ editingAddressId ? 'Update Address' : 'Save Address' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* ─── BASE STYLES ─── */
.fade-in { animation: fIn 0.3s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

.user-page { background: #ffffff; min-height: 100vh; padding: 100px 24px 80px; font-family: 'Inter', -apple-system, sans-serif; color: #111827; }
.account-container { max-width: 768px; margin: 0 auto; width: 100%; }

.center-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 50vh; color: #6B7280; }
.spinner { width: 32px; height: 32px; border: 3px solid #F3F4F6; border-top-color: #111827; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── HEADER & TABS ─── */
.page-header { margin-bottom: 32px; }
.page-title { font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px; }

.clean-tabs-bar { display: flex; gap: 32px; border-bottom: 1px solid #E5E7EB; margin-bottom: 32px; overflow-x: auto; white-space: nowrap; }
.clean-tab { background: transparent; border: none; padding: 0 0 16px 0; font-size: 15px; font-weight: 500; color: #6B7280; cursor: pointer; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color 0.2s; font-family: inherit;}
.clean-tab:hover { color: #111827; }
.clean-tab.active { color: #111827; font-weight: 600; border-bottom-color: #111827; }
.tab-icon { display: flex; opacity: 0.8; }
.clean-tab.active .tab-icon { opacity: 1; }

.tab-content-area { width: 100%; }

/* ─── PROFILE VIEW ─── */
.profile-hero { display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 48px; }
.avatar-wrapper { position: relative; width: 100px; height: 100px; border-radius: 50%; margin-bottom: 16px; }
.avatar-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; background: #F3F4F6; }
.avatar-placeholder { width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 600; background: #111827; color: #ffffff; }
.avatar-upload-btn { position: absolute; bottom: 0; right: 0; width: 32px; height: 32px; border-radius: 50%; background: #ffffff; border: 1px solid #E5E7EB; color: #111827; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.05); transition: 0.2s; }
.avatar-upload-btn:hover { background: #F9FAFB; transform: scale(1.05); }

.profile-name { font-size: 24px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.3px;}
.profile-email { font-size: 14px; color: #6B7280; margin: 0; }

.details-section { margin-bottom: 48px; }
.section-label { font-size: 14px; font-weight: 600; color: #111827; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 24px; border-bottom: 1px solid #E5E7EB; padding-bottom: 12px;}

.minimal-field { margin-bottom: 24px; }
.minimal-field label { display: block; font-size: 13px; font-weight: 500; color: #6B7280; margin-bottom: 8px; }
.field-row { display: flex; justify-content: space-between; align-items: center; background: #F9FAFB; padding: 14px 16px; border-radius: 12px; }
.field-text { font-size: 15px; font-weight: 500; color: #111827; }
.disabled-text { color: #6B7280; }
.field-hint { display: block; font-size: 12px; color: #9CA3AF; margin-top: 6px; padding-left: 4px; }

.field-edit-row { display: flex; flex-direction: column; gap: 12px; }
.clean-input { width: 100%; padding: 14px 16px; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 12px; font-size: 15px; font-family: inherit; color: #111827; box-sizing: border-box; transition: 0.2s;}
.clean-input:focus { outline: none; border-color: #111827; }
.clean-input.error { border-color: #EF4444; }
.edit-actions { display: flex; justify-content: flex-end; gap: 12px; }

/* Buttons */
.btn-text { background: transparent; border: none; color: #6B7280; font-size: 14px; font-weight: 500; cursor: pointer; padding: 8px 16px; font-family: inherit;}
.btn-text:hover { color: #111827; }
.btn-primary-small { background: #111827; color: #ffffff; border: none; padding: 8px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit;}
.btn-primary-large { background: #111827; color: #ffffff; border: none; padding: 16px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%; font-family: inherit;}
.btn-logout { background: #FEF2F2; color: #DC2626; border: none; padding: 14px; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; width: 100%; display: flex; justify-content: center; align-items: center; gap: 8px; font-family: inherit; transition: 0.2s;}
.btn-logout:hover { background: #FEE2E2; }
.icon-action-btn { background: transparent; border: none; color: #6B7280; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; padding: 4px; border-radius: 6px; }
.icon-action-btn:hover { background: #F3F4F6; color: #111827; }
.icon-action-btn.danger:hover { color: #DC2626; background: #FEF2F2; }

/* ─── ADDRESSES VIEW ─── */
.section-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #E5E7EB; padding-bottom: 12px;}
.section-header-row .section-label { border: none; margin: 0; padding: 0; }
.btn-text-primary { background: transparent; border: none; color: #2563EB; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; }

.empty-state { text-align: center; padding: 48px 20px; color: #6B7280; background: #F9FAFB; border-radius: 16px;}
.empty-icon { font-size: 32px; color: #9CA3AF; margin-bottom: 16px; display: inline-block; }
.empty-state h4 { margin: 0 0 8px; font-size: 16px; color: #111827; }
.empty-state p { margin: 0; font-size: 14px; }

.addresses-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
.address-card { background: #F9FAFB; padding: 20px; border-radius: 16px; }
.addr-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.addr-badge { background: #E5E7EB; color: #374151; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;}
.addr-actions { display: flex; gap: 8px; }
.addr-name { font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 6px; }
.addr-detail { font-size: 14px; color: #4B5563; margin: 0 0 8px; line-height: 1.5; }
.addr-phone { font-size: 13px; color: #6B7280; font-weight: 500; }

/* ─── SUPPORT CHAT ─── */
.chat-viewport { display: flex; flex-direction: column; height: 60vh; max-height: 600px; background: #F9FAFB; border-radius: 20px; overflow: hidden; border: 1px solid #E5E7EB;}
.chat-messages { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.chat-bubble { max-width: 80%; padding: 12px 16px; border-radius: 16px; font-size: 15px; line-height: 1.5; }
.chat-bubble.user { align-self: flex-end; background: #111827; color: #ffffff; border-bottom-right-radius: 4px; }
.chat-bubble.admin { align-self: flex-start; background: #ffffff; color: #111827; border: 1px solid #E5E7EB; border-bottom-left-radius: 4px; }
.bubble-time { font-size: 11px; margin-top: 6px; opacity: 0.6; text-align: right; }

.chat-input-area { display: flex; gap: 12px; padding: 16px; background: #ffffff; border-top: 1px solid #E5E7EB; }
.clean-chat-input { flex: 1; padding: 14px 20px; background: #F3F4F6; border: none; border-radius: 40px; font-size: 15px; font-family: inherit; color: #111827; }
.clean-chat-input:focus { outline: none; background: #E5E7EB; }
.chat-send-btn { width: 48px; height: 48px; border-radius: 50%; background: #111827; color: #ffffff; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;}
.chat-send-btn:disabled { background: #9CA3AF; cursor: not-allowed; }

/* ─── BOTTOM SHEET MODAL (Addresses) ─── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-sheet { background: #ffffff; border-radius: 24px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; padding: 0; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 24px; border-bottom: 1px solid #F3F4F6; position: sticky; top: 0; background: #ffffff; z-index: 10;}
.modal-header h3 { margin: 0; font-size: 18px; font-weight: 600; }
.modal-form { padding: 24px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
.form-grid .field { display: flex; flex-direction: column; gap: 8px; }
.form-grid .full-width { grid-column: span 2; }
.form-grid label { font-size: 13px; font-weight: 500; color: #6B7280; }

/* Transitions */
.sheet-enter-active, .sheet-leave-active { transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .modal-sheet, .sheet-leave-to .modal-sheet { transform: translateY(40px) scale(0.98); }

/* ─── RESPONSIVE MOBILE FIXES ─── */
@media (max-width: 768px) {
  .user-page { padding: 76px 16px 80px; }
  .page-title { font-size: 24px; }
  .clean-tabs-bar { gap: 24px; }
  
  .addresses-grid { grid-template-columns: 1fr; }
  .form-grid { grid-template-columns: 1fr; gap: 16px;}
  .form-grid .full-width { grid-column: span 1; }

  /* Bottom sheet strict adherence */
  .modal-overlay { align-items: flex-end; padding: 0; }
  .modal-sheet { border-radius: 24px 24px 0 0; max-height: 85vh; margin: 0; max-width: 100%; }
}
</style>
