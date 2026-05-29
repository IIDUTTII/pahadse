<script setup>
/**
 * User.vue — Premium Client Management Hub Terminal
 * Fixes: Infinite loading spinner on unauthenticated visits, duplicate upload requests.
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth, storage } from '../firebase.js'
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import imageCompression from 'browser-image-compression'

defineOptions({ name: 'User' })
const router = useRouter()

const user = ref(null)
const isEditing = ref(false)
const activeTab = ref('profile')
const initializing = ref(true) // Tracks initial authentication verification phases

// Local Form States
const editDisplayName = ref('')
const isUploading = ref(false)
const uploadProgress = ref('')

onMounted(() => {
  onAuthStateChanged(auth, (currentUser) => {
    if (!currentUser) {
      // 🚨 FIX: Force clear initialization flags immediately if no active login state exists
      user.value = null
      initializing.value = false
      return
    }

    // A valid authenticated session exists
    user.value = currentUser
    editDisplayName.value = currentUser.displayName || ''
    initializing.value = false
  })
})

// 📸 SECURE COMPRESS & DISPATCH ENGINE
const handleImageUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file.')
    return
  }

  try {
    isUploading.value = true
    uploadProgress.value = 'Compressing image...'

    const options = {
      maxSizeMB: 0.2,          
      maxWidthOrHeight: 400,   
      useWebWorker: true       
    }

    const compressedFile = await imageCompression(file, options)
    uploadProgress.value = 'Transmitting to servers...'

    const fileExtension = file.name.split('.').pop()
    const filePath = `avatars/${user.value.uid}/profile.${fileExtension}`
    const profilePicRef = storageRef(storage, filePath)

    // Optimized payload upload stream
    await uploadBytes(profilePicRef, compressedFile)
    const downloadURL = await getDownloadURL(profilePicRef)

    await updateProfile(auth.currentUser, { photoURL: downloadURL })
    
    user.value = { 
      ...auth.currentUser, 
      photoURL: downloadURL + '?t=' + new Date().getTime()
    }
    uploadProgress.value = 'Profile picture updated!'
  } catch (error) {
    alert('Failed to process image: ' + error.message)
  } finally {
    isUploading.value = false
    setTimeout(() => { uploadProgress.value = '' }, 3000)
  }
}

const saveProfileChanges = async () => {
  if (!editDisplayName.value.trim()) return
  try {
    isUploading.value = true
    await updateProfile(auth.currentUser, { displayName: editDisplayName.value })
    user.value = { ...auth.currentUser }
    isEditing.value = false
  } catch (error) {
    alert('Error updating identity signature: ' + error.message)
  } finally {
    isUploading.value = false
  }
}

const handleLogout = async () => {
  if (!confirm('Log out from your personal account hub terminal?')) return
  await signOut(auth)
  router.push('/login')
}
</script>

<template>
  <div class="user-workspace-page">
    
    <!-- 1. Processing state while checking Auth layer -->
    <div v-if="initializing" class="center-loading-state">
      <div class="spinner"></div>
      <p>Verifying secure identity context records…</p>
    </div>

    <!-- 2. Main Fluid Dashboard Structure if authenticated -->
    <div v-else-if="user" class="dashboard-hub-container fade-in">
      
      <!-- LEFT COLUMN: ACCOUNT AVATAR & NAVIGATION TERMINAL -->
      <aside class="dashboard-sidebar-pane">
        <div class="profile-avatar-assembly">
          <div class="avatar-image-frame">
            <img 
              :src="user.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + user.uid" 
              alt="Profile Picture" 
              class="avatar-element"
              referrerpolicy="no-referrer" 
            />
            <label class="upload-interactive-overlay" :class="{ 'is-disabled': isUploading }">
              📷 Click to Change
              <input type="file" accept="image/*" @change="handleImageUpload" :disabled="isUploading" hidden />
            </label>
          </div>
          <h3 class="sidebar-user-headline">{{ user.displayName || 'Pahari User' }}</h3>
          <span class="sidebar-email-subtag">{{ user.email }}</span>
        </div>

        <div v-if="uploadProgress" class="progress-ticker-badge">{{ uploadProgress }}</div>

        <nav class="sidebar-tab-menu-stack">
          <button :class="['menu-tab-btn', { 'is-active': activeTab === 'profile' }]" @click="activeTab = 'profile'">👤 Profile Blueprint</button>
          <button :class="['menu-tab-btn', { 'is-active': activeTab === 'orders' }]" @click="activeTab = 'orders'">🛍️ Harvest Orders Ledger</button>
          <button :class="['menu-tab-btn', { 'is-active': activeTab === 'security' }]" @click="activeTab = 'security'">🔒 Identity Credentials</button>
          <button @click="handleLogout" class="sidebar-logout-action-btn">Terminate Session (Logout)</button>
        </nav>
      </aside>

      <!-- RIGHT COLUMN: DYNAMIC CONTENT PANEL SPACE -->
      <main class="dashboard-workspace-workspace">
        <div v-if="activeTab === 'profile'" class="tab-fade-panel">
          <h2 class="workspace-section-title">Identity Registry Settings</h2>
          <p class="workspace-section-subtitle">Manage public authentication naming tokens and verification signatures.</p>

          <div class="workspace-card-box">
            <div class="detail-display-block" v-if="!isEditing">
              <div class="metadata-row">
                <span class="field-label">Assigned Account Name</span>
                <span class="field-value-bold">{{ user.displayName || 'Pahari User' }}</span>
              </div>
              <button class="pahadse-action-outline-btn" @click="isEditing = true">📝 Mutate Display Name</button>
            </div>

            <div v-else class="detail-edit-form-block">
              <div class="input-wrapper-field">
                <label>Update Full Display Username Signature</label>
                <input v-model="editDisplayName" class="pahadse-core-input" placeholder="Enter Full Name" :disabled="isUploading" />
              </div>
              <div class="action-buttons-group-row">
                <button @click="saveProfileChanges" class="commit-save-btn" :disabled="isUploading">Save Changes</button>
                <button @click="isEditing = false" class="cancel-discard-btn" :disabled="isUploading">Cancel</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'orders'" class="tab-fade-panel">
          <h2 class="workspace-section-title">Provisions Dispatch Tracking</h2>
          <p class="workspace-section-subtitle">Monitor secure raw mountain harvest allotments and bilona ghee allocations.</p>
          <div class="empty-ledger-placeholder-state">
            <span class="placeholder-glyph">🛒</span>
            <h4>No Active Dispatches Placed</h4>
            <p>Your current client cryptographic token contains no finalized checkout runs.</p>
            <button class="return-marketplace-btn" @click="router.push('/')">Browse Fresh Batches</button>
          </div>
        </div>

        <div v-if="activeTab === 'security'" class="tab-fade-panel">
          <h2 class="workspace-section-title">Security & Cryptographic Details</h2>
          <p class="workspace-section-subtitle">System identification references mapped on cloud routing data tracks.</p>
          <div class="workspace-card-box security-specs">
            <div class="metadata-row border-bottom"><span class="field-label">Account UID Identifier Hash</span><code class="security-hash-block">{{ user.uid }}</code></div>
            <div class="metadata-row border-bottom"><span class="field-label">Account Core Registry Email</span><span class="field-value-bold">{{ user.email }}</span></div>
            <div class="metadata-row"><span class="field-label">Email Verified Signature</span><span :class="['verification-badge', user.emailVerified ? 'verified' : 'unverified']">{{ user.emailVerified ? '✓ Authenticated Protocol' : '⚠️ Verification Pending' }}</span></div>
          </div>
        </div>
      </main>

    </div>

    <!-- 3. Clean fallback dashboard view shown when user is explicitly logged out -->
    <div v-else class="logged-out-boundary-card fade-in">
      <span class="boundary-icon">🏔️</span>
      <h3>Log In Required</h3>
      <p>No active session signature discovered on this node. Please log in first to view your profile metrics.</p>
      <button class="commit-save-btn text-center spec-width" @click="router.push('/login')">Go to Login</button>
    </div>

  </div>
</template>

<style scoped>
.user-workspace-page { min-height: 100vh; background-color: #FAF6F0; padding: calc(90px + 40px) 4% 60px; box-sizing: border-box; font-family: 'Jost', sans-serif; color: #111827; }
.center-loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 50vh; gap: 16px; color: #6b7280; }
.spinner { width: 44px; height: 44px; border: 3px solid #e5e7eb; border-top-color: #16a34a; border-radius: 50%; animation: spin 0.85s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.dashboard-hub-container { width: 100%; max-width: 1140px; margin: 0 auto; background-color: #ffffff; border: 2px solid #111827; border-radius: 16px; display: grid; grid-template-columns: 32% 68%; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(28,25,23,0.06); }
.dashboard-sidebar-pane { background-color: #ffffff; border-right: 2px solid #111827; padding: 40px 24px; display: flex; flex-direction: column; box-sizing: border-box; }
.profile-avatar-assembly { text-align: center; margin-bottom: 30px; }
.avatar-image-frame { position: relative; width: 110px; height: 110px; margin: 0 auto 16px; border-radius: 50%; overflow: hidden; border: 3px solid #111827; background-color: #f3f4f6; }
.avatar-element { width: 100%; height: 100%; object-fit: cover; }
.upload-interactive-overlay { position: absolute; bottom: 0; left: 0; width: 100%; background: rgba(17, 24, 39, 0.85); color: #ffffff; font-size: 0.72rem; font-weight: 700; padding: 6px 0; cursor: pointer; opacity: 0; transition: opacity 0.2s ease; display: block; }
.avatar-image-frame:hover .upload-interactive-overlay { opacity: 1; }
.sidebar-user-headline { font-size: 1.35rem; font-weight: 900; color: #111827; margin: 0 0 4px; }
.sidebar-email-subtag { font-size: 0.85rem; color: #6b7280; }
.progress-ticker-badge { text-align: center; background-color: #dcfce7; color: #16a34a; font-size: 0.8rem; font-weight: 700; padding: 6px 12px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #bbf7d0; }
.sidebar-tab-menu-stack { display: flex; flex-direction: column; gap: 8px; }
.menu-tab-btn { width: 100%; padding: 14px 16px; background: transparent; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 700; color: #4b5563; text-align: left; cursor: pointer; }
.menu-tab-btn:hover { background-color: #f3f4f6; color: #111827; }
.menu-tab-btn.is-active { background-color: #111827; color: #FAF6F0; }
.sidebar-logout-action-btn { width: 100%; padding: 14px 16px; background: transparent; border: 2px dashed #ef4444; color: #ef4444; border-radius: 8px; font-size: 0.92rem; font-weight: 700; cursor: pointer; margin-top: 24px; }
.sidebar-logout-action-btn:hover { background-color: #fef2f2; }

.dashboard-workspace-workspace { background-color: #f9fafb; padding: 50px; box-sizing: border-box; }
.workspace-section-title { font-family: 'Cinzel', serif; font-size: 1.8rem; font-weight: 700; color: #111827; margin: 0 0 6px; }
.workspace-section-subtitle { font-size: 0.95rem; color: #6b7280; margin: 0 0 32px; }
.workspace-card-box { background-color: #ffffff; border: 2px solid #cbd5e1; border-radius: 12px; padding: 28px; }
.metadata-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; gap: 16px; flex-wrap: wrap; }
.metadata-row.border-bottom { border-bottom: 1px solid #f1f5f9; }
.field-label { font-size: 0.9rem; font-weight: 800; text-transform: uppercase; color: #4b5563; }
.field-value-bold { font-size: 1.1rem; font-weight: 800; color: #111827; }
.pahadse-action-outline-btn { background: #ffffff; color: #111827; border: 2px solid #111827; padding: 8px 18px; border-radius: 6px; font-size: 0.88rem; font-weight: 700; cursor: pointer; margin-top: 16px; }
.detail-edit-form-block { display: flex; flex-direction: column; gap: 16px; }
.input-wrapper-field { display: flex; flex-direction: column; gap: 6px; }
.input-wrapper-field label { font-size: 0.85rem; font-weight: 800; color: #111827; }
.pahadse-core-input { padding: 14px; border: 2px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; width: 100%; box-sizing: border-box; outline: none; }
.pahadse-core-input:focus { border-color: #16a34a; }
.action-buttons-group-row { display: flex; gap: 10px; justify-content: flex-end; }
.commit-save-btn { background-color: #111827; color: #FAF6F0; border: none; padding: 12px 28px; border-radius: 30px; font-size: 0.9rem; font-weight: 700; cursor: pointer; }
.commit-save-btn.spec-width { width: 100%; max-width: 240px; margin: 0 auto; display: block; }
.commit-save-btn:hover { background-color: #16a34a; }
.cancel-discard-btn { background: #ffffff; color: #4b5563; border: 2px solid #cbd5e1; padding: 12px 24px; border-radius: 30px; font-size: 0.9rem; font-weight: 700; cursor: pointer; }

.empty-ledger-placeholder-state { text-align: center; padding: 60px 20px; background: #ffffff; border: 2px dashed #cbd5e1; border-radius: 12px; }
.placeholder-glyph { font-size: 3.5rem; display: block; margin-bottom: 12px; }
.empty-ledger-placeholder-state h4 { margin: 0 0 6px; font-size: 1.2rem; font-weight: 800; color: #111827; }
.empty-ledger-placeholder-state p { margin: 0 0 24px; font-size: 0.92rem; line-height: 1.5; }
.return-marketplace-btn { background-color: #16a34a; color: #ffffff; border: none; padding: 12px 28px; border-radius: 30px; font-weight: 700; cursor: pointer; }

.security-hash-block { background-color: #f3f4f6; padding: 4px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-weight: 700; color: #111827; font-family: monospace; word-break: break-all; }
.verification-badge { font-size: 0.82rem; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; }
.verification-badge.verified { background-color: #dcfce7; color: #16a34a; }
.verification-badge.unverified { background-color: #fef2f2; color: #dc2626; }

.logged-out-boundary-card { max-width: 420px; margin: 40px auto; background-color: #ffffff; border: 2px solid #111827; border-radius: 14px; padding: 40px 30px; text-align: center; }
.boundary-icon { font-size: 3.5rem; display: block; margin-bottom: 12px; }
.logged-out-boundary-card h3 { font-family: 'Cinzel', serif; font-size: 1.4rem; margin: 0 0 8px; }
.logged-out-boundary-card p { font-size: 0.95rem; color: #4b5563; line-height: 1.6; margin: 0 0 24px; }

.tab-fade-panel { animation: fIn 0.25s ease-out; }
.fade-in { animation: fIn 0.3s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

@media (max-width: 840px) {
  .dashboard-hub-container { grid-template-columns: 1fr; }
  .dashboard-sidebar-pane { border-right: none; border-bottom: 2px solid #111827; padding: 30px 20px; }
  .dashboard-workspace-workspace { padding: 32px 20px; }
}
@media (max-width: 480px) {
  .user-workspace-page { padding-top: calc(90px + 20px); padding-left: 10px; padding-right: 10px; }
  .dashboard-hub-container { border-radius: 12px; }
  .workspace-section-title { font-size: 1.5rem; }
  .workspace-card-box { padding: 16px; }
}
</style>