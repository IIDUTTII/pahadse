<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { registerUserWithEmail, registerUserWithGoogle } from './db.js'

defineOptions({ name: 'Register' })
const router = useRouter()

const fullName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')

const showEmailForm = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const handleGoogleAuth = async () => {
  if (!fullName.value.trim()) {
    errorMessage.value = "Please enter your Full Name before continuing with Google."
    return
  }
  
  errorMessage.value = ''
  loading.value = true

  try {
    await registerUserWithGoogle(fullName.value.trim())
    router.push('/user')
  } catch (error) {
    errorMessage.value = error.message.replace('Firebase: ', '')
  } finally {
    loading.value = false
  }
}

const handleEmailAuth = async () => {
  if (!fullName.value.trim() || !email.value.trim() || !password.value || !confirmPassword.value) {
    errorMessage.value = "All fields are required."
    return
  }
  if (password.value !== confirmPassword.value) {
    errorMessage.value = "Passwords do not match."
    return
  }
  if (password.value.length < 6) {
    errorMessage.value = "Password must be at least 6 characters long."
    return
  }

  errorMessage.value = ''
  loading.value = true

  try {
    await registerUserWithEmail(email.value.trim(), password.value, fullName.value.trim())
    successMessage.value = "Registration successful! A verification link has been sent to your email."
    
    showEmailForm.value = false
    fullName.value = ''
    email.value = ''
    password.value = ''
    confirmPassword.value = ''
  } catch(error) {
    if (error.code === 'auth/email-already-in-use') {
      errorMessage.value = "An account with this email already exists."
    } else {
      errorMessage.value = error.message.replace('Firebase: ', '')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-workspace-page">
    <div class="split-card fade-in">
      
      <div class="brand-ambiance-pane register-bg">
        <div class="overlay-shader"></div>
        <div class="brand-narrative-content">
          <span class="narrative-icon">🏔️</span>
          <h3>PahadS.</h3>
          <p class="tagline">Pure. Pristine. Straight from the Peaks.</p>
          <span class="image-location-tag">Mandi, Himachal Pradesh</span>
        </div>
      </div>

      <div class="form-entry-pane">
        <header class="pane-header">
          <h2>Create Account</h2>
          <p class="pane-subtitle">Join us to access pure high‑altitude provisions.</p>
        </header>

        <transition name="fade">
          <div v-if="errorMessage" class="alert-banner error-state"><span>⚠</span> {{ errorMessage }}</div>
        </transition>
        <transition name="fade">
          <div v-if="successMessage" class="alert-banner success-state"><span>✓</span> {{ successMessage }}</div>
        </transition>

        <div class="modern-form">
          <div class="input-wrapper-field">
            <label>Full Name <span class="required-star">*</span></label>
            <input v-model="fullName" type="text" placeholder="John Doe" :disabled="loading" class="clean-input" />
          </div>

          <div class="horizontal-text-divider"><span>REGISTER WITH</span></div>

          <button @click="handleGoogleAuth" :disabled="loading" class="google-federation-btn">
            <svg class="google-svg-icon" viewBox="0 0 24 24" width="18" height="18">
              <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.227C18.214 1.314 15.48 0 12.24 0 5.58 0 0 5.58 0 12.24s5.58 12.24 12.24 12.24c6.96 0 11.57-4.894 11.57-11.79 0-.795-.085-1.4-.195-1.905H12.24z"/>
            </svg>
            Google Identity
          </button>

          <button v-if="!showEmailForm" @click="showEmailForm = true" class="email-toggle-btn">
            Register with Email
          </button>

          <transition name="slide-down">
            <div v-if="showEmailForm" class="email-form-expansion">
              <div class="input-wrapper-field mt-4">
                <label>Email Address <span class="required-star">*</span></label>
                <input v-model="email" type="email" placeholder="name@domain.com" :disabled="loading" class="clean-input" />
              </div>
              
              <div class="input-wrapper-field mt-4">
                <label>Create Password <span class="required-star">*</span></label>
                <input v-model="password" type="password" placeholder="Min. 6 characters" :disabled="loading" class="clean-input" />
              </div>

              <div class="input-wrapper-field mt-4">
                <label>Confirm Password <span class="required-star">*</span></label>
                <input v-model="confirmPassword" type="password" placeholder="Repeat password" :disabled="loading" class="clean-input" />
              </div>

              <div class="action-row">
                <button @click="showEmailForm = false" class="fallback-return-btn" :disabled="loading">Cancel</button>
                <button @click="handleEmailAuth" class="submit-action-btn" :disabled="loading">
                  {{ loading ? 'Creating...' : 'Create Account' }}
                </button>
              </div>
            </div>
          </transition>
        </div>

        <footer class="pane-footer-switch">
          <p>Already registered? <router-link to="/login" class="inline-switch-link">Log In Here</router-link></p>
        </footer>
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
.register-bg { background-image: url('https://firebasestorage.googleapis.com/v0/b/pahadse-13309.firebasestorage.app/o/other%2Funnamed%20(11).jpg?alt=media&token=6d7b1ada-9ac9-4749-b8e3-c434da20c984'); }

/* Smart Gradient: Transparent at top, dark at bottom for text readability */
.overlay-shader { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.85) 100%); z-index: 1; }
.brand-narrative-content { position: relative; z-index: 2; color: #ffffff; }
.narrative-icon { font-size: 2rem; display: block; margin-bottom: 8px; }
.brand-narrative-content h3 { font-size: 32px; margin: 0 0 8px 0; letter-spacing: -1px; font-weight: 700; }
.tagline { font-size: 15px; line-height: 1.5; margin: 0; color: #E5E7EB; font-weight: 400; }
.image-location-tag { display: inline-block; margin-top: 16px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #D1D5DB; border-left: 2px solid #10B981; padding-left: 10px; }

/* 📋 FORM PANEL */
.form-entry-pane { padding: 48px; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; background: #ffffff; }
.pane-header { margin-bottom: 24px; }
.pane-header h2 { font-size: 28px; color: #111827; margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px;}
.pane-subtitle { font-size: 15px; color: #6B7280; margin: 0; line-height: 1.5;}

.modern-form { display: flex; flex-direction: column; }
.input-wrapper-field { display: flex; flex-direction: column; gap: 8px; }
.mt-4 { margin-top: 16px; }
.input-wrapper-field label { font-size: 13px; font-weight: 600; text-transform: uppercase; color: #4B5563; letter-spacing: 0.5px;}
.required-star { color: #DC2626; }

/* Borderless Inputs */
.clean-input { padding: 14px 16px; border: 1px solid transparent; border-radius: 12px; font-size: 15px; background-color: #F3F4F6; color: #111827; width: 100%; box-sizing: border-box; outline: none; transition: all 0.2s; font-family: inherit;}
.clean-input:focus { border-color: #111827; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

.horizontal-text-divider { display: flex; align-items: center; text-align: center; margin: 24px 0; color: #9CA3AF; }
.horizontal-text-divider::before, .horizontal-text-divider::after { content: ''; flex: 1; border-bottom: 1px solid #E5E7EB; }
.horizontal-text-divider span { padding: 0 16px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px;}

/* Buttons */
.google-federation-btn { width: 100%; padding: 14px; background-color: #ffffff; color: #111827; border: 1px solid #E5E7EB; border-radius: 12px; font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; margin-bottom: 16px; transition: 0.2s; font-family: inherit;}
.google-federation-btn:hover:not(:disabled) { background-color: #F9FAFB; border-color: #D1D5DB; }

.email-toggle-btn { width: 100%; padding: 14px; background: #F3F4F6; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; color: #111827; cursor: pointer; transition: 0.2s; font-family: inherit;}
.email-toggle-btn:hover { background: #E5E7EB; }

.email-form-expansion { display: flex; flex-direction: column; overflow: hidden; }
.action-row { display: flex; gap: 16px; align-items: center; margin-top: 24px; }

.submit-action-btn { flex: 1; padding: 16px; background-color: #111827; color: #ffffff; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; transition: 0.2s; font-family: inherit;}
.submit-action-btn:hover:not(:disabled) { background-color: #374151; transform: translateY(-1px);}

.fallback-return-btn { flex: 1; padding: 16px; background-color: transparent; color: #4B5563; border: none; font-size: 15px; font-weight: 600; cursor: pointer; transition: 0.2s; font-family: inherit; }
.fallback-return-btn:hover { color: #111827; background: #F3F4F6; border-radius: 12px;}

/* Alerts */
.alert-banner { padding: 14px 16px; border-radius: 12px; font-size: 14px; font-weight: 500; margin-bottom: 24px; display: flex; align-items: center; gap: 10px; }
.alert-banner.error-state { background-color: #FEE2E2; color: #DC2626; }
.alert-banner.success-state { background-color: #DCFCE7; color: #15803D; }

.pane-footer-switch { margin-top: 32px; text-align: center; }
.pane-footer-switch p { font-size: 14px; color: #6B7280; margin: 0; }
.inline-switch-link { color: #2563EB; text-decoration: none; font-weight: 600; margin-left: 4px; }
.inline-switch-link:hover { color: #1D4ED8; }

.fade-in { animation: fIn 0.3s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

.slide-down-enter-active, .slide-down-leave-active { transition: all 0.3s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-10px); max-height: 0; }
.slide-down-enter-to, .slide-down-leave-from { opacity: 1; transform: translateY(0); max-height: 600px; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── 📱 ADAPTIVE MOBILE LAYOUT ── */
@media (max-width: 840px) {
  .split-card { grid-template-columns: 1fr; max-width: 480px; }
  .brand-ambiance-pane { min-height: 280px; padding: 40px 32px; justify-content: flex-end; }
  .form-entry-pane { padding: 32px; }
}
@media (max-width: 480px) {
  .auth-workspace-page { padding: 80px 16px 40px; }
  .brand-ambiance-pane { min-height: 240px; padding: 32px 20px; }
  .brand-narrative-content h3 { font-size: 26px; }
  .form-entry-pane { padding: 24px 20px; }
  .pane-header h2 { font-size: 24px; }
  .action-row { flex-direction: column-reverse; gap: 12px; }
  .action-row button { width: 100%; }
}
</style>