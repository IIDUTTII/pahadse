<script setup>
import { ref } from 'vue'
import { createContactQuery } from './db.js'

defineOptions({
  name: 'ContactView'
})

// Form State
const formData = ref({
  name: '',
  email: '',
  phone: '',
  subject: '',
  query: ''
})

const isSubmitting = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Submission Handler
const handleContactSubmit = async () => {
  if (!formData.value.name || !formData.value.email || !formData.value.query) {
    errorMessage.value = "Please fill in your name, email, and query."
    return
  }

  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await createContactQuery({
      name: formData.value.name.trim(),
      email: formData.value.email.trim(),
      phone: formData.value.phone.trim(),
      subject: formData.value.subject.trim(),
      query: formData.value.query.trim(),
      source: 'contact_page'
    })

    successMessage.value = "Message sent successfully! Our team will get back to you within 24 hours."
    formData.value = { name: '', email: '', phone: '', subject: '', query: '' }

    setTimeout(() => {
      successMessage.value = ''
    }, 5000)
  } catch (error) {
    errorMessage.value = error.message || 'Could not send your message right now.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="contact-page-wrapper fade-in">
    <div class="contact-container">
      
      <!-- ─── HEADER ─── -->
      <section class="contact-header">
        <h1 class="page-title">Get in Touch</h1>
        <p class="page-subtitle">We're here to help with any questions about our Himalayan products, orders, or general inquiries.</p>
      </section>

      <!-- ─── FORM SECTION ─── -->
      <section class="contact-form-section">
        
        <!-- Status Messages -->
        <transition name="fade">
          <div v-if="successMessage" class="status-message success">
            <span class="status-icon">✓</span> {{ successMessage }}
          </div>
        </transition>
        <transition name="fade">
          <div v-if="errorMessage" class="status-message error">
            <span class="status-icon">⚠</span> {{ errorMessage }}
          </div>
        </transition>

        <!-- Contact Form -->
        <form @submit.prevent="handleContactSubmit" class="clean-form">
          <div class="form-grid">
            
            <!-- Name Field -->
            <div class="field">
              <label for="name">Full Name <span class="required">*</span></label>
              <input
                id="name"
                ref="name"
                v-model="formData.name"
                type="text"
                placeholder="John Doe"
                class="clean-input"
                :class="{ 'is-invalid': !formData.name && isSubmitting }"
                @blur="!formData.name && $refs.name.focus()"
              />
            </div>

            <!-- Email Field -->
            <div class="field">
              <label for="email">Email Address <span class="required">*</span></label>
              <input
                id="email"
                ref="email"
                v-model="formData.email"
                type="email"
                placeholder="hello@example.com"
                class="clean-input"
                :class="{ 'is-invalid': !formData.email && isSubmitting }"
                @blur="!formData.email && $refs.email.focus()"
              />
            </div>

            <!-- Phone Field -->
            <div class="field">
              <label for="phone">Phone Number</label>
              <input
                id="phone"
                v-model="formData.phone"
                type="tel"
                placeholder="10-digit mobile number"
                class="clean-input"
              />
            </div>

            <!-- Subject Field -->
            <div class="field">
              <label for="subject">Subject</label>
              <input
                id="subject"
                ref="subject"
                v-model="formData.subject"
                type="text"
                placeholder="What is this regarding?"
                class="clean-input"
              />
            </div>

            <!-- Message Field -->
            <div class="field full-width">
              <label for="query">Your Message <span class="required">*</span></label>
              <textarea
                id="query"
                ref="query"
                v-model="formData.query"
                rows="5"
                placeholder="How can we help you today?"
                class="clean-input textarea"
                :class="{ 'is-invalid': !formData.query && isSubmitting }"
                @blur="!formData.query && $refs.query.focus()"
              />
            </div>
          </div>

          <!-- Submit Button -->
          <div class="form-actions">
            <button type="submit" class="primary-cta" :disabled="isSubmitting">
              {{ isSubmitting ? 'Sending...' : 'Send Message' }}
            </button>
          </div>
        </form>
      </section>

    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* ─── BASE STYLES ─── */
.fade-in { animation: fIn 0.4s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }

.contact-page-wrapper {
  background-color: #ffffff; /* Pure white background */
  min-height: 100vh;
  padding: 100px 24px 80px;
  box-sizing: border-box;
  font-family: 'Inter', -apple-system, sans-serif;
  color: #111827;
}

.contact-container {
  max-width: 700px; /* Constrained width for a premium form feel */
  margin: 0 auto;
}

/* ─── HEADER ─── */
.contact-header {
  text-align: center;
  margin-bottom: 48px;
}

.page-title {
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 16px;
  color: #111827;
  letter-spacing: -1px;
}

.page-subtitle {
  font-size: 16px;
  color: #6B7280;
  max-width: 500px;
  margin: 0 auto;
  line-height: 1.6;
}

/* ─── STATUS MESSAGES ─── */
.status-message {
  padding: 16px 20px;
  border-radius: 12px;
  margin-bottom: 32px;
  font-weight: 500;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-icon {
  font-weight: 800;
  font-size: 16px;
}

.status-message.success {
  background-color: #DCFCE7;
  color: #15803D;
}

.status-message.error {
  background-color: #FEE2E2;
  color: #DC2626;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ─── FORM STYLES (Borderless & Soft) ─── */
.clean-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field.full-width {
  grid-column: 1 / -1;
}

.field label {
  font-size: 13px;
  font-weight: 600;
  color: #4B5563;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.required {
  color: #EF4444;
}

/* The Borderless Input */
.clean-input {
  padding: 16px 20px;
  background-color: #F3F4F6; /* Soft gray background */
  border: 1px solid transparent; /* No harsh borders */
  border-radius: 16px;
  font-size: 15px;
  font-family: inherit;
  color: #111827;
  transition: all 0.2s ease;
  box-sizing: border-box;
  width: 100%;
}

.clean-input::placeholder {
  color: #9CA3AF;
}

.clean-input:focus {
  outline: none;
  background-color: #ffffff;
  border-color: #111827; /* Sleek black outline only on focus */
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.clean-input.is-invalid {
  background-color: #FEF2F2;
  border-color: #FCA5A5;
  color: #DC2626;
}

.textarea {
  resize: vertical;
  min-height: 140px;
}

/* ─── BUTTON ─── */
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.primary-cta {
  background-color: #111827;
  color: #ffffff;
  border: none;
  padding: 18px 36px;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  font-family: inherit;
}

.primary-cta:hover:not(:disabled) {
  background-color: #374151;
  transform: translateY(-2px);
}

.primary-cta:disabled {
  background-color: #E5E7EB;
  color: #9CA3AF;
  cursor: not-allowed;
}

/* ─── RESPONSIVE ─── */
@media (max-width: 768px) {
  .contact-page-wrapper {
    padding: 80px 16px 80px; /* Account for mobile navbars */
  }

  .page-title {
    font-size: 28px;
  }

  .page-subtitle {
    font-size: 15px;
  }

  .contact-header {
    margin-bottom: 32px;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .field.full-width {
    grid-column: 1;
  }

  .clean-input {
    padding: 14px 16px;
  }

  .primary-cta {
    padding: 16px;
  }
}
</style>