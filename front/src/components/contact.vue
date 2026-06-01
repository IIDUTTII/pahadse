<script setup>
import { ref } from 'vue'

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

  // Simulate network request to Firestore/Backend
  setTimeout(() => {
    isSubmitting.value = false
    successMessage.value = "Message sent successfully! Our mountain team will get back to you within 24 hours."
    
    // Reset form
    formData.value = {
      name: '',
      email: '',
      phone: '',
      subject: '',
      query: ''
    }

    // Clear success message after 5 seconds
    setTimeout(() => {
      successMessage.value = ''
    }, 5000)
  }, 1500)
}
</script>

<template>
  <div class="contact-page-wrapper">
    <div class="contact-container">
      
      <!-- Header -->
      <header class="contact-header">
        <h1>Get in Touch</h1>
        <p>Whether you have a question about our mountain provisions, bulk orders, or your recent delivery, we are here to help.</p>
        <div class="divider"></div>
      </header>

      <div class="contact-layout-grid">
        
        <!-- Left Pane: Contact Information with Photo -->
        <aside class="contact-info-pane">
          <!-- Mountain Photo -->
          <div class="mountain-photo">
            <img 
              src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=400&fit=crop" 
              alt="Seraj Valley, Himachal Pradesh - Where PahadSe sources its pure mountain products"
              class="seraj-valley-img"
            >
            <div class="photo-caption">
              <span>🏔️</span> Seraj Valley, Mandi — Our Home
            </div>
          </div>

          <div class="info-card">
            <h3>Direct Contact</h3>
            <p class="info-subtext">Reach out to us directly through our official channels.</p>
            
            <div class="contact-methods">
              <div class="method-row">
                <span class="method-icon">📧</span>
                <div>
                  <strong>Email Us</strong>
                  <p>care@pahadse.com</p>
                </div>
              </div>
              <div class="method-row">
                <span class="method-icon">📞</span>
                <div>
                  <strong>Call / WhatsApp</strong>
                  <p>+91 98765 43210</p>
                  <p class="timing-note">Mon-Sat: 9 AM to 6 PM</p>
                </div>
              </div>
              <div class="method-row">
                <span class="method-icon">🏔️</span>
                <div>
                  <strong>Mountain Base</strong>
                  <p>PahadSe Distribution Hub,<br>Mandi, Himachal Pradesh - 175001</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <!-- Right Pane: The Form -->
        <main class="contact-form-pane">
          <div class="form-card">
            <h3>Send a Message</h3>
            
            <!-- Success Message -->
            <div v-if="successMessage" class="success-banner">
              ✓ {{ successMessage }}
            </div>

            <!-- Error Message -->
            <div v-if="errorMessage" class="error-banner">
              ⚠️ {{ errorMessage }}
            </div>

            <form @submit.prevent="handleContactSubmit" class="pahadse-form">
              
              <div class="form-grid">
                <div class="input-field">
                  <label>Full Name *</label>
                  <input v-model="formData.name" type="text" placeholder="e.g. Rahul Sharma" class="core-input" />
                </div>
                
                <div class="input-field">
                  <label>Email Address *</label>
                  <input v-model="formData.email" type="email" placeholder="you@example.com" class="core-input" />
                </div>

                <div class="input-field">
                  <label>Phone Number</label>
                  <input v-model="formData.phone" type="tel" placeholder="10-digit mobile number" class="core-input" />
                </div>

                <div class="input-field">
                  <label>Subject</label>
                  <input v-model="formData.subject" type="text" placeholder="What is this regarding?" class="core-input" />
                </div>
              </div>

              <div class="input-field full-width">
                <label>Your Query *</label>
                <textarea v-model="formData.query" rows="5" placeholder="Type your message, question, or issue here..." class="core-input textarea"></textarea>
              </div>

              <button type="submit" :disabled="isSubmitting" class="submit-btn">
                {{ isSubmitting ? 'Transmitting...' : 'Send Message 🚀' }}
              </button>
              
            </form>
          </div>
        </main>

      </div>
    </div>
  </div>
</template>

