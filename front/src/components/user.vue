<script setup>
import { ref, onMounted } from 'vue'
import { auth, storage } from '../firebase.js' // 🛠️ Imported storage
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import imageCompression from 'browser-image-compression' // 🛠️ Compression engine

defineOptions({
  name: 'User'
})

const user = ref(null)
const isEditing = ref(false)
const text = ref('') // 🛠️ FIXED: Added missing template input reference

// Local Form States
const editDisplayName = ref('')
const isUploading = ref(false)
const uploadProgress = ref('')

onMounted(() => {
  onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser
    if (currentUser) {
      editDisplayName.value = currentUser.displayName || ''
    }
  })
})

// 📸 COMPRESS & UPLOAD ENGINE
const handleImageUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  // Basic security check
  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file.')
    return
  }

  try {
    isUploading.value = true
    uploadProgress.value = 'Compressing image...'

    // 📉 Compression Configuration Settings
    const options = {
      maxSizeMB: 0.2,          // Limits total file footprint size to 200KB max
      maxWidthOrHeight: 400,   // Standard profile layout photo aspect bounds
      useWebWorker: true       // Runs task on background threads (No screen freezes)
    }

    // Run compression task
    const compressedFile = await imageCompression(file, options)
    uploadProgress.value = 'Uploading to pahadSe servers...'

    // Create Firebase Storage pathway pointer reference
    const fileExtension = file.name.split('.').pop()
    
    const filePath = `avatars/${user.value.uid}/profile.${fileExtension}`
    const profilePicRef = storageRef(storage, filePath)

    // Send optimized data payload up to the cloud storage bucket
    await uploadBytes(profilePicRef, compressedFile)
    
    // Retrieve download link
    const downloadURL = await getDownloadURL(profilePicRef)

    // Synchronize global account details state
    await updateProfile(auth.currentUser, { photoURL: downloadURL })
    
    // Force reactive interface update reload
    await uploadBytes(profilePicRef, compressedFile)
    user.value = { 
      ...auth.currentUser, 
      photoURL: downloadURL + '?t=' + new Date().getTime() // 🚀 Forces browser cache refresh
    }
    uploadProgress.value = 'Profile picture updated!'
  } catch (error) {
    alert('Failed to process image: ' + error.message)
  } finally {
    isUploading.value = false
    setTimeout(() => { uploadProgress.value = '' }, 3000)
  }
}

// 📝 USERNAME SAVING LOGIC
const saveProfileChanges = async () => {
  if (!editDisplayName.value.trim()) return
  
  try {
    isUploading.value = true
    await updateProfile(auth.currentUser, {
      displayName: editDisplayName.value
    })
    user.value = { ...auth.currentUser }
    isEditing.value = false
  } catch (error) {
    alert('Error updating name: ' + error.message)
  } finally {
    isUploading.value = false
  }
}

const handleLogout = async () => {
  await signOut(auth)
}
</script>

<template>
  <div class="profile-card" v-if="user">
    
    <!-- 🖼️ IMAGE WRAPPER WITH UPLOAD TRIGGER OVERLAY -->
    <div class="avatar-container">
      <img 
        :src="user.photoURL || 'https://dicebear.com' + user.uid" 
        alt="Profile Picture" 
        class="avatar"
        referrerpolicy="no-referrer" 
      />
      <label class="upload-overlay" :class="{ disabled: isUploading }">
        📷 Change
        <input type="file" accept="image/*" @change="handleImageUpload" :disabled="isUploading" hidden />
      </label>
    </div>

    <!-- Status Ticker Messages -->
    <p v-if="uploadProgress" class="progress-text">{{ uploadProgress }}</p>

    <!-- 👤 DISPLAY NAME LOGIC SEGMENT (Read / Edit Toggle States) -->
    <div class="user-details-block">
      <div v-if="!isEditing">
        <h3>Welcome, {{ user.displayName || 'Pahari User' }}</h3>
        <button class="edit-text-btn" @click="isEditing = true">📝 Edit Name</button>
      </div>
      
      <div v-else class="edit-form-row">
        <input v-model="editDisplayName" class="edit-input" placeholder="Your Name" :disabled="isUploading" />
        <div class="action-row-buttons">
          <button @click="saveProfileChanges" class="save-btn" :disabled="isUploading">Save</button>
          <button @click="isEditing = false" class="cancel-btn" :disabled="isUploading">Cancel</button>
        </div>
      </div>
    </div>
    
    <p class="email">📧 {{ user.email }}</p>

    <button @click="handleLogout" class="logout-btn">Sign Out</button>
  </div>
  
  <div v-else class="logged-out">
    <p>No user logged in. Please log in to view your profile.</p>
  </div>

  <!-- FIXED NOTES TRACKING UTILITY BOX -->
  <div class="quick-notes-test-box">
    <input v-model="text" placeholder="Type testing logs here..." />
    <p v-if="text">Live Preview Output: {{ text }}</p>
  </div>
</template>

<style scoped>
.profile-card { max-width: 320px; margin: 6rem auto 2rem auto; background-color: #fff; text-align: center; border: 1px solid #eef2f2; padding: 2rem 1.5rem; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); font-family: system-ui, sans-serif; }

/* Avatar Container Layout with Hover Overlay Trigger Effect */
.avatar-container { position: relative; width: 100px; height: 100px; margin: 0 auto 1rem auto; border-radius: 50%; overflow: hidden; border: 3px solid #10b981; }
.avatar { width: 100%; height: 100%; object-fit: cover; }
.upload-overlay { position: absolute; bottom: 0; left: 0; width: 100%; background: rgba(0,0,0,0.6); color: #fff; font-size: 0.75rem; padding: 4px 0; cursor: pointer; opacity: 0; transition: opacity 0.2s; display: block; }
.avatar-container:hover .upload-overlay { opacity: 1; }
.upload-overlay.disabled { pointer-events: none; background: #6b7280; }

.progress-text { font-size: 0.8rem; color: #10b981; margin: 0 0 10px 0; font-weight: 500; }
.user-details-block { margin-bottom: 1.5rem; min-height: 75px; display: flex; flex-direction: column; justify-content: center; }
h3 { margin: 0 0 4px 0; color: #1f2937; font-size: 1.25rem; }

.edit-text-btn { background: none; border: none; color: #10b981; font-size: 0.85rem; cursor: pointer; font-weight: 500; }
.edit-text-btn:hover { text-decoration: underline; }

/* Inline Editor Inputs Style */
.edit-form-row { display: flex; flex-direction: column; gap: 8px; width: 100%; align-items: center; }
.edit-input { padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.95rem; text-align: center; width: 85%; }
.action-row-buttons { display: flex; gap: 8px; }
.save-btn { background: #10b981; color: white; border: none; padding: 4px 12px; border-radius: 4px; font-size: 0.85rem; cursor: pointer; }
.cancel-btn { background: #f3f4f6; color: #4b5563; border: 1px solid #d1d5db; padding: 4px 12px; border-radius: 4px; font-size: 0.85rem; cursor: pointer; }

.email { font-size: 0.85rem; color: #6b7280; margin-bottom: 1.5rem; background: #f9fafb; padding: 6px; border-radius: 6px; display: inline-block; }

.logout-btn { background-color: #ef4444; color: white; border: none; padding: 0.5rem 1.5rem; border-radius: 6px; cursor: pointer; font-weight: 500; width: 100%; transition: background 0.2s; }
.logout-btn:hover { background-color: #dc2626; }

.logged-out { text-align: center; margin-top: 6rem; color: #666; }

/* Bottom Utility Component */
.quick-notes-test-box { max-width: 320px; margin: 20px auto; text-align: center; font-size: 0.9rem; color: #6b7280; }
.quick-notes-test-box input { padding: 6px; border-radius: 4px; border: 1px solid #ccc; width: 80%; }
</style>
