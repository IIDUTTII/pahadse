<script setup>
/**
 * Login.vue — Premium Authentication Terminal Node
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth, provider } from '../firebase.js'
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { dispatchPasswordResetToken } from '../components/db.js' 

defineOptions({ name: 'Login' })
const router = useRouter()

const email = ref(''), password = ref('')
const errorMessage = ref(''), successMessage = ref('')
const loading = ref(false)
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

const handlePasswordRecoveryRequest = async () => {
  if (!email.value.trim()) { 
    errorMessage.value = "Please enter your registered email address first."; 
    return 
  }
  try {
    loading.value = true; errorMessage.value = ''; successMessage.value = ''
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
  <div class="auth-workspace-page">
    <div class="split-card fade-in">
      
      <div class="brand-ambiance-pane login-bg">
        <div class="overlay-shader"></div>
        <div class="brand-narrative-content">
          <span class="narrative-icon">🏔️</span>
          <h3>PahadS.</h3>
          <p class="tagline">Welcome back to the source.</p>
          <span class="image-location-tag">Mandi, Himachal Pradesh</span>
        </div>
      </div>

      <div class="form-entry-pane">
        
        <transition name="fade">
          <div v-if="errorMessage" class="alert-banner error-state"><span>⚠</span> {{ errorMessage }}</div>
        </transition>
        <transition name="fade">
          <div v-if="successMessage" class="alert-banner success-state"><span>✓</span> {{ successMessage }}</div>
        </transition>

        <div v-if="activeFormView === 'login'" class="form-view-wrapper tab-fade-panel">
          <header class="pane-header">
            <h2>Account Login</h2>
            <p class="pane-subtitle">Access your dashboard and reserve provisions.</p>
          </header>

          <form @submit.prevent="loginWithEmail" class="modern-form">
            <div class="input-wrapper-field">
              <label>Email Address</label>
              <input v-model="email" type="email" placeholder="name@domain.com" required :disabled="loading" class="clean-input" />
            </div>
            
            <div class="input-wrapper-field">
              <div class="label-flex-row">
                <label>Password</label>
                <button type="button" class="forgot-trigger-link" @click="toggleViewMode('forgot')">Forgot?</button>
              </div>
              <input v-model="password" type="password" placeholder="••••••••" required :disabled="loading" class="clean-input" />
            </div>
            
            <button type="submit" class="submit-action-btn" :disabled="loading">
              {{ loading ? 'Verifying...' : 'Sign In' }}
            </button>
          </form>

          <div class="horizontal-text-divider"><span>OR CONTINUE WITH</span></div>
          
          <button @click="loginWithGoogle" class="google-federation-btn" :disabled="loading">
            <svg class="google-svg-icon" viewBox="0 0 24 24" width="18" height="18"><path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.227C18.214 1.314 15.48 0 12.24 0 5.58 0 0 5.58 0 12.24s5.58 12.24 12.24 12.24c6.96 0 11.57-4.894 11.57-11.79 0-.795-.085-1.4-.195-1.905H12.24z"/></svg>
            Google Identity
          </button>

          <footer class="pane-footer-switch">
            <p>New to PahadS? <router-link to="/register" class="inline-switch-link">Create Account</router-link></p>
          </footer>
        </div>

        <div v-else class="form-view-wrapper tab-fade-panel">
          <header class="pane-header">
            <h2>Recover Password</h2>
            <p class="pane-subtitle">Enter your email to receive a secure reset link.</p>
          </header>

          <form @submit.prevent="handlePasswordRecoveryRequest" class="modern-form">
            <div class="input-wrapper-field">
              <label>Registered Email</label>
              <input v-model="email" type="email" placeholder="name@domain.com" required :disabled="loading" class="clean-input" />
            </div>
            
            <button type="submit" class="submit-action-btn" :disabled="loading">
              {{ loading ? 'Sending...' : 'Send Reset Link' }}
            </button>
            
            <button type="button" class="fallback-return-btn" @click="toggleViewMode('login')" :disabled="loading">
              ← Back to Login
            </button>
          </form>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.auth-workspace-page { min-height: 100vh; background-color: #ffffff; display: flex; align-items: center; justify-content: center; padding: 100px 24px 60px; box-sizing: border-box; font-family: 'Inter', sans-serif; color: #111827;}
.split-card { width: 100%; max-width: 960px; background-color: #ffffff; border: 1px solid #F3F4F6; border-radius: 24px; display: grid; grid-template-columns: 45% 55%; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,0.06); }

/* 🏔️ AMBIANCE IMAGE PANELS */
.brand-ambiance-pane { background-size: cover; background-position: center; position: relative; display: flex; flex-direction: column; justify-content: flex-end; padding: 40px; box-sizing: border-box; }
.login-bg { background-image: url('https://firebasestorage.googleapis.com/v0/b/pahadse-13309.firebasestorage.app/o/other%2Funnamed.jpg?alt=media&token=2a8a1cdf-09e6-4d4f-a92b-3879d4a4c3a6'); }