<style scoped>
/* Base Page Styling */
.contact-page-wrapper {
  background-color: #FAF6F0; /* PahadSe Brand Background */
  min-height: 100vh;
  padding: calc(90px + 40px) 4% 60px;
  box-sizing: border-box;
  font-family: 'Jost', system-ui, sans-serif;
  color: #0f172a;
}

.contact-container {
  max-width: 1100px;
  margin: 0 auto;
}

/* Header */
.contact-header {
  text-align: center;
  margin-bottom: 40px;
}
.contact-header h1 {
  font-family: 'Cinzel', serif;
  font-size: 2.6rem;
  font-weight: 800;
  margin: 0 0 10px;
  color: #0f172a;
}
.contact-header p {
  font-size: 1.05rem;
  color: #475569;
  max-width: 600px;
  margin: 0 auto;
  font-weight: 500;
}
.divider {
  width: 50px;
  height: 3px;
  background-color: #16a34a;
  margin: 24px auto 0;
  border-radius: 2px;
}

/* Layout Grid */
.contact-layout-grid {
  display: grid;
  grid-template-columns: 35% 1fr;
  gap: 30px;
  align-items: start;
}

/* Mountain Photo Styles */
.mountain-photo {
  margin-bottom: 24px;
  border-radius: 16px;
  overflow: hidden;
  border: 3px solid #0f172a;
  box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease;
}

.mountain-photo:hover {
  transform: translateY(-4px);
}

.seraj-valley-img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
  aspect-ratio: 16 / 10;
}

.photo-caption {
  background: #0f172a;
  color: #ffffff;
  padding: 10px 12px;
  font-size: 0.8rem;
  text-align: center;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.photo-caption span {
  margin-right: 6px;
}

/* Cards */
.info-card, .form-card {
  background-color: #ffffff;
  border: 2px solid #0f172a;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.02);
}

.info-card h3, .form-card h3 {
  font-family: 'Cinzel', serif;
  font-size: 1.4rem;
  font-weight: 800;
  margin: 0 0 8px;
  color: #0f172a;
}

/* Info Pane Details */
.info-subtext {
  font-size: 0.9rem;
  color: #64748b;
  margin: 0 0 24px;
  font-weight: 500;
}
.contact-methods {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.method-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.method-icon {
  font-size: 1.5rem;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.method-row strong {
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
  display: block;
  margin-bottom: 2px;
}
.method-row p {
  margin: 0;
  font-size: 0.9rem;
  color: #475569;
  line-height: 1.5;
}
.timing-note {
  font-size: 0.8rem !important;
  color: #16a34a !important;
  font-weight: 700;
  margin-top: 4px !important;
}

/* Form Styles */
.pahadse-form {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.input-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.full-width {
  margin-top: 8px;
}
.input-field label {
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #475569;
  letter-spacing: 0.5px;
}
.core-input {
  padding: 12px 14px;
  border: 2px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  color: #0f172a;
  background-color: #f8fafc;
  outline: none;
  font-weight: 500;
  transition: border-color 0.2s;
}
.core-input:focus {
  border-color: #16a34a;
  background-color: #ffffff;
}
.textarea {
  resize: vertical;
  min-height: 120px;
}

/* Button */
.submit-btn {
  background-color: #0f172a;
  color: #ffffff;
  border: none;
  padding: 16px 24px;
  border-radius: 30px;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 10px;
  transition: background-color 0.2s;
}
.submit-btn:hover {
  background-color: #16a34a;
}
.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Feedback Banners */
.success-banner {
  background-color: #f0fdf4;
  border: 2px solid #bbf7d0;
  color: #15803d;
  padding: 14px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.9rem;
  margin-top: 16px;
}
.error-banner {
  background-color: #fef2f2;
  border: 2px solid #fecaca;
  color: #dc2626;
  padding: 14px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.9rem;
  margin-top: 16px;
}

/* Responsiveness */
@media (max-width: 900px) {
  .contact-layout-grid {
    grid-template-columns: 1fr;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .mountain-photo {
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
  }
}
</style>