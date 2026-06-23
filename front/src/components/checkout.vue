<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db, auth } from '../firebase.js'
import { doc, onSnapshot, getDoc } from 'firebase/firestore'
import { createCustomerOrderDocument, fetchShippingConfig } from './db.js'

defineOptions({ name: 'Checkout' })
const router = useRouter()

const cartItems = ref([]), loading = ref(true), userAccountData = ref(null), processingOrder = ref(false)
const isCodGloballyActive = ref(true), selectedAddressId = ref(''), selectedPaymentMethod = ref('online')
const appliedPromoCode = ref(window.sessionStorage.getItem('active_promo_code') || null)
const appliedPromoDiscount = ref(Number(window.sessionStorage.getItem('active_promo_discount')) || 0)
const shippingConfig = ref({ fee: 60, freeThreshold: 499, isFreeShippingActive: true })

onMounted(() => {
  // ✨ LOAD RAZORPAY SCRIPT DYNAMICALLY
  const script = document.createElement('script')
  script.src = 'https://checkout.razorpay.com/v1/checkout.js'
  document.body.appendChild(script)

  auth.onAuthStateChanged(async (user) => {
    if (!user) { router.push('/login'); return }
    
    onSnapshot(doc(db, 'carts', user.uid), (snap) => {
      cartItems.value = snap.exists() ? (snap.data().items ?? []) : []
      if (cartItems.value.length === 0 && !processingOrder.value) { router.push('/') }
      loading.value = false
    })

    onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        userAccountData.value = snap.data()
        const addresses = snap.data().addresses || []
        if (addresses.length > 0 && !selectedAddressId.value) selectedAddressId.value = addresses[0].id
      }
    })

    try {
      const configSnap = await getDoc(doc(db, 'systemConfig', 'gateways'))
      if (configSnap.exists()) isCodGloballyActive.value = configSnap.data().isCodActive
      
      const shipCfg = await fetchShippingConfig()
      if (shipCfg) shippingConfig.value = shipCfg
    } catch (e) { console.warn(e.message) }
  })
})

const subtotal = computed(() => cartItems.value.reduce((s, i) => s + i.price * i.quantity, 0))

const shippingCost = computed(() => {
  if (subtotal.value === 0) return 0
  if (shippingConfig.value.isFreeShippingActive && subtotal.value >= shippingConfig.value.freeThreshold) return 0
  return Number(shippingConfig.value.fee) || 0
})

const grandTotal = computed(() => Math.max(subtotal.value - appliedPromoDiscount.value + shippingCost.value, 0))

const activeAddressesList = computed(() => userAccountData.value?.addresses || [])
const activeSelectedAddressObject = computed(() => activeAddressesList.value.find(a => a.id === selectedAddressId.value))

const routeToProfileAddressManager = () => router.push('/user')

// ✨ RAZORPAY INTEGRATION LOGIC
const openRazorpayModal = async (finalizedOrderBlueprint) => {
  try {
    // 1. BACKEND CALL: Create Razorpay Order
    // Yahan tumhe apne Backend/Firebase Function ka URL dalna hoga
    const response = await fetch('/api/create-razorpay-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: grandTotal.value })
    })
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend Error (${response.status}): Please check if your API is live on Cloudflare.`);
    }
    
    const orderData = await response.json()
    
    if (!orderData || !orderData.id) {
      throw new Error("Failed to generate Razorpay Order ID from backend")
    }

    // 2. OPEN RAZORPAY
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Vue/Vite mein .env se id lena
      amount: orderData.amount, // Paise paison mein (e.g., 50000 for ₹500)
      currency: "INR",
      name: "PahadSe",
      description: "Mountain Harvest Provisions",
      order_id: orderData.id, // Backend se aya hua Order ID
      handler: async function (response) {
        // 3. PAYMENT SUCCESS - Verify signature via Backend
        try {
          processingOrder.value = true
          
          /* Yahan ek backend verification call honi chahiye:
          const verifyRes = await fetch('/api/verify-payment', {
             method: 'POST', body: JSON.stringify(response)
          })
          if(verifyRes.ok) { ...proceed } */

          // Agar verify ho gaya, toh database mein order save karo:
          finalizedOrderBlueprint.paymentStatus = 'paid'
          finalizedOrderBlueprint.razorpayPaymentId = response.razorpay_payment_id
          
          const orderId = await createCustomerOrderDocument(finalizedOrderBlueprint)
          
          window.sessionStorage.removeItem('active_promo_discount')
          window.sessionStorage.removeItem('active_promo_code')

          alert(`Payment Successful! Order Registered. ID: ${orderId}`)
          router.push('/user') 
          
        } catch (err) {
          alert("Order saving failed after payment: " + err.message)
          processingOrder.value = false
        }
      },
      prefill: {
        name: finalizedOrderBlueprint.customerName,
        email: auth.currentUser?.email || "",
        contact: finalizedOrderBlueprint.phone
      },
      theme: {
        color: "#111827"
      },
      modal: {
        ondismiss: function() {
          processingOrder.value = false;
          alert("Payment was cancelled.");
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response){
      processingOrder.value = false;
      alert("Payment Failed: " + response.error.description);
    });
    
    rzp.open();

  } catch (error) {
    alert("Could not start Razorpay gateway: " + error.message)
    processingOrder.value = false
  }
}


const processCheckoutSubmission = async () => {
  if (!activeSelectedAddressObject.value) { alert("Please choose a valid destination route address."); return }
  processingOrder.value = true
  
  const target = activeSelectedAddressObject.value
  const finalizedOrderBlueprint = {
    customerName: target.fullName,
    phone: target.phone,
    address: `${target.streetAddress}, ${target.city}, ${target.state} - ${target.pincode}`,
    
    items: cartItems.value.map(i => ({ 
      productId: i.productId, 
      name: i.name, 
      variant: i.variant || i.weight || 'Standard Option',
      quantity: i.quantity, 
      price: i.price, 
      emoji: i.emoji || '📦',
      imageUrl: i.imageUrl || null,
      slug: i.slug || 'product'
    })),
    
    subtotal: subtotal.value,
    shippingCost: shippingCost.value,
    couponCode: appliedPromoCode.value,
    couponDiscount: appliedPromoDiscount.value,
    amount: grandTotal.value,
    
    paymentMethod: selectedPaymentMethod.value,
    shippingStatus: 'pending',
    trackingId: 'PENDING_DISPATCH'
  }

  try {
    // ✨ CHECK PAYMENT METHOD
    if (selectedPaymentMethod.value === 'online') {
      // Razorpay Flow trigger karega
      await openRazorpayModal(finalizedOrderBlueprint)
    } else {
      // COD Flow (Pehla wala logic)
      finalizedOrderBlueprint.paymentStatus = 'pending_collection'
      const orderId = await createCustomerOrderDocument(finalizedOrderBlueprint)
      
      window.sessionStorage.removeItem('active_promo_discount')
      window.sessionStorage.removeItem('active_promo_code')

      alert(`COD Order Registered Successfully! ID: ${orderId}`)
      router.push('/user') 
    }
  } catch (error) {
    alert("Operation aborted: " + error.message)
    processingOrder.value = false
  }
}
</script>

<template>
  <div class="checkout-viewport-page">
    <div v-if="loading" class="center-loading-state"><div class="spinner"></div><p>Synchronizing manifest matrices…</p></div>

    <div v-else class="checkout-layout-grid fade-in">
      <main class="checkout-inputs-column">
        
        <section class="checkout-section-card">
          <div class="section-card-header">
            <h3>1. Delivery Destination Address</h3>
            <button class="add-address-trigger-btn" @click="routeToProfileAddressManager">🛠️ Manage / Add Addresses</button>
          </div>

          <div class="saved-addresses-selection-grid">
            <div v-for="addr in activeAddressesList" :key="addr.id" :class="['address-option-card', { 'is-selected-card': selectedAddressId === addr.id }]" @click="selectedAddressId = addr.id">
              <div class="card-badge-row"><span class="addr-tag-pill">{{ addr.label }}</span><span v-if="selectedAddressId === addr.id" class="checkmark">✓ Selected</span></div>
              <strong>{{ addr.fullName }}</strong>
              <p class="card-street-txt">{{ addr.streetAddress }}, {{ addr.city }}, {{ addr.state }}</p>
              <span class="card-phone-txt">📞 contact: {{ addr.phone }}</span>
            </div>
            <div v-if="activeAddressesList.length === 0" class="no-addresses-fallback-notice">
              <p>No verified addresses discoverable on this account node.</p>
              <button class="save-address-btn" @click="routeToProfileAddressManager" style="margin-top:10px;">Go Create Address Now</button>
            </div>
          </div>
        </section>

        <section class="checkout-section-card">
          <h3>2. Transaction Settlement Gateway</h3>
          <div class="payment-methods-vertical-stack" style="margin-top:16px;">
            <label :class="['payment-method-row', { 'active-method': selectedPaymentMethod === 'online' }]">
              <div class="input-radio-flex">
                <input type="radio" v-model="selectedPaymentMethod" value="online" name="payment_lane" />
                <div class="payment-txt-label"><strong>Secure Online Razorpay Portal</strong><p>UPI, NetBanking, Credit or Debit cards.</p></div>
              </div>
            </label>
            <label :class="['payment-method-row', { 'active-method': selectedPaymentMethod === 'cod', 'is-disabled-row': !isCodGloballyActive }]">
              <div class="input-radio-flex">
                <input type="radio" v-model="selectedPaymentMethod" value="cod" :disabled="!isCodGloballyActive" name="payment_lane" />
                <div class="payment-txt-label"><strong>Cash on Delivery (COD Shipment Route)</strong><p v-if="isCodGloballyActive">Pay your local postman or route runner upon package delivery.</p><p v-else class="error-msg-txt">⚠️ COD routes are offline due to climate parameters.</p></div>
              </div>
            </label>
          </div>
        </section>
      </main>

      <aside class="checkout-bill-summary-column">
        <div class="summary-sticky-card-box">
          <h3>Review Allocation Items</h3>
          <div class="summary-divider-line"></div>
          
          <div class="checkout-read-only-basket-list">
            <div v-for="(item, idx) in cartItems" :key="idx" class="summary-item-row-strip">
              <div class="item-visual-meta">
                
                <div class="item-thumb-mini">
                  <img v-if="item.imageUrl" :src="item.imageUrl" class="checkout-item-img" />
                  <span v-else class="item-emoji-icon">{{ item.emoji || '🍯' }}</span>
                </div>

                <div class="item-names-block">
                  <strong class="item-lbl-name">{{ item.name }}</strong>
                  <span class="item-lbl-variant">{{ item.variant || item.weight || 'Standard' }}</span>
                  <span class="item-lbl-qty">Batch Qty: {{ item.quantity }} units</span>
                </div>
              </div>
              <span class="item-line-calc-price">₹{{ item.price * item.quantity }}</span>
            </div>
          </div>

          <div class="summary-divider-line"></div>
          <div class="calc-ledger-line"><span>Basket Subtotal</span><span>₹{{ subtotal }}</span></div>
          
          <div v-if="appliedPromoCode" class="calc-ledger-line" style="color: #16a34a; font-weight: 800;">
            <span>Voucher ({{ appliedPromoCode }})</span><span>-₹{{ appliedPromoDiscount }}</span>
          </div>

          <div class="calc-ledger-line"><span>High-Altitude Freight Post</span><span v-if="shippingCost === 0" class="free-badge">FREE</span><span v-else>₹{{ shippingCost }}</span></div>
          <div class="summary-divider-line"></div>
          <div class="calc-ledger-line total-highlight-row"><span>Final Cost Balance</span><span>₹{{ grandTotal }}</span></div>
          
          <button @click="processCheckoutSubmission" :disabled="processingOrder || cartItems.length === 0" class="checkout-finalize-submit-cta-btn">
            {{ processingOrder ? 'Encrypting Matrix...' : selectedPaymentMethod === 'cod' ? 'Confirm Delivery Run (COD) 🚀' : 'Pay via Razorpay 🚀' }}
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.checkout-viewport-page { background-color: #FAF6F0; min-height: 100vh; padding: calc(90px + 40px) 4% 60px; box-sizing: border-box; font-family: 'Jost', sans-serif; color: #111827; }
.center-loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 50vh; gap: 16px; color: #6b7280; }
.spinner { width: 44px; height: 44px; border: 3px solid #e5e7eb; border-top-color: #16a34a; border-radius: 50%; animation: spin 0.85s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.checkout-layout-grid { width: 100%; max-width: 1140px; margin: 0 auto; display: grid; grid-template-columns: 60% 40%; gap: 36px; }
.checkout-inputs-column { display: flex; flex-direction: column; gap: 24px; }
.checkout-section-card { background-color: #ffffff; border: 2px solid #111827; border-radius: 16px; padding: 32px; }
.section-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
.checkout-section-card h3 { font-family: 'Cinzel', serif; font-size: 1.3rem; font-weight: 800; margin: 0; }
.add-address-trigger-btn { background: #ffffff; color: #111827; border: 2px solid #111827; padding: 6px 14px; border-radius: 6px; font-size: 0.82rem; font-weight: 700; cursor: pointer; }
.saved-addresses-selection-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
.address-option-card { border: 2px solid #cbd5e1; border-radius: 10px; padding: 16px; cursor: pointer; position: relative; }
.address-option-card.is-selected-card { border-color: #16a34a; background-color: #f0fdf4; }
.card-badge-row { display: flex; justify-content: space-between; align-items: center; }
.addr-tag-pill { background-color: #111827; color: #FAF6F0; font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
.checkmark { font-size: 0.78rem; color: #16a34a; font-weight: 800; }
.card-street-txt { font-size: 0.88rem; color: #4b5563; margin: 6px 0 10px; line-height: 1.4; }
.card-phone-txt { font-size: 0.82rem; color: #111827; font-weight: 700; }
.no-addresses-fallback-notice { text-align: center; color: #6b7280; padding: 20px; grid-column: 1/-1; border: 2px dashed #cbd5e1; border-radius: 8px; }
.save-address-btn { background-color: #111827; color: #FAF6F0; border: none; padding: 10px 24px; border-radius: 30px; font-weight: 700; cursor: pointer; }
.payment-methods-vertical-stack { display: flex; flex-direction: column; gap: 12px; }
.payment-method-row { display: flex; justify-content: space-between; align-items: center; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; cursor: pointer; }
.payment-method-row.active-method { border-color: #111827; background-color: #f9fafb; }
.payment-method-row.is-disabled-row { opacity: 0.55; cursor: not-allowed; background-color: #f3f4f6; }
.input-radio-flex { display: flex; gap: 14px; align-items: flex-start; }
.input-radio-flex input { width: 18px; height: 18px; accent-color: #111827; }
.payment-txt-label strong { font-size: 1rem; font-weight: 800; }
.payment-txt-label p { font-size: 0.85rem; color: #6b7280; margin: 4px 0 0; }
.payment-txt-label p.error-msg-txt { color: #dc2626; font-weight: 700; }
.checkout-bill-summary-column { position: sticky; top: 100px; }
.summary-sticky-card-box { background-color: #ffffff; border: 2px solid #111827; border-radius: 16px; padding: 28px; }
.summary-sticky-card-box h3 { font-family: 'Cinzel', serif; font-size: 1.25rem; font-weight: 800; margin: 0; }
.summary-divider-line { height: 2px; background-color: #111827; margin: 16px 0; }
.checkout-read-only-basket-list { display: flex; flex-direction: column; gap: 14px; max-height: 300px; overflow-y: auto; }
.summary-item-row-strip { display: flex; justify-content: space-between; align-items: center; }
.item-visual-meta { display: flex; align-items: center; gap: 12px; }
.item-thumb-mini { font-size: 1.8rem; background-color: #fafafa; border: 1px solid #e5e7eb; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 6px; overflow: hidden; flex-shrink: 0; }
.checkout-item-img { width: 100%; height: 100%; object-fit: cover; }
.item-names-block { display: flex; flex-direction: column; }
.item-lbl-name { font-size: 0.95rem; font-weight: 800; }
.item-lbl-variant { font-size: 0.8rem; color: #4B5563; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
.item-lbl-qty { font-size: 0.78rem; color: #6b7280; margin-top: 2px; }
.item-line-calc-price { font-size: 1.05rem; font-weight: 900; }
.calc-ledger-line { display: flex; justify-content: space-between; font-size: 0.95rem; color: #4b5563; margin-bottom: 10px; }
.free-badge { color: #16a34a; font-weight: 800; }
.total-highlight-row { font-size: 1.3rem; font-weight: 900; margin-top: 6px; }
.checkout-finalize-submit-cta-btn { width: 100%; padding: 16px; background-color: #111827; color: #FAF6F0; border: none; border-radius: 30px; font-size: 0.95rem; font-weight: 800; cursor: pointer; text-transform: uppercase; margin-top: 14px; transition: 0.2s; }
.checkout-finalize-submit-cta-btn:hover:not(:disabled) { background-color: #16a34a; }
.checkout-finalize-submit-cta-btn:disabled { opacity: 0.7; cursor: not-allowed; }
.fade-in { animation: fIn 0.3s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (max-width: 900px) { .checkout-layout-grid { grid-template-columns: 1fr; } .checkout-bill-summary-column { position: relative; top: 0; } }
</style>