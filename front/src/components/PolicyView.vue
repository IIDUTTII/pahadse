<script setup>
defineOptions({
  name: 'PolicyView'
})
</script>

<template>
  <div class="policy-wrapper">
    <div class="policy-container">
      
      <!-- 🏔️ Minimalistic Header -->
      <header class="policy-header">
        <h1>Store Policies</h1>
        <p class="brand-subtext">Seedha Pahadon Se: Shuddh, Pahari, Asli</p>
        <div class="divider"></div>
      </header>

      <!-- 📦 SECTION 1: REFUND & RETURN POLICY -->
      <section class="policy-section">
        <h2>Return & Refund Policy</h2>
        
        <div class="policy-block">
          <h3>1. Nature of Products</h3>
          <p>Due to the pure, organic, and perishable nature of our food items (such as Ghee, Oils, and Spices), we strictly <strong>do not accept returns</strong> once an item has been delivered.</p>
        </div>

        <div class="policy-block">
          <h3>2. Damaged or Broken Shipments</h3>
          <p>If your order arrives damaged, leaking, or broken due to rough transit across mountain routes, please contact us within <strong>48 hours of delivery</strong>. We will arrange a free replacement.</p>
          <p class="proof-note"><strong>Note:</strong> You must send clear photos or an unboxing video of the damaged package to our customer care team to claim a replacement.</p>
        </div>

        <div class="policy-block">
          <h3>3. Cancellations & Modifications</h3>
          <p>You can request to modify your shipping address or cancel your order anytime <strong>before it is dispatched</strong> from our warehouse. Once the tracking link is generated, order cancellation is not possible.</p>
        </div>
      </section>

      <div class="section-divider"></div>

      <!-- 📜 SECTION 2: TERMS & CONDITIONS -->
      <section class="policy-section">
        <h2>Terms & Conditions</h2>

        <div class="policy-block">
          <h3>1. Authenticity & Variations</h3>
          <p>Our products are sourced directly from small batches in remote Himalayan areas. Natural variations in color, aroma, and texture are proof of their authenticity and are not product flaws.</p>
        </div>

        <div class="policy-block">
          <h3>2. Shipping Timeline Delays</h3>
          <p>We ship all packages across India using reliable courier partners. However, shipments originating from mountain locations may face occasional transport delays due to severe weather, landslides, or seasonal conditions.</p>
        </div>

        <div class="policy-block">
          <h3>3. Allergic Reactions & Safety</h3>
          <p>Please review ingredient labels carefully before consumption. <strong>pahadSe</strong> is not responsible for any specific or individual allergic reactions caused by our raw herbs or pure mountain ingredients.</p>
        </div>
      </section>

      <!-- 📞 Minimalistic Footer Contact -->
      <footer class="policy-footer-card">
        <h3>Need Help with your Order?</h3>
        <p>Drop us a line and our mountain team will get back to you within 24 hours.</p>
        <div class="contact-links">
          <span>📧 care@pahadse.com</span>
          <span>💬 WhatsApp: +91 XXXXX XXXXX</span>
        </div>
      </footer>

    </div>
  </div>
</template>

<style scoped>
/* 🏔️ MINIMALIST BLACK & WHITE TEXT-FOCUSED STYLING */
.policy-wrapper {
  background: #ffffff;
  color: #111827;
  font-family: system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  padding: 60px 20px;
  line-height: 1.6;
}

.policy-container {
  max-width: 680px; /* Kept narrow for premium readability */
  margin: 0 auto;
}

/* Header Styles */
.policy-header {
  text-align: center;
  margin-bottom: 50px;
}
.policy-header h1 {
  font-size: 2.25rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.5px;
}
.brand-subtext {
  color: #10B981; /* Accent Green */
  font-size: 0.95rem;
  margin: 8px 0 0 0;
  font-weight: 500;
}
.divider {
  width: 40px;
  height: 2px;
  background: #111827;
  margin: 24px auto 0 auto;
}

/* Policy Content Layout */
.policy-section {
  margin-bottom: 40px;
}
.policy-section h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 24px;
  border-left: 3px solid #10B981;
  padding-left: 12px;
}
.policy-block {
  margin-bottom: 24px;
}
.policy-block h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: #374151;
}
.policy-block p {
  font-size: 0.95rem;
  color: #4B5563;
  margin: 0 0 10px 0;
}
.proof-note {
  font-size: 0.88rem !important;
  background: #F9FAFB;
  padding: 12px;
  border-radius: 6px;
  border: 1px dashed #E5E7EB;
}

/* Dividers */
.section-divider {
  height: 1px;
  background: #E5E7EB;
  margin: 40px 0;
}

/* Customer Support Layout Box */
.policy-footer-card {
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  padding: 24px;
  border-radius: 8px;
  text-align: center;
  margin-top: 50px;
}
.policy-footer-card h3 {
  margin: 0 0 6px 0;
  font-size: 1.15rem;
}
.policy-footer-card p {
  font-size: 0.9rem;
  color: #6B7280;
  margin: 0 0 16px 0;
}
.contact-links {
  display: flex;
  justify-content: center;
  gap: 20px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #111827;
  flex-wrap: wrap;
}
</style>
