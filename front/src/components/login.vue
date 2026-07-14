<script setup>
/**
 * Login.vue — Premium Authentication Terminal Node
 * Fixes: Eradicates stacked layout duplication bugs and relies 100% on db.js for backend logic.
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth, provider } from '../firebase.js'
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
// 🚨 IMPORTED DIRECTLY FROM YOUR CENTRAL DB.JS LAYER
import { dispatchPasswordResetToken } from '../components/db.js' // Adjust your relative path here

defineOptions({ name: 'Login' })
const router = useRouter()

// ── CORE APPLICATION USER STATES ──
const email = ref(''), password = ref('')
const errorMessage = ref(''), successMessage = ref('')
const loading = ref(false)

// ── SINGLE-PANE VIEW CONTROLLER (Toggles between 'login' and 'forgot') ──
const activeFormView = ref('login')

const loginWithEmail = async () => {
  try {
    loading.value = true; errorMessage.value = ''; successMessage.value = ''
    await signInWithEmailAndPassword(auth, email.value, password.value)
    router.push('/')
  } catch (error) { 
    errorMessage.value = error.message 
  } finally { 
    loading.value = false 
  }
}

const loginWithGoogle = async () => {
  try {
    loading.value = true; errorMessage.value = ''; successMessage.value = ''
    await signInWithPopup(auth, provider)
    router.push('/products')
  } catch (error) { 
    errorMessage.value = error.message 
  } finally { 
    loading.value = false 
  }
}

// 🔒 CLEAN RECOVERY REQUEST HANDOFF
const handlePasswordRecoveryRequest = async () => {
  if (!email.value.trim()) { 
    errorMessage.value = "Please enter your registered email address first."; 
    return 
  }
  try {
    loading.value = true; errorMessage.value = ''; successMessage.value = ''
    
    // Executes the backend utility inside db.js safely
    await dispatchPasswordResetToken(email.value)
    
    successMessage.value = "A secure verification link has been sent to your inbox. Check your mail folders."
  } catch (error) {
    if (error.message === 'EMAIL_REQUIRED') {
      errorMessage.value = "Email parameter tracking is missing."
    } else {
      errorMessage.value = error.message
    }
  } finally {
    loading.value = false
  }
}

const toggleViewMode = (targetView) => {
  activeFormView.value = targetView
  errorMessage.value = ''
  successMessage.value = ''
}
</script>

<template>
  <div class="login-workspace-page">
    <div class="split-login-card fade-in">
      
      <!-- 🏔️ LEFT SIDE PANEL: BRANDING LOGO CONSOLE -->
      <div class="brand-ambiance-pane">
        <div class="overlay-shader"></div>
        <div class="brand-narrative-content">
          <span class="narrative-icon">🏔️</span>
          <h3>PahadS</h3>
          <p class="tagline">Welcome back to the source.</p>
          <span class="image-location-tag">📍 Mandi, Himachal Pradesh</span>
        </div>
      </div>

      <!-- 📋 RIGHT SIDE PANEL: INTERACTIVE ISOLATED CONTAINER WINDOW -->
      <div class="form-entry-pane">
        
        <!-- ALERT METRIC STRIPS DISPLAY SECTIONS -->
        <div v-if="errorMessage" class="alert-banner error-state"><span>✕</span> {{ errorMessage }}</div>
        <div v-if="successMessage" class="alert-banner success-state"><span>✓</span> {{ successMessage }}</div>

        <!-- ── 🔓 VIEW STATE A: PURE SIGN-IN VIEWPORT ── -->
        <div v-if="activeFormView === 'login'" class="form-view-wrapper tab-fade-panel">
          <header class="pane-header">
            <h2>Account Login</h2>
            <p class="pane-subtitle">Access your personal dashboard and reserve provisions.</p>
          </header>

          <form @submit.prevent="loginWithEmail" class="himalayan-minimal-form">
            <div class="input-wrapper-field">
              <label>Email Address</label>
              <input v-model="email" type="email" placeholder="e.g., name@domain.com" anonymity="off" required :disabled="loading" />
            </div>
            
            <div class="input-wrapper-field">
              <div class="label-flex-row">
                <label>Password</label>
                <!-- Clickable text anchor updates the reactive state flag cleanly -->
                <button type="button" class="forgot-trigger-link" @click="toggleViewMode('forgot')">Forgot Password?</button>
              </div>
              <input v-model="password" type="password" placeholder="••••••••••••" required :disabled="loading" />
            </div>
            
            <button type="submit" class="submit-action-btn" :disabled="loading">
              {{ loading ? 'Verifying Credentials...' : 'Sign In' }}
            </button>
          </form>

          <div class="horizontal-text-divider"><span>OR CONTINUE WITH</span></div>
          
          <button @click="loginWithGoogle" class="google-federation-btn" :disabled="loading">
            <svg class="google-svg-icon" viewBox="0 0 24 24" width="18" height="18"><path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.227C18.214 1.314 15.48 0 12.24 0 5.58 0 0 5.58 0 12.24s5.58 12.24 12.24 12.24c6.96 0 11.57-4.894 11.57-11.79 0-.795-.085-1.4-.195-1.905H12.24z"/></svg>
            Google Identity Protocol
          </button>

          <footer class="pane-footer-switch">
            <p>New to PahadS? <router-link to="/register" class="inline-switch-link">Create Account Here</router-link></p>
          </footer>
        </div>

        <!-- ── 🔒 VIEW STATE B: PURE PASSWORD RECOVERY RECOVERY VIEWPORT ── -->
        <div v-else class="form-view-wrapper tab-fade-panel">
          <header class="pane-header">
            <h2>Recover Password</h2>
            <p class="pane-subtitle">Enter your details to generate a secure email verification token link.</p>
          </header>

          <form @submit.prevent="handlePasswordRecoveryRequest" class="himalayan-minimal-form">
            <div class="input-wrapper-field">
              <label>Registered Account Email</label>
              <input v-model="email" type="email" placeholder="e.g., name@domain.com" required :disabled="loading" />
            </div>
            
            <button type="submit" class="submit-action-btn" :disabled="loading">
              {{ loading ? 'Transmitting Token...' : 'Send Reset Link' }}
            </button>
            
            <button type="button" class="fallback-return-btn" @click="toggleViewMode('login')" :disabled="loading">
              ← Return to Account Login
            </button>
          </form>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
.login-workspace-page { min-height: 100vh; background-color: #FAF6F0; display: flex; align-items: center; justify-content: center; padding: calc(90px + 40px) 20px 40px; box-sizing: border-box; font-family: 'Jost', sans-serif; }
.split-login-card { width: 100%; max-width: 960px; background-color: #ffffff; border: 2px solid #111827; border-radius: 16px; display: grid; grid-template-columns: 45% 55%; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(28,25,23,0.08); }

/* 🏔️ AMBIANCE DECORATION PANELS GRAPHICS */
.brand-ambiance-pane { background-image: url('https://firebasestorage.googleapis.com/v0/b/pahadse-13309.firebasestorage.app/o/other%2Funnamed.jpg?alt=media&token=2a8a1cdf-09e6-4d4f-a92b-3879d4a4c3a6'); background-size: cover; background-position: center; position: relative; display: flex; align-items: flex-start; padding: 22% 40px 40px; box-sizing: border-box; }
.overlay-shader { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(17,24,39,0.85) 0%, rgba(17,24,39,0.5) 100%); z-index: 1; }
.brand-narrative-content { position: relative; z-index: 2; color: #FAF6F0; }
.narrative-icon { font-size: 2.2rem; display: block; margin-bottom: 4px; }
.brand-narrative-content h3 { font-family: 'Cinzel', serif; font-size: 2.4rem; margin: 0 0 4px 0; letter-spacing: 1px; font-weight: 700; }
.tagline { font-size: 1.1rem; line-height: 1.4; margin: 0; color: #e7e5e4; font-weight: 500; font-style: italic; letter-spacing: 0.5px; }
.image-location-tag { display: inline-block; margin-top: 24px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #a8a29e; border-left: 2px solid #16a34a; padding-left: 8px; }

/* 📋 CORE DATA SUBMISSION FIELDS BOXES */
.form-entry-pane { padding: 40px 50px; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; }
.form-view-wrapper { width: 100%; display: flex; flex-direction: column; }
.pane-header { margin-bottom: 24px; }
.pane-header h2 { font-family: 'Cinzel', serif; font-size: 1.8rem; color: #111827; margin: 0 0 4px 0; font-weight: 700; }
.pane-subtitle { font-size: 0.9rem; color: #6b7280; margin: 0; }
.himalayan-minimal-form { display: flex; flex-direction: column; gap: 14px; }
.input-wrapper-field { display: flex; flex-direction: column; gap: 4px; }
.label-flex-row { display: flex; justify-content: space-between; align-items: center; }
.input-wrapper-field label { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: #111827; }

.forgot-trigger-link { background: none; border: none; color: #16a34a; font-weight: 700; font-size: 0.8rem; cursor: pointer; padding: 0; font-family: inherit; outline: none; }
.forgot-trigger-link:hover { text-decoration: underline; }

.input-wrapper-field input { padding: 12px; border: 2px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; background-color: #f9fafb; color: #111827; width: 100%; box-sizing: border-box; outline: none; transition: border-color 0.15s; }
.input-wrapper-field input:focus { border-color: #16a34a; background-color: #ffffff; }

.submit-action-btn { width: 100%; padding: 14px; background-color: #111827; color: #FAF6F0; border: none; border-radius: 30px; font-size: 0.95rem; font-weight: 700; text-transform: uppercase; cursor: pointer; margin-top: 6px; outline: none; }
.submit-action-btn:hover:not(:disabled) { background-color: #16a34a; }

.fallback-return-btn { width: 100%; padding: 12px; background-color: #ffffff; color: #111827; border: 2px solid #111827; border-radius: 30px; font-size: 0.9rem; font-weight: 700; cursor: pointer; margin-top: 8px; font-family: inherit; outline: none; }
.fallback-return-btn:hover { background-color: #f3f4f6; }

.horizontal-text-divider { display: flex; align-items: center; text-align: center; margin: 18px 0; color: #9ca3af; }
.horizontal-text-divider::before, .horizontal-text-divider::after { content: ''; flex: 1; border-bottom: 1px solid #e5e7eb; }
.horizontal-text-divider span { padding: 0 12px; font-size: 0.72rem; font-weight: 800; }
.google-federation-btn { width: 100%; padding: 12px; background-color: #ffffff; color: #111827; border: 2px solid #111827; border-radius: 30px; font-size: 0.9rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; outline: none; }
.google-federation-btn:hover:not(:disabled) { background-color: #f3f4f6; }

.alert-banner { padding: 10px 14px; border-radius: 8px; font-size: 0.88rem; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.alert-banner.error-state { background-color: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
.alert-banner.success-state { background-color: #f0fdf4; color: #16a34a; border: 1px solid #86efac; }

.pane-footer-switch { margin-top: 24px; text-align: center; }
.pane-footer-switch p { font-size: 0.88rem; color: #4b5563; margin: 0; }
.inline-switch-link { color: #16a34a; text-decoration: none; font-weight: 700; margin-left: 4px; }
.inline-switch-link:hover { text-decoration: underline; }

.fade-in { animation: fIn 0.3s ease-out; }
.tab-fade-panel { animation: fIn 0.2s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

/* ── 📱 ADAPTIVE MOBILE LAYOUT ENGINE RULES ── */
@media (max-width: 840px) {
  .split-login-card { grid-template-columns: 1fr; max-width: 500px; }
  .brand-ambiance-pane { display: flex; padding: 60px 30px; border-bottom: 2px solid #111827; background-position: 50% 35%; }
  .brand-narrative-content h3 { font-size: 2rem; }
  .tagline { font-size: 1rem; }
  .form-entry-pane { padding: 32px 24px; }
}
@media (max-width: 480px) {
  .login-workspace-page { padding-top: calc(90px + 20px); padding-bottom: 20px; padding-left: 12px; padding-right: 12px; }
  .brand-ambiance-pane { padding: 45px 20px; }
  .pane-header h2 { font-size: 1.6rem; }
  .form-entry-pane { padding: 24px 16px; }
}
</style>