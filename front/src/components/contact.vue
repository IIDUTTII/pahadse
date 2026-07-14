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
  // Basic validation
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
  <div class="contact-page-wrapper">
    <!-- Header Section -->
    <section class="contact-header-section">
      <div class="header-content">
        <h1>Get in Touch</h1>
        <p class="header-subtitle">We're here to help with any questions about our Himalayan products, orders, or general inquiries.</p>
      </div>
    </section>

    <!-- Main Contact Form Section -->
    <section class="contact-form-section">
      <div class="form-container">
        <div class="form-header">
          <h2>Send Us a Message</h2>
          <p class="form-description">Fill out the form below and we'll get back to you shortly.</p>
        </div>

        <!-- Status Messages -->
        <div v-if="successMessage" class="status-message success">
          ✓ {{ successMessage }}
        </div>
        <div v-if="errorMessage" class="status-message error">
          {{ errorMessage }}
        </div>

        <!-- Contact Form -->
        <form @submit.prevent="handleContactSubmit" class="contact-form">
          <div class="form-grid">
            <!-- Name Field -->
            <div class="form-group">
              <label for="name" class="form-label">Full Name *</label>
              <input
                id="name"
                ref="name"
                v-model="formData.name"
                type="text"
                placeholder="Enter your full name"
                class="form-input"
                :class="{ 'is-invalid': !formData.name && isSubmitting }"
                @blur="!formData.name && $refs.name.focus()"
              />
            </div>

            <!-- Email Field -->
            <div class="form-group">
              <label for="email" class="form-label">Email Address *</label>
              <input
                id="email"
                ref="email"
                v-model="formData.email"
                type="email"
                placeholder="your.email@example.com"
                class="form-input"
                :class="{ 'is-invalid': !formData.email && isSubmitting }"
                @blur="!formData.email && $refs.email.focus()"
              />
            </div>

            <!-- Phone Field -->
            <div class="form-group">
              <label for="phone" class="form-label">Phone Number (Optional)</label>
              <input
                id="phone"
                v-model="formData.phone"
                type="tel"
                placeholder="+91 XXXXXXXXXX"
                class="form-input"
              />
            </div>

            <!-- Subject Field -->
            <div class="form-group">
              <label for="subject" class="form-label">Subject</label>
              <input
                id="subject"
                ref="subject"
                v-model="formData.subject"
                type="text"
                placeholder="What is this regarding?"
                class="form-input"
              />
            </div>

            <!-- Message Field -->
            <div class="form-group full-width">
              <label for="query" class="form-label">Your Message *</label>
              <textarea
                id="query"
                ref="query"
                v-model="formData.query"
                rows="6"
                placeholder="Please describe your inquiry in detail..."
                class="form-input textarea"
                :class="{ 'is-invalid': !formData.query && isSubmitting }"
                @blur="!formData.query && $refs.query.focus()"
              />
            </div>
          </div>

          <!-- Submit Button -->
          <div class="form-actions">
            <button
              type="submit"
              class="submit-btn primary"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? 'Sending Your Message...' : 'Send Message' }}
            </button>
          </div>
        </form>
      </div>
    </section>

    <!-- Optional: Contact Info Section (Removed as requested) -->
    <!-- The "home card" (sidebar with mountain photo and contact info) has been removed per request -->
  </div>
</template>

<style scoped>
/* Base Page Styling */
.contact-page-wrapper {
  background-color: #FAF6F0; /* PahadS Brand Background */
  min-height: 100vh;
  padding: calc(90px + 40px) 4% 60px;
  box-sizing: border-box;
  font-family: 'Jost', system-ui, sans-serif;
  color: #0f172a;
}

/* Header Section */
.contact-header-section {
  text-align: center;
  margin-bottom: 40px;
}

.contact-header-section h1 {
  font-family: 'Cinzel', serif;
  font-size: 2.6rem;
  font-weight: 800;
  margin: 0 0 10px;
  color: #0f172a;
}

.contact-header-section .header-subtitle {
  font-size: 1.1rem;
  color: #475569;
  max-width: 600px;
  margin: 0 auto;
  font-weight: 500;
}

/* Form Section */
.contact-form-section {
  background-color: #ffffff;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  border: 1px solid #f0f0f0;
}

.form-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px;
}

.form-header {
  text-align: center;
  margin-bottom: 30px;
}

.form-header h2 {
  font-family: 'Cinzel', serif;
  font-size: 2rem;
  font-weight: 800;
  margin: 0 0 10px;
  color: #0f172a;
}

.form-header .form-description {
  font-size: 1.1rem;
  color: #64748b;
}

/* Status Messages */
.status-message {
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 24px;
  font-weight: 600;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-message.success {
  background-color: #f0fdf4;
  border: 1px solid bb f7d0;
  color: #15803d;
}

.status-message.error {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
}

/* Form Styles */
.contact-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: #374151;
  margin-bottom: 4px;
}

.form-input {
  padding: 14px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  color: #111827;
  background-color: #f9fafb;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  background-color: #ffffff;
}

.form-input.is-invalid {
  border-color: #ef4444;
  background-color: #fef2f2;
}

.textarea {
  resize: vertical;
  min-height: 140px;
  font-family: inherit;
}

/* Button Styles */
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.submit-btn {
  background-color: #0f172a;
  color: #ffffff;
  border: none;
  padding: 14px 28px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.submit-btn:hover:not(:disabled) {
  background-color: #10b981;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Responsive Design */
@media (max-width: 768px) {
  .contact-page-wrapper {
    padding: calc(90px + 20px) 4% 40px;
  }

  .form-container {
    padding: 24px;
  }

  .contact-header-section h1 {
    font-size: 2rem;
  }

  .contact-header-section .header-subtitle {
    font-size: 1rem;
  }

  .form-header h2 {
    font-size: 1.75rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-group.full-width {
    grid-column: 1;
  }
}

@media (max-width: 480px) {
  .contact-page-wrapper {
    padding: calc(90px + 16px) 3% 30px;
  }

  .contact-header-section h1 {
    font-size: 1.75rem;
  }

  .contact-header-section .header-subtitle {
    font-size: 0.95rem;
  }

  .form-header h2 {
    font-size: 1.5rem;
  }

  .form-input {
    padding: 12px 14px;
    font-size: 0.95rem;
  }

  .submit-btn {
    padding: 12px 24px;
    font-size: 0.95rem;
    width: 100%;
    justify-content: center;
  }
}
</style>