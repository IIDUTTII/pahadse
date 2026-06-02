<script setup>
defineOptions({
  name: 'ShippingPolicyView'
})
</script>

<template>
  <div class="legal-wrapper">
    <div class="legal-document">
      
      <header class="document-header">
        <h1>Return, Refund, Replacement & Shipping Policy</h1>
        <p class="last-updated">Last Updated: June 2026</p>
      </header>

      <div class="document-body">
        
        <!-- 1. Nature of Products -->
        <div class="section-block">
          <h2>1. Nature of Products</h2>
          <ul class="legal-list">
            <li>PahadSe specializes in natural, traditional, and food-based products sourced from Himalayan regions.</li>
            <li>Products may include Bilona Ghee, Traditional Oils, Raw Spices, Honey, Food Products, and other Himalayan Products.</li>
            <li>Due to their pure, organic, and perishable nature, returns are generally not accepted after successful delivery.</li>
          </ul>
        </div>

        <!-- 2. Return Policy -->
        <div class="section-block">
          <h2>2. Return Policy</h2>
          <ul class="legal-list">
            <li>We do not accept returns once a product has been successfully delivered to the customer's address.</li>
            <li>Customers are encouraged to review product information carefully before placing an order.</li>
          </ul>
        </div>

        <!-- 3. Replacement Policy -->
        <div class="section-block">
          <h2>3. Replacement Policy</h2>
          <ul class="legal-list">
            <li>A replacement may be provided if the package arrives damaged, the product is broken or leaking, or the wrong product is delivered.</li>
            <li>To qualify for a replacement, the issue must be reported within 48 hours of delivery, and clear photographs or an unboxing video showing the issue must be provided.</li>
            <li>Replacement requests submitted after the reporting period may not be accepted.</li>
          </ul>
        </div>

        <!-- 4. Refund Policy -->
        <div class="section-block">
          <h2>4. Refund Policy</h2>
          <ul class="legal-list">
            <li>Refunds may be issued only where a replacement is not possible, the order cannot be fulfilled, or PahadSe determines a refund is appropriate after review.</li>
            <li>Refund approval remains at the sole discretion of PahadSe.</li>
            <li>Approved refunds will be processed through the original payment method whenever possible.</li>
          </ul>
        </div>

        <!-- 5. Order Cancellation -->
        <div class="section-block">
          <h2>5. Order Cancellation</h2>
          <ul class="legal-list">
            <li>Customers may modify shipping details or request order cancellation before the order is dispatched.</li>
            <li>Once a tracking number is generated or the shipment has been handed to the courier, cancellation is no longer possible.</li>
          </ul>
        </div>

        <!-- 6. Dispatch Timeline -->
        <div class="section-block">
          <h2>6. Dispatch Timeline</h2>
          <ul class="legal-list">
            <li>Orders are generally dispatched within 1–2 business days.</li>
            <li>PahadSe reserves the right to delay dispatch when necessary, or cancel orders due to operational limitations or stock availability issues.</li>
          </ul>
        </div>

        <!-- 7. Delivery Timeline -->
        <div class="section-block">
          <h2>7. Delivery Timeline</h2>
          <ul class="legal-list">
            <li><strong>Within India:</strong> Generally 5–10 business days.</li>
            <li><strong>International Orders:</strong> Delivery timelines vary depending on destination country and carrier availability.</li>
            <li>Actual delivery times may differ due to customs procedures and local regulations.</li>
          </ul>
        </div>

        <!-- 8. International Shipping -->
        <div class="section-block">
          <h2>8. International Shipping</h2>
          <ul class="legal-list">
            <li>International shipping may be available to destinations supported by India Post or other approved carriers.</li>
            <li>Customers seeking international delivery are encouraged to contact customer support before placing an order.</li>
            <li>International shipping charges vary by destination, package weight, and dimensions, and will be communicated before order confirmation.</li>
            <li>Customers are responsible for any customs duties, taxes, or import charges imposed by their country.</li>
          </ul>
        </div>

        <!-- 9. Delivery Delays -->
        <div class="section-block">
          <h2>9. Delivery Delays</h2>
          <ul class="legal-list">
            <li>Delivery timelines may be affected by weather conditions, landslides, road closures, natural disasters, courier disruptions, or government restrictions.</li>
            <li>PahadSe shall not be liable for delays caused by circumstances beyond reasonable control.</li>
          </ul>
        </div>

        <!-- 10. Contact Information -->
        <div class="section-block">
          <h2>10. Contact Information</h2>
          <ul class="legal-list">
            <li><strong>PahadSe</strong></li>
            <li>Address: Seraj Valley, Mandi, Himachal Pradesh, India</li>
            <li>Email: care@pahadse.com</li>
            <li>Phone: +91 XXXXX XXXXX</li>
          </ul>
        </div>

      </div>

      <footer class="document-footer">
        <p>For return, replacement, shipping, or delivery-related concerns, please contact us at <strong>care@pahadse.com</strong>.</p>
      </footer>

    </div>
  </div>
</template>



<style scoped>
/* Clean document style – matching your other policy pages */
.legal-wrapper {
  background-color: #fcfcfc;
  min-height: 100vh;
  padding: calc(60px + 40px) 4% 80px;
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