<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth, provider } from '../firebase.js'
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth'
import { createUserDocument } from '../components/db.js'

defineOptions({ name: 'Register' })
const router = useRouter(), name = ref(''), email = ref(''), password = ref(''), confirmPassword = ref('')
const loading = ref(false), errorMessage = ref(''), successMessage = ref('')

const registerWithEmail = async () => {
  if (password.value !== confirmPassword.value) { errorMessage.value = "Passwords do not match."; return }
  try {
    loading.value = true; errorMessage.value = ''; successMessage.value = ''
    const credential = await createUserWithEmailAndPassword(auth, email.value, password.value)
    await updateProfile(credential.user, { displayName: name.value })
    await createUserDocument({ uid: credential.user.uid, name: name.value, email: email.value, provider: 'email', role: 'user' })
    successMessage.value = 'Account created successfully'; router.push('/')
  } catch (error) { errorMessage.value = error.message } finally { loading.value = false }
}

const signupWithGoogle = async () => {
  try {
    loading.value = true; errorMessage.value = ''; successMessage.value = ''
    const result = await signInWithPopup(auth, provider)
    await createUserDocument({ uid: result.user.uid, name: result.user.displayName, email: result.user.email, provider: 'google', photoURL: result.user.photoURL, role: 'user' })
    successMessage.value = `Welcome ${result.user.displayName}`; router.push('/')
  } catch (error) { errorMessage.value = error.message } finally { loading.value = false }
}
</script>

<template>
  <div class="register-workspace-page">
    <div class="split-register-card fade-in">
      
      <div class="brand-ambiance-pane">
        <div class="overlay-shader"></div>
        <div class="brand-narrative-content">
          <span class="narrative-icon">🏔️</span>
          <h3>PahadSe</h3>
          <p class="tagline">Pure. Pristine. Straight from the Peaks.</p>
          <span class="image-location-tag">📍 Mandi, Himachal Pradesh</span>
        </div>
      </div>

      <div class="form-entry-pane">
        <header class="pane-header">
          <h2>Create Account</h2>
          <p class="pane-subtitle">Join us to access pure high-altitude provisions.</p>
        </header>

        <div v-if="errorMessage" class="alert-banner error-state"><span>✕</span> {{ errorMessage }}</div>
        <div v-if="successMessage" class="alert-banner success-state"><span>✓</span> {{ successMessage }}</div>

        <form @submit.prevent="registerWithEmail" class="himalayan-minimal-form">
          <div class="input-wrapper-field"><label>Full Name</label><input v-model="name" type="text" placeholder="e.g., Manish Sharma" required :disabled="loading" /></div>
          <div class="input-wrapper-field"><label>Email Address</label><input v-model="email" type="email" placeholder="e.g., name@domain.com" required :disabled="loading" /></div>
          <div class="input-wrapper-field"><label>Password</label><input v-model="password" type="password" placeholder="••••••••••••" required :disabled="loading" /></div>
          <div class="input-wrapper-field"><label>Confirm Password</label><input v-model="confirmPassword" type="password" placeholder="••••••••••••" required :disabled="loading" /></div>
          <button type="submit" class="submit-action-btn" :disabled="loading">{{ loading ? 'Creating Account Terminal...' : 'Sign Up' }}</button>
        </form>

        <div class="horizontal-text-divider"><span>OR CONTINUE WITH</span></div>
        <button @click="signupWithGoogle" class="google-federation-btn" :disabled="loading">
          <svg class="google-svg-icon" viewBox="0 0 24 24" width="18" height="18"><path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.227C18.214 1.314 15.48 0 12.24 0 5.58 0 0 5.58 0 12.24s5.58 12.24 12.24 12.24c6.96 0 11.57-4.894 11.57-11.79 0-.795-.085-1.4-.195-1.905H12.24z"/></svg>
          Google Identity Protocol
        </button>

        <footer class="pane-footer-switch"><p>Already registered? <router-link to="/login" class="inline-switch-link">Log In Here</router-link></p></footer>
      </div>

    </div>
  </div>
</template>

