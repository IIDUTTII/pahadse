<script setup>
/**
 * User.vue — Premium Client Management Hub Terminal
 * Fixes: Restores independent profile configurations, routes chat to dedicated support collection.
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth, storage, db } from '../firebase.js'
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { doc, onSnapshot, collection, query, where, updateDoc, setDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'
import imageCompression from 'browser-image-compression'
import { addNewUserAddress, removeUserAddressFromDb, modifyUserAddressInDb } from './db.js'

defineOptions({ name: 'User' })
const router = useRouter()

const user          = ref(null)
const isEditingName = ref(false)
const activeTab     = ref('profile') // profile, shipping, orders, support
const initializing  = ref(true)

const userProfileDoc  = ref(null)
const userOrdersList  = ref([])

// ── Profile Form States
const editDisplayName = ref('')
const isUploading     = ref(false)
const uploadProgress  = ref('')

// ── Isolated Address Manager
const isEditingAddress = ref(false)
const targetingAddressId = ref(null)
const addressForm = ref({ label: 'Home', fullName: '', phone: '', streetAddress: '', city: '', state: 'Himachal Pradesh', pincode: '' })

// ── Dedicated Support Chat
const supportMessages = ref([])
const newChatText     = ref('')
const isSendingChat   = ref(false)
let _unsubChat        = null

onMounted(() => {
  onAuthStateChanged(auth, (currentUser) => {
    if (!currentUser) { user.value = null; initializing.value = false; return }
    user.value = currentUser
    editDisplayName.value = currentUser.displayName || ''

    onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      if (snap.exists()) userProfileDoc.value = snap.data()
    })

    const ordersQuery = query(collection(db, 'orders'), where('userId', '==', currentUser.uid))
    onSnapshot(ordersQuery, (snap) => {
      userOrdersList.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      initializing.value = false
    })

    // 💬 STREAM USER'S DEDICATED SUPPORT THREAD
    _unsubChat = onSnapshot(doc(db, 'supportChats', currentUser.uid), (snap) => {
      if (snap.exists()) { supportMessages.value = snap.data().messages || [] }
    })
  })
})

onUnmounted(() => { if (_unsubChat) _unsubChat() })

const handleImageUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return }
  try {
    isUploading.value = true
    uploadProgress.value = 'Compressing image...'
    const options = { maxSizeMB: 0.2, maxWidthOrHeight: 400, useWebWorker: true }
    const compressedFile = await imageCompression(file, options)
    uploadProgress.value = 'Transmitting to servers...'

    const fileExtension = file.name.split('.').pop()
    const filePath = `avatars/${user.value.uid}/profile.${fileExtension}`
    const profilePicRef = storageRef(storage, filePath)

    await uploadBytes(profilePicRef, compressedFile)
    const downloadURL = await getDownloadURL(profilePicRef)

    await updateProfile(auth.currentUser, { photoURL: downloadURL })
    await updateDoc(doc(db, 'users', user.value.uid), { photoURL: downloadURL })
    
    user.value = { ...auth.currentUser, photoURL: downloadURL + '?t=' + new Date().getTime() }
    uploadProgress.value = 'Profile picture updated!'
  } catch (error) { alert('Image process failed: ' + error.message) } 
  finally { isUploading.value = false; setTimeout(() => { uploadProgress.value = '' }, 3000) }
}

const saveProfileChanges = async () => {
  if (!editDisplayName.value.trim()) return
  try {
    isUploading.value = true
    await updateProfile(auth.currentUser, { displayName: editDisplayName.value.trim() })
    await updateDoc(doc(db, 'users', user.value.uid), { displayName: editDisplayName.value.trim() })
    user.value = { ...auth.currentUser }
    isEditingName.value = false
  } catch (error) { alert(error.message) } 
  finally { isUploading.value = false }
}

const initializeNewAddressForm = () => {
  targetingAddressId.value = null; isEditingAddress.value = true
  addressForm.value = { label: 'Home', fullName: '', phone: '', streetAddress: '', city: '', state: 'Himachal Pradesh', pincode: '' }
}
const initializeEditAddressForm = (addr) => {
  targetingAddressId.value = addr.id; isEditingAddress.value = true
  addressForm.value = { ...addr }
}
const commitAddressFormAction = async () => {
  const f = addressForm.value
  if (!f.fullName || !f.phone || !f.streetAddress || !f.pincode) { alert('Required bounds missing.'); return }
  try {
    if (targetingAddressId.value) { await modifyUserAddressInDb(targetingAddressId.value, { ...f }) } 
    else { await addNewUserAddress({ ...f }) }
    isEditingAddress.value = false
  } catch (e) { alert(e.message) }
}
const dropAddressNode = async (addrId) => { if (confirm('Delete this delivery address?')) await removeUserAddressFromDb(addrId) }

// 💬 SEND CUSTOMER SUPPORT MESSAGE (Inline execution for robustness)
const handleSendMessage = async () => {
  if (!newChatText.value.trim() || !user.value) return
  isSendingChat.value = true
  try {
    const chatRef = doc(db, 'supportChats', user.value.uid)
    await setDoc(chatRef, {
      userName: user.value.displayName || 'Pahari User',
      lastUpdated: serverTimestamp(),
      messages: arrayUnion({
        text: newChatText.value.trim(),
        role: 'user',
        timestamp: Date.now()
      })
    }, { merge: true })
    newChatText.value = ''
  } catch (e) { alert(e.message) }
  isSendingChat.value = false
}

const handleLogout = async () => { if (confirm('Log out?')) { await signOut(auth); router.push('/login') } }
const fmtTime = (ms) => ms ? new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''
</script>

<template>
  <div class="user-workspace-page">
    <div v-if="initializing" class="center-loading-state"><div class="spinner"></div><p>Verifying secure identity context records…</p></div>

    <div v-else-if="user" class="dashboard-hub-container fade-in">
      
      <!-- SIDEBAR AVATAR -->
      <aside class="dashboard-sidebar-pane">
        <div class="profile-avatar-assembly">
          <div class="avatar-image-frame">
            <img :src="user.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + user.uid" class="avatar-element" />
            <label class="upload-interactive-overlay" :class="{ 'is-disabled': isUploading }">
              📷 Change
              <input type="file" accept="image/*" @change="handleImageUpload" :disabled="isUploading" hidden />
            </label>
          </div>
          <h3 class="sidebar-user-headline">{{ user.displayName || 'Pahari User' }}</h3>
          <span class="sidebar-email-subtag">{{ user.email }}</span>
        </div>
        <div v-if="uploadProgress" class="progress-ticker-badge">{{ uploadProgress }}</div>

        <nav class="sidebar-tab-menu-stack">
          <button :class="['menu-tab-btn', { 'is-active': activeTab === 'profile' }]" @click="activeTab = 'profile'">👤 Profile Settings</button>
          <button :class="['menu-tab-btn', { 'is-active': activeTab === 'shipping' }]" @click="activeTab = 'shipping'">📦 Shipping Workspace</button>
          <button :class="['menu-tab-btn', { 'is-active': activeTab === 'orders' }]" @click="activeTab = 'orders'">🛍️ Orders Ledger</button>
          <button :class="['menu-tab-btn', { 'is-active': activeTab === 'support' }]" @click="activeTab = 'support'">💬 Support & Help</button>
          <button @click="handleLogout" class="sidebar-logout-action-btn">Log Out</button>
        </nav>
      </aside>

      <main class="dashboard-workspace-workspace">
        
        <!-- 👤 TAB 1: PROFILE INTERFACE -->
        <div v-if="activeTab === 'profile'" class="tab-fade-panel">
          <h2 class="workspace-section-title">Identity Profile Settings</h2>
          <p class="workspace-section-subtitle">Manage public naming conventions bound onto system invoices.</p>
          <div class="workspace-card-box">
            <div v-if="!isEditingName" style="display:flex; justify-content:space-between; align-items:center;">
              <div><span class="field-label">Account Username</span><br><span class="field-value-bold" style="font-size:1.4rem;">{{ user.displayName || 'Pahari User' }}</span></div>
              <button class="pahadse-action-outline-btn" @click="isEditingName = true">📝 Edit Name</button>
            </div>
            <div v-else class="detail-edit-form-block">
              <div class="input-wrapper-field"><label>Update Display Full Naming Signature</label><input v-model="editDisplayName" class="pahadse-core-input" /></div>
              <div class="action-buttons-group-row" style="display:flex; gap:10px; margin-top:12px;"><button class="commit-save-btn" @click="saveProfileChanges">Save Identity</button><button class="cancel-discard-btn" @click="isEditingName = false">Cancel</button></div>
            </div>
          </div>
        </div>

        <!-- 📦 TAB 2: ISOLATED ADDRESS MANAGEMENT -->
        <div v-if="activeTab === 'shipping'" class="tab-fade-panel">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
            <div><h2 class="workspace-section-title">Isolated Shipping Workspace</h2><p class="workspace-section-subtitle">Manage delivery pins safely.</p></div>
            <button v-if="!isEditingAddress" class="commit-save-btn" @click="initializeNewAddressForm">+ Create New Route</button>
          </div>

          <div v-if="isEditingAddress" class="workspace-card-box tab-fade-panel" style="margin-bottom:24px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
              <div class="input-wrapper-field"><label>Address Designation Tag</label><select v-model="addressForm.label" class="pahadse-core-input"><option>Home</option><option>Work/Office</option><option>Village Base</option></select></div>
              <div class="input-wrapper-field"><label>Recipient Full Name</label><input v-model="addressForm.fullName" class="pahadse-core-input" /></div>
              <div class="input-wrapper-field"><label>Phone</label><input v-model="addressForm.phone" class="pahadse-core-input" /></div>
              <div class="input-wrapper-field" style="grid-column:1/-1;"><label>Street Details</label><input v-model="addressForm.streetAddress" class="pahadse-core-input" /></div>
              <div class="input-wrapper-field"><label>City / Tehsil</label><input v-model="addressForm.city" class="pahadse-core-input" /></div>
              <div class="input-wrapper-field"><label>Pincode</label><input v-model="addressForm.pincode" type="number" class="pahadse-core-input" /></div>
            </div>
            <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px;"><button class="cancel-discard-btn" @click="isEditingAddress = false">Cancel</button><button class="commit-save-btn" @click="commitAddressFormAction">Commit Route</button></div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
            <div v-for="addr in userProfileDoc?.addresses || []" :key="addr.id" class="workspace-card-box" style="border:2px solid #111827;">
              <div style="display:flex; justify-content:space-between;"><span class="verification-badge verified">{{ addr.label }}</span>
                <div style="display:flex; gap:10px;"><button @click="initializeEditAddressForm(addr)" style="background:none; border:none; cursor:pointer; color:#ca8a04; font-weight:800;">Edit</button><button @click="dropAddressNode(addr.id)" style="background:none; border:none; cursor:pointer; color:#dc2626; font-weight:800;">Delete</button></div>
              </div>
              <h4 style="margin:12px 0 4px; font-weight:900;">{{ addr.fullName }}</h4>
              <p style="margin:0 0 10px; font-size:0.9rem; color:#4b5563; line-height:1.4;">{{ addr.streetAddress }}, {{ addr.city }}, {{ addr.state }} - {{ addr.pincode }}</p>
              <span style="font-weight:800; font-size:0.85rem;">📞 {{ addr.phone }}</span>
            </div>
          </div>
        </div>

        <!-- 🛍️ TAB 3: ORDERS LOG (Chat removed) -->
        <div v-if="activeTab === 'orders'" class="tab-fade-panel">
          <h2 class="workspace-section-title">Provisions Dispatches History</h2>
          <p class="workspace-section-subtitle">Track parcel trajectories.</p>
          
          <div style="display:flex; flex-direction:column; gap:20px;">
            <div v-for="order in userOrdersList" :key="order.id" class="workspace-card-box" style="border:2px solid #111827;">
              <div style="display:flex; justify-content:space-between; margin-bottom:12px; border-bottom:2px dashed #cbd5e1; padding-bottom:10px;">
                <code>REF ID: {{ order.id }}</code><strong style="font-size:1.1rem;">Total Settle: ₹{{ order.amount }}</strong>
              </div>
              <div style="margin-bottom:12px;"><div v-for="item in order.items" :key="item.productId" style="font-size:0.95rem; font-weight:600;"><span>{{ item.emoji || '📦' }}</span> {{ item.name }} × {{ item.quantity }}</div></div>
              
              <div v-if="order.shippingStatus === 'rejected'" style="background:#fef2f2; border:2px solid #fca5a5; padding:12px; border-radius:8px; color:#dc2626; margin-bottom:12px; font-size:0.95rem;">
                <strong>🛑 Order Rejected by Administration</strong>
                <p v-if="order.adminComment" style="margin:4px 0 0; font-weight:700;">Reason: "{{ order.adminComment }}"</p>
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #cbd5e1;">
                <div><span class="verification-badge" :class="order.shippingStatus === 'shipped' ? 'verified' : 'unverified'">Freight: {{ order.shippingStatus || 'pending' }}</span></div>
                <div v-if="order.shippingStatus === 'shipped' && order.trackingId">
                  <a :href="'https://www.shiprocket.in/shipment-tracking/' + order.trackingId" target="_blank" class="pahadse-action-outline-btn" style="margin:0; background:#111827; color:#ffffff; text-decoration:none;">🚚 Track Parcel Online →</a>
                </div>
              </div>
            </div>
            <div v-if="userOrdersList.length === 0" style="padding:40px; text-align:center; color:#64748b; font-weight:600; border:2px dashed #cbd5e1; border-radius:12px;">No order shipments recorded.</div>
          </div>
        </div>

        <!-- 💬 TAB 4: NEW DEDICATED SUPPORT & HELP DESK -->
        <div v-if="activeTab === 'support'" class="tab-fade-panel" style="display:flex; flex-direction:column; height: 100%;">
          <h2 class="workspace-section-title">Customer Support Desk</h2>
          <p class="workspace-section-subtitle">Chat directly with the PahadSe team regarding active orders, delays, or quality.</p>
          
          <div class="workspace-card-box" style="flex:1; display:flex; flex-direction:column; padding:0; overflow:hidden; border:2px solid #111827; min-height: 400px;">
            <!-- Thread Feed Area -->
            <div style="flex:1; padding:24px; overflow-y:auto; background:#f8fafc; display:flex; flex-direction:column; gap:14px;">
              <div v-if="supportMessages.length === 0" style="text-align:center; color:#64748b; margin-top:40px; font-weight:600;">Type a message below to start your support thread.</div>
              
              <div v-for="(msg, i) in supportMessages" :key="i" :style="{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }">
                <div style="font-size:0.75rem; color:#64748b; margin-bottom:4px; font-weight:700;" :style="{ textAlign: msg.role === 'user' ? 'right' : 'left' }">
                  {{ msg.role === 'user' ? 'You' : 'PahadSe Admin' }} • {{ fmtTime(msg.timestamp) }}
                </div>
                <div style="padding:12px 16px; border-radius:12px; font-size:0.95rem; font-weight:600; line-height:1.4;" 
                     :style="{ background: msg.role === 'user' ? '#111827' : '#ffffff', color: msg.role === 'user' ? '#fff' : '#0f172a', border: msg.role === 'user' ? 'none' : '2px solid #cbd5e1' }">
                  {{ msg.text }}
                </div>
              </div>
            </div>
            
            <!-- Send Field -->
            <div style="padding:16px; background:#ffffff; border-top:2px solid #cbd5e1; display:flex; gap:10px;">
              <input v-model="newChatText" placeholder="Type your message here..." class="pahadse-core-input" style="flex:1; padding:12px;" @keyup.enter="handleSendMessage" />
              <button class="commit-save-btn" style="padding:12px 28px; border-radius:8px;" @click="handleSendMessage" :disabled="isSendingChat">{{ isSendingChat ? '...' : 'Send' }}</button>
            </div>
          </div>
        </div>

      </main>
    </div>
  </div>
</template>

<style scoped>
.user-workspace-page { min-height: 100vh; background-color: #FAF6F0; padding: calc(90px + 40px) 4% 60px; box-sizing: border-box; font-family: 'Jost', sans-serif; color: #111827; }
.center-loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 50vh; gap: 16px; color: #6b7280; }
.spinner { width: 44px; height: 44px; border: 3px solid #e5e7eb; border-top-color: #16a34a; border-radius: 50%; animation: spin 0.85s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.dashboard-hub-container { width: 100%; max-width: 1140px; margin: 0 auto; background-color: #ffffff; border: 2px solid #111827; border-radius: 16px; display: grid; grid-template-columns: 32% 68%; overflow: hidden; }
.dashboard-sidebar-pane { background-color: #ffffff; border-right: 2px solid #111827; padding: 40px 24px; display: flex; flex-direction: column; }
.profile-avatar-assembly { text-align: center; margin-bottom: 30px; }
.avatar-image-frame { position: relative; width: 110px; height: 110px; margin: 0 auto 16px; border-radius: 50%; overflow: hidden; border: 3px solid #111827; }
.avatar-element { width: 100%; height: 100%; object-fit: cover; }
.upload-interactive-overlay { position: absolute; bottom: 0; left: 0; width: 100%; background: rgba(17, 24, 39, 0.85); color: #ffffff; font-size: 0.72rem; font-weight: 700; padding: 6px 0; cursor: pointer; opacity: 0; transition: opacity 0.2s ease; display: block; }
.avatar-image-frame:hover .upload-interactive-overlay { opacity: 1; }
.sidebar-user-headline { font-size: 1.35rem; font-weight: 900; margin: 0 0 4px; color: #0f172a; }
.sidebar-email-subtag { font-size: 0.85rem; color: #475569; font-weight: 600; }
.sidebar-tab-menu-stack { display: flex; flex-direction: column; gap: 8px; }
.menu-tab-btn { width: 100%; padding: 14px 16px; background: transparent; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 800; color: #475569; text-align: left; cursor: pointer; }
.menu-tab-btn:hover { background-color: #f1f5f9; color: #0f172a; }
.menu-tab-btn.is-active { background-color: #111827; color: #FAF6F0; }
.sidebar-logout-action-btn { width: 100%; padding: 14px 16px; background: transparent; border: 2px dashed #ef4444; color: #ef4444; border-radius: 8px; font-size: 0.92rem; font-weight: 800; cursor: pointer; margin-top: 24px; }
.dashboard-workspace-workspace { background-color: #f8fafc; padding: 50px; }
.workspace-section-title { font-family: 'Cinzel', serif; font-size: 1.8rem; font-weight: 800; margin: 0 0 6px; color: #0f172a; }
.workspace-section-subtitle { font-size: 0.95rem; color: #475569; margin: 0 0 32px; font-weight: 600; }
.workspace-card-box { background-color: #ffffff; border: 2px solid #cbd5e1; border-radius: 12px; padding: 28px; }
.field-label { font-size: 0.85rem; font-weight: 900; text-transform: uppercase; color: #475569; }
.field-value-bold { font-weight: 900; color: #0f172a; }
.pahadse-action-outline-btn { background: #ffffff; color: #111827; border: 2px solid #111827; padding: 8px 18px; border-radius: 8px; font-size: 0.88rem; font-weight: 800; cursor: pointer; margin-top: 16px; }
.pahadse-core-input { padding: 14px; border: 2px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; width: 100%; box-sizing: border-box; outline: none; background: #f8fafc; font-weight: 600; color: #0f172a; }
.commit-save-btn { background-color: #111827; color: #FAF6F0; border: none; padding: 12px 28px; border-radius: 8px; font-size: 0.9rem; font-weight: 800; cursor: pointer; }
.cancel-discard-btn { background: #ffffff; color: #475569; border: 2px solid #cbd5e1; padding: 12px 24px; border-radius: 8px; font-size: 0.9rem; font-weight: 800; cursor: pointer; }
.verification-badge { font-size: 0.75rem; font-weight: 900; padding: 6px 14px; border-radius: 20px; text-transform: uppercase; display: inline-block; }
.verification-badge.verified { background-color: #dcfce7; color: #16a34a; border: 2px solid #bbf7d0; }
.verification-badge.unverified { background-color: #fff7ed; color: #c2410c; border: 2px solid #ffedd5; }
.tab-fade-panel { animation: fIn 0.25s ease-out; }
.fade-in { animation: fIn 0.3s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (max-width: 840px) { .dashboard-hub-container { grid-template-columns: 1fr; } .dashboard-sidebar-pane { border-right: none; border-bottom: 2px solid #111827; } }
</style>