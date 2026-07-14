<script setup>
defineOptions({
  name: 'TermsView'
})
</script>

<template>
  <div class="legal-wrapper">
    <div class="legal-document">
      
      <header class="document-header">
        <h1>Terms & Conditions</h1>
        <p class="last-updated">Last Updated: June 2026</p>
      </header>

      <div class="document-body">
        
        <!-- 1. Acceptance of Terms -->
        <div class="section-block">
          <h2>1. Acceptance of Terms</h2>
          <ul class="legal-list">
            <li>By accessing or using the PahadS website, you agree to comply with these Terms & Conditions.</li>
            <li>If you do not agree with these terms, please do not use our website.</li>
          </ul>
        </div>

        <!-- 2. About PahadS -->
        <div class="section-block">
          <h2>2. About PahadS</h2>
          <ul class="legal-list">
            <li>PahadS is a Himalayan food and wellness products brand owned by <strong>Bhawani Dutt</strong> and operated from <strong>Seraj Valley, Mandi, Himachal Pradesh, India</strong>.</li>
          </ul>
        </div>

        <!-- 3. Product Information -->
        <div class="section-block">
          <h2>3. Product Information</h2>
          <ul class="legal-list">
            <li>We strive to provide accurate descriptions and images of all products.</li>
            <li>However, product appearance may vary naturally.</li>
            <li>Color, aroma, texture, and consistency may differ between batches.</li>
            <li>Such variations are normal and do not constitute defects.</li>
          </ul>
        </div>

        <!-- 4. Pricing -->
        <div class="section-block">
          <h2>4. Pricing</h2>
          <ul class="legal-list">
            <li>All prices displayed on the website are subject to change without prior notice.</li>
            <li>PahadS reserves the right to correct pricing errors, modify product pricing, or cancel orders affected by pricing inaccuracies.</li>
          </ul>
        </div>

        <!-- 5. Order Acceptance -->
        <div class="section-block">
          <h2>5. Order Acceptance</h2>
          <ul class="legal-list">
            <li>Submission of an order does not guarantee acceptance.</li>
            <li>PahadS reserves the right to refuse any order, cancel any order, or limit quantities purchased.</li>
            <li>Orders may be cancelled due to product unavailability, pricing errors, suspected fraud, delivery restrictions, or operational limitations.</li>
          </ul>
        </div>

        <!-- 6. Account Responsibility -->
        <div class="section-block">
          <h2>6. Account Responsibility</h2>
          <ul class="legal-list">
            <li>Users are responsible for maintaining account security, protecting login credentials, and providing accurate information.</li>
            <li>Users must not create fraudulent accounts, misuse the platform, or interfere with website operations.</li>
          </ul>
        </div>

        <!-- 7. Intellectual Property -->
        <div class="section-block">
          <h2>7. Intellectual Property</h2>
          <ul class="legal-list">
            <li>All content on the PahadS website, including logos, product images, text, graphics, and branding, is the property of PahadS unless otherwise stated.</li>
            <li>Unauthorized use is prohibited.</li>
          </ul>
        </div>

        <!-- 8. Product Usage Disclaimer -->
        <div class="section-block">
          <h2>8. Product Usage Disclaimer</h2>
          <ul class="legal-list">
            <li>Our products are intended for general consumption and traditional use.</li>
            <li>Information provided on the website is for informational purposes only, is not medical advice, and should not replace professional healthcare guidance.</li>
            <li>Customers should consult qualified professionals regarding specific health concerns.</li>
          </ul>
        </div>

        <!-- 9. Limitation of Liability -->
        <div class="section-block">
          <h2>9. Limitation of Liability</h2>
          <ul class="legal-list">
            <li>PahadS shall not be liable for indirect damages, consequential damages, delivery delays caused by weather or transportation issues, or individual allergic reactions or sensitivities.</li>
            <li>Customers are responsible for reviewing ingredient information before consumption.</li>
          </ul>
        </div>

        <!-- 10. Website Availability -->
        <div class="section-block">
          <h2>10. Website Availability</h2>
          <ul class="legal-list">
            <li>We strive to maintain uninterrupted service but do not guarantee continuous website availability.</li>
            <li>Services may be interrupted due to maintenance, technical issues, third-party outages, or events beyond our control.</li>
          </ul>
        </div>

        <!-- 11. Governing Law -->
        <div class="section-block">
          <h2>11. Governing Law</h2>
          <ul class="legal-list">
            <li>These Terms & Conditions shall be governed by the laws of India.</li>
            <li>Any disputes shall be subject to the jurisdiction of courts located in Himachal Pradesh, India.</li>
          </ul>
        </div>

        <!-- 12. Contact Information -->
        <div class="section-block">
          <h2>12. Contact Information</h2>
          <ul class="legal-list">
            <li><strong>PahadS</strong></li>
            <li>Address: Seraj Valley, Mandi, Himachal Pradesh, India</li>
            <li>Email: care@pahadse.com</li>
            <li>Phone: +91 XXXXX XXXXX</li>
          </ul>
        </div>

      </div>

      <footer class="document-footer">
        <p>If you have any questions regarding these Terms & Conditions, please contact us at <strong>care@pahadse.com</strong>.</p>
      </footer>

    </div>
  </div>
</template>

<style scoped>
/* Clean document style – matching your Privacy Policy and Store Policies */
.legal-wrapper {
  background-color: #fcfcfc;
  min-height: 100vh;
  padding: 90px 20px 60px 20px;
  display: flex;
  justify-content: center;
  font-family: Arial, Helvetica, sans-serif;
  color: #333333;
}

.legal-document {
  background-color: #ffffff;
  max-width: 800px;
  width: 100%;
  padding: 50px 60px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e0e0e0;
}

/* Header */
.document-header {
  border-bottom: 2px solid #222222;
  padding-bottom: 16px;
  margin-bottom: 30px;
}

.document-header h1 {
  font-size: 1.8rem;
  font-weight: bold;
  color: #111111;
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.last-updated {
  font-size: 0.85rem;
  color: #666666;
  margin: 0;
}

/* Body Text */
.intro-text {
  font-size: 0.95rem;
  line-height: 1.8;
  margin-bottom: 20px;
  text-align: justify;
}

/* Sections */
.section-block {
  margin-top: 36px;
}

.section-block h2 {
  font-size: 1.25rem;
  font-weight: bold;
  color: #1f6392;  /* Blue headings */
  margin-bottom: 16px;
}

/* Legal List Styling */
.legal-list {
  list-style-type: disc;
  padding-left: 24px;
  margin: 0;
}

.legal-list li {
  font-size: 0.95rem;
  line-height: 1.8;
  margin-bottom: 16px;
  text-align: justify;
  color: #444444;
}

.legal-list li strong {
  color: #111111;
}

/* Footer */
.document-footer {
  margin-top: 50px;
  padding-top: 20px;
  border-top: 1px solid #dddddd;
  font-size: 0.9rem;
  color: #555555;
  text-align: center;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .legal-wrapper {
    padding: calc(60px + 40px) 4% 80px;
  }
  
  .legal-document {
    padding: 30px 20px;
  }

  .document-header h1 {
    font-size: 1.5rem;
  }

  .legal-list li {
    text-align: left;
  }
}
</style>