<style scoped>
.register-workspace-page { min-height: 100vh; background-color: #FAF6F0; display: flex; align-items: center; justify-content: center; padding: calc(90px + 40px) 20px 40px; box-sizing: border-box; font-family: 'Jost', sans-serif; }
.split-register-card { width: 100%; max-width: 960px; background-color: #ffffff; border: 2px solid #111827; border-radius: 16px; display: grid; grid-template-columns: 45% 55%; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(28,25,23,0.08); }

/* 🏔️ AMBIANCE PANE STYLES (Clean horizontal setup) */
.brand-ambiance-pane { background-image: url('https://firebasestorage.googleapis.com/v0/b/pahadse-13309.firebasestorage.app/o/other%2Funnamed%20(11).jpg?alt=media&token=6d7b1ada-9ac9-4749-b8e3-c434da20c984'); background-size: cover; background-position: center; position: relative; display: flex; align-items: flex-start; padding: 22% 40px 40px; box-sizing: border-box; }
.overlay-shader { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(17,24,39,0.85) 0%, rgba(17,24,39,0.4) 100%); z-index: 1; }
.brand-narrative-content { position: relative; z-index: 2; color: #FAF6F0; }
.narrative-icon { font-size: 2.2rem; display: block; margin-bottom: 4px; }
.brand-narrative-content h3 { font-family: 'Cinzel', serif; font-size: 2.4rem; margin: 0 0 4px 0; letter-spacing: 1px; font-weight: 700; }
.tagline { font-size: 1.1rem; line-height: 1.4; margin: 0; color: #e7e5e4; font-weight: 500; font-style: italic; letter-spacing: 0.5px; }
.image-location-tag {
  display: inline-block;
  margin-top: 24px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #a8a29e; /* Muted stone grey color */
  border-left: 2px solid #16a34a; /* Green organic accent line */
  padding-left: 8px;
}



/* 📋 FORM PANEL LAYOUT COMPONENTS */
.form-entry-pane { padding: 40px 50px; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; }
.pane-header { margin-bottom: 20px; }
.pane-header h2 { font-family: 'Cinzel', serif; font-size: 1.8rem; color: #111827; margin: 0 0 4px 0; font-weight: 700; }
.pane-subtitle { font-size: 0.9rem; color: #6b7280; margin: 0; }
.himalayan-minimal-form { display: flex; flex-direction: column; gap: 14px; }
.input-wrapper-field { display: flex; flex-direction: column; gap: 4px; }
.input-wrapper-field label { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: #111827; }
.input-wrapper-field input { padding: 12px; border: 2px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; background-color: #f9fafb; color: #111827; width: 100%; box-sizing: border-box; outline: none; transition: border-color 0.15s; }
.input-wrapper-field input:focus { border-color: #16a34a; background-color: #ffffff; }
.submit-action-btn { width: 100%; padding: 14px; background-color: #111827; color: #FAF6F0; border: none; border-radius: 30px; font-size: 0.95rem; font-weight: 700; text-transform: uppercase; cursor: pointer; margin-top: 6px; }
.submit-action-btn:hover:not(:disabled) { background-color: #16a34a; }
.horizontal-text-divider { display: flex; align-items: center; text-align: center; margin: 18px 0; color: #9ca3af; }
.horizontal-text-divider::before, .horizontal-text-divider::after { content: ''; flex: 1; border-bottom: 1px solid #e5e7eb; }
.horizontal-text-divider span { padding: 0 12px; font-size: 0.72rem; font-weight: 800; }
.google-federation-btn { width: 100%; padding: 12px; background-color: #ffffff; color: #111827; border: 2px solid #111827; border-radius: 30px; font-size: 0.9rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; }
.google-federation-btn:hover:not(:disabled) { background-color: #f3f4f6; }
.alert-banner { padding: 10px 14px; border-radius: 8px; font-size: 0.88rem; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.alert-banner.error-state { background-color: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
.alert-banner.success-state { background-color: #f0fdf4; color: #16a34a; border: 1px solid #86efac; }
.pane-footer-switch { margin-top: 24px; text-align: center; }
.pane-footer-switch p { font-size: 0.88rem; color: #4b5563; margin: 0; }
.inline-switch-link { color: #16a34a; text-decoration: none; font-weight: 700; margin-left: 4px; }
.inline-switch-link:hover { text-decoration: underline; }
.fade-in { animation: fIn 0.3s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

/* ── 📱 UPGRADED MOBILE BREAKPOINTS: PREVENT IMAGE DISAPPEARING ── */
@media (max-width: 840px) {
  .split-register-card { grid-template-columns: 1fr; max-width: 500px; }
  
  /* Stacks image context gracefully at the top of the card on mobile */
  .brand-ambiance-pane { 
    display: flex; 
    padding: 60px 30px; 
    border-bottom: 2px solid #111827; 
  }
  .brand-narrative-content h3 { font-size: 2rem; }
  .tagline { font-size: 1rem; }
  .form-entry-pane { padding: 32px 24px; }
}

@media (max-width: 840px) {
  .split-register-card { grid-template-columns: 1fr; max-width: 500px; }
  
  /* Stacks image context gracefully at the top of the card on mobile */
  .brand-ambiance-pane { 
    display: flex; 
    padding: 60px 30px; 
    border-bottom: 2px solid #111827; 
    
    /* ── 🚨 CHANGED: Shift vertical image anchoring precisely to the upper-middle area ── */
    background-position: 80% 80%; /* horizontal-center (70%), vertical-upper-mid (35%) */
  }
  .brand-narrative-content h3 { font-size: 2rem; }
  .tagline { font-size: 1rem; }
  .form-entry-pane { padding: 32px 24px; }
}
</style>