/* Smart Gradient: Transparent at top, dark at bottom for text readability */
.overlay-shader { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.85) 100%); z-index: 1; }
.brand-narrative-content { position: relative; z-index: 2; color: #ffffff; }
.narrative-icon { font-size: 2rem; display: block; margin-bottom: 8px; }
.brand-narrative-content h3 { font-size: 32px; margin: 0 0 8px 0; letter-spacing: -1px; font-weight: 700; }
.tagline { font-size: 15px; line-height: 1.5; margin: 0; color: #E5E7EB; font-weight: 400; }
.image-location-tag { display: inline-block; margin-top: 16px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #D1D5DB; border-left: 2px solid #10B981; padding-left: 10px; }

/* 📋 FORM PANEL */
.form-entry-pane { padding: 48px; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; background: #ffffff; }
.form-view-wrapper { width: 100%; display: flex; flex-direction: column; }
.pane-header { margin-bottom: 32px; }
.pane-header h2 { font-size: 28px; color: #111827; margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px;}
.pane-subtitle { font-size: 15px; color: #6B7280; margin: 0; line-height: 1.5;}

.modern-form { display: flex; flex-direction: column; gap: 20px; }
.input-wrapper-field { display: flex; flex-direction: column; gap: 8px; }
.label-flex-row { display: flex; justify-content: space-between; align-items: center; }
.input-wrapper-field label { font-size: 13px; font-weight: 600; text-transform: uppercase; color: #4B5563; letter-spacing: 0.5px;}

.forgot-trigger-link { background: none; border: none; color: #2563EB; font-weight: 600; font-size: 13px; cursor: pointer; padding: 0; font-family: inherit; transition: 0.2s;}
.forgot-trigger-link:hover { color: #1D4ED8; }

/* Borderless Inputs */
.clean-input { padding: 14px 16px; border: 1px solid transparent; border-radius: 12px; font-size: 15px; background-color: #F3F4F6; color: #111827; width: 100%; box-sizing: border-box; outline: none; transition: all 0.2s; font-family: inherit;}
.clean-input:focus { border-color: #111827; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

.submit-action-btn { width: 100%; padding: 16px; background-color: #111827; color: #ffffff; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 8px; transition: 0.2s; font-family: inherit;}
.submit-action-btn:hover:not(:disabled) { background-color: #374151; transform: translateY(-1px);}

.fallback-return-btn { width: 100%; padding: 16px; background-color: transparent; color: #4B5563; border: none; font-size: 14px; font-weight: 600; cursor: pointer; transition: 0.2s; font-family: inherit; }
.fallback-return-btn:hover { color: #111827; }

.horizontal-text-divider { display: flex; align-items: center; text-align: center; margin: 24px 0; color: #9CA3AF; }
.horizontal-text-divider::before, .horizontal-text-divider::after { content: ''; flex: 1; border-bottom: 1px solid #E5E7EB; }
.horizontal-text-divider span { padding: 0 16px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px;}

.google-federation-btn { width: 100%; padding: 14px; background-color: #ffffff; color: #111827; border: 1px solid #E5E7EB; border-radius: 12px; font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; transition: 0.2s; font-family: inherit;}
.google-federation-btn:hover:not(:disabled) { background-color: #F9FAFB; border-color: #D1D5DB; }

/* Alerts */
.alert-banner { padding: 14px 16px; border-radius: 12px; font-size: 14px; font-weight: 500; margin-bottom: 24px; display: flex; align-items: center; gap: 10px; }
.alert-banner.error-state { background-color: #FEE2E2; color: #DC2626; }
.alert-banner.success-state { background-color: #DCFCE7; color: #15803D; }

.pane-footer-switch { margin-top: 32px; text-align: center; }
.pane-footer-switch p { font-size: 14px; color: #6B7280; margin: 0; }
.inline-switch-link { color: #2563EB; text-decoration: none; font-weight: 600; margin-left: 4px; }
.inline-switch-link:hover { color: #1D4ED8; }

.fade-in { animation: fIn 0.3s ease-out; }
.tab-fade-panel { animation: fIn 0.2s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── 📱 ADAPTIVE MOBILE LAYOUT ── */
@media (max-width: 840px) {
  .split-card { grid-template-columns: 1fr; max-width: 480px; }
  /* Ensure image is tall enough to look good but doesn't take up whole screen */
  .brand-ambiance-pane { min-height: 280px; padding: 40px 32px; justify-content: flex-end; }
  .form-entry-pane { padding: 32px; }
}
@media (max-width: 480px) {
  .auth-workspace-page { padding: 80px 16px 40px; }
  .brand-ambiance-pane { min-height: 240px; padding: 32px 20px; }
  .brand-narrative-content h3 { font-size: 26px; }
  .form-entry-pane { padding: 24px 20px; }
  .pane-header h2 { font-size: 24px; }
}
</style>