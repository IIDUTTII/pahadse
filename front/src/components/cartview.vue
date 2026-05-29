<script setup>
/**
 * cartview.vue — Premium Client Basket Hub Console
 * Features: High-contrast split console layout, custom item instructions, and regional voucher validation.
 */
import { ref, computed, onMounted }  from 'vue'
import { db, auth }                  from '../firebase.js'
import { onAuthStateChanged }        from 'firebase/auth'
import { doc, onSnapshot }           from 'firebase/firestore'
import { saveCartItems }             from './db.js'

defineOptions({ name: 'CartView' })

const cartItems = ref([]), loading = ref(true), currentUser = ref(null)
const promoCode = ref(''), promoApplied = ref(false), promoError = ref('')

const SHIPPING_FEE = 60, FREE_SHIPPING_THRESHOLD = 499

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    currentUser.value = user
    if (user) {
      onSnapshot(doc(db, 'carts', user.uid), (snap) => {
        cartItems.value = snap.exists() ? (snap.data().items ?? []) : []
        loading.value = false
      })
    } else { loading.value = false }
  })
})

// ── COMPUTED PROCESSING CALCULATIONS ──
const subtotal = computed(() => cartItems.value.reduce((s, i) => s + i.price * i.quantity, 0))
const discountAmount = computed(() => promoApplied.value ? Math.round(subtotal.value * 0.1) : 0) // 10% Local Crop Discount
const shippingCost = computed(() => subtotal.value >= FREE_SHIPPING_THRESHOLD || subtotal.value === 0 ? 0 : SHIPPING_FEE)
const grandTotal = computed(() => Math.max(subtotal.value - discountAmount.value + shippingCost.value, 0))
const progressToFree = computed(() => Math.min((subtotal.value / FREE_SHIPPING_THRESHOLD) * 100, 100))
const amountNeeded = computed(() => Math.max(FREE_SHIPPING_THRESHOLD - subtotal.value, 0))

// ── CENTRAL DISPATCH DATABASE WRITE HOOKS ──
async function pushUpdate(updatedItems) {
  if (!currentUser.value) return
  try { await saveCartItems(updatedItems) } catch (e) { console.error('Cart synchronization failure:', e) }
}

const increaseQty = (idx) => {
  const updated = [...cartItems.value]
  updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 }
  pushUpdate(updated)
}

const decreaseQty = (idx) => {
  const updated = [...cartItems.value]
  if (updated[idx].quantity > 1) {
    updated[idx] = { ...updated[idx], quantity: updated[idx].quantity - 1 }
    pushUpdate(updated)
  } else { removeItem(idx) }
}

const removeItem = (idx) => pushUpdate(cartItems.value.filter((_, i) => i !== idx))
const clearEntireCart = () => { if (confirm('Empty your entire mountain basket?')) pushUpdate([]) }

// 📝 NEW: LOCAL HARVEST ITEM BATCH NOTES SYNC ENGINE
const updateItemNote = (idx, noteText) => {
  const updated = [...cartItems.value]
  updated[idx] = { ...updated[idx], note: noteText }
  pushUpdate(updated)
}

// 🏷️ NEW: REGIONAL PROMOTION VOUCHER INTERFACE VALIDATION
const applyVoucher = () => {
  promoError.value = ''; promoApplied.value = false
  if (promoCode.value.trim().toUpperCase() === 'PAHAD10') {
    promoApplied.value = true
  } else {
    promoError.value = "Invalid or expired mountain batch voucher."
  }
}
</script>

<template>
  <div class="cart-page-wrapper">
    <div class="cart-container">

      <header class="cart-header">
        <h1>Your Mountain Basket</h1>
        <p v-if="cartItems.length > 0">{{ cartItems.length }} pure high-altitude provision selection{{ cartItems.length > 1 ? 's' : '' }} reserved.</p>
      </header>

      <!-- ⏳ STATE A: VERIFYING PROTOCOLS -->
      <div v-if="loading" class="cart-state-card">
        <div class="spinner"></div>
        <p>Assembling credentials & secure cloud basket lines…</p>
      </div>

      <!-- 🔒 STATE B: ANONYMOUS ACCOUNT PROTECTION -->
      <div v-else-if="!currentUser" class="cart-state-card isolated-auth">
        <span class="state-glyph">🔒</span>
        <h3>Authorization Required</h3>
        <p>Please bridge your signature terminal node to synchronize saved high-altitude items.</p>
        <router-link to="/login" class="shop-btn">Go to Login</router-link>
      </div>

      <!-- 🍯 STATE C: VACANT PROVISION SHEET -->
      <div v-else-if="cartItems.length === 0" class="cart-state-card isolated-auth">
        <span class="state-glyph">🍯</span>
        <h3>Aapka basket khali hai!</h3>
        <p>Add pure Himalayan Bilona Ghee, wild herbs, and organic spices to initialize checkout.</p>
        <router-link to="/" class="shop-btn">Browse Products</router-link>
      </div>

      <!-- 🛒 STATE D: ACTIVE PROVISION LAYOUT SPLIT -->
      <div v-else class="cart-split-layout fade-in">

        <!-- LEFT PANE: BASKET COMPILATION ROWS -->
        <main class="cart-main-list">
          
          <!-- Shipping Tracker Panel -->
          <div class="shipping-tracker-card">
            <p v-if="subtotal < FREE_SHIPPING_THRESHOLD">Add <strong>₹{{ amountNeeded }}</strong> more to unlock <strong>FREE Shipping!</strong></p>
            <p v-else>🎉 Mubarak ho! You have unlocked <strong>Free Mountain Delivery!</strong></p>
            <div class="progress-bar-container"><div class="progress-fill" :style="{ width: progressToFree + '%' }"></div></div>
          </div>

          <!-- Product Item Cards -->
          <div v-for="(item, idx) in cartItems" :key="item.productId" class="cart-item-row">
            <div class="item-thumb-box"><span class="item-emoji">{{ item.emoji || '📦' }}</span></div>
            
            <div class="item-details">
              <h4 class="item-title-name">{{ item.name }}</h4>
              <p class="item-weight-metric">{{ item.weight || 'Pure Organic Allotment' }}</p>
              
              <div class="quantity-control-tool">
                <button class="qty-btn" @click="decreaseQty(idx)">−</button>
                <span class="qty-display-text">{{ item.quantity }}</span>
                <button class="qty-btn" @click="increaseQty(idx)">+</button>
              </div>

              <!-- 📝 NEW FUNCTION: LIVE PACKAGING INSTRUCTION BAR -->
              <div class="item-instruction-wrapper">
                <input 
                  :value="item.note || ''" 
                  @change="updateItemNote(idx, $event.target.value)"
                  placeholder="✍️ Add packaging or preparation notes..." 
                  class="item-note-input"
                />
              </div>
            </div>

            <div class="item-price-actions-column">
              <span class="item-total-price">₹{{ item.price * item.quantity }}</span>
              <span v-if="item.quantity > 1" class="item-unit-price">(₹{{ item.price }} / unit)</span>
              <button class="delete-action-btn" @click="removeItem(idx)">🗑️ Remove</button>
            </div>
          </div>

          <button class="clear-basket-link" @click="clearEntireCart">❌ Empty My Entire Basket</button>
        </main>

        <!-- RIGHT PANE: TRANSACTION CONSOLE SIDEBAR -->
        <aside class="cart-summary-sidebar">
          <h3>Order Summary</h3>
          <div class="summary-divider"></div>
          
          <div class="summary-line"><span>Basket Subtotal</span><span>₹{{ subtotal }}</span></div>
          
          <!-- 🏷️ NEW FUNCTION: INLINE COUPON CALCULATION STRIP -->
          <div v-if="promoApplied" class="summary-line text-green">
            <span>Voucher Discount (10%)</span><span>-₹{{ discountAmount }}</span>
          </div>

          <div class="summary-line">
            <span>Mountain Shipping</span>
            <span v-if="shippingCost === 0" class="free-shipping-tag">FREE</span>
            <span v-else>₹{{ shippingCost }}</span>
          </div>

          <!-- 🏷️ NEW FUNCTION: PROMO ENTRY SYSTEM FIELD -->
          <div class="promo-coupon-box">
            <div class="promo-input-row">
              <input v-model="promoCode" placeholder="Enter Code (e.g., PAHAD10)" :disabled="promoApplied" class="promo-text-input" />
              <button @click="applyVoucher" :disabled="promoApplied" class="promo-apply-btn">Apply</button>
            </div>
            <p v-if="promoError" class="promo-msg-error">{{ promoError }}</p>
            <p v-if="promoApplied" class="promo-msg-success">✓ 10% Local Crop Discount applied.</p>
          </div>

          <div class="summary-divider"></div>
          <div class="summary-line total-bill-row"><span>Grand Total</span><span>₹{{ grandTotal }}</span></div>
          
          <p class="disclaimer-note">
            🏔️ All provisions are gathered and packaged directly at our mountain hubs in Mandi and Kullu. Shipping timeline remains contingent on high-altitude weather parameters.
          </p>
          
          <router-link to="/checkout" class="checkout-submit-btn">Proceed to Checkout Run 🚀</router-link>
        </aside>

      </div>

    </div>
  </div>
</template>

<style scoped>
.cart-page-wrapper { background: #FAF6F0; min-height: 100vh; padding: calc(90px + 40px) 20px 60px; box-sizing: border-box; font-family: 'Jost', sans-serif; color: #111827; }
.cart-container { max-width: 1100px; margin: 0 auto; }
.cart-header { text-align: center; margin-bottom: 36px; }
.cart-header h1 { font-family: 'Cinzel', serif; font-size: 2.4rem; font-weight: 700; margin: 0 0 6px; color: #111827; }
.cart-header p { color: #6b7280; margin: 0; font-size: 1rem; font-weight: 500; }

.cart-state-card { background: #ffffff; border: 2px solid #111827; border-radius: 16px; padding: 50px 30px; text-align: center; max-width: 460px; margin: 40px auto; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.02); }
.state-glyph { font-size: 3.5rem; display: block; margin-bottom: 12px; }
.cart-state-card h3 { font-family: 'Cinzel', serif; margin: 0 0 8px; font-size: 1.4rem; font-weight: 700; }
.cart-state-card p { color: #6b7280; font-size: .95rem; margin: 0 0 24px; font-weight: 500; }
.shop-btn { display: inline-block; background: #111827; color: #FAF6F0; padding: 12px 28px; border-radius: 30px; font-weight: 700; text-decoration: none; text-transform: uppercase; font-size: 0.88rem; transition: background .2s; }
.shop-btn:hover { background: #16a34a; }

.cart-split-layout { display: grid; grid-template-columns: 1fr 360px; gap: 32px; align-items: start; }
.cart-main-list { display: flex; flex-direction: column; gap: 16px; }

.shipping-tracker-card { background: #ffffff; border: 2px solid #cbd5e1; border-radius: 12px; padding: 16px; font-size: .92rem; font-weight: 500; }
.shipping-tracker-card p { margin: 0 0 12px; color: #374151; }
.progress-bar-container { background: #e5e7eb; height: 8px; border-radius: 999px; overflow: hidden; }
.progress-fill { background: #16a34a; height: 100%; transition: width .4s ease; }

.cart-item-row { background: #ffffff; border: 2px solid #111827; border-radius: 14px; padding: 20px; display: flex; align-items: flex-start; gap: 20px; }
.item-thumb-box { background: #FAF6F0; width: 75px; height: 75px; display: flex; justify-content: center; align-items: center; border-radius: 8px; font-size: 2.2rem; flex-shrink: 0; border: 1px solid #cbd5e1; }
.item-details { flex: 1; }
.item-title-name { margin: 0 0 2px; font-size: 1.15rem; font-weight: 800; color: #111827; }
.item-weight-metric { margin: 0 0 12px; font-size: .78rem; color: #9ca3af; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

.quantity-control-tool { display: inline-flex; align-items: center; border: 2px solid #111827; border-radius: 20px; overflow: hidden; background: #ffffff; }
.qty-btn { background: transparent; border: none; width: 32px; height: 32px; cursor: pointer; font-size: 1.1rem; font-weight: 700; color: #111827; }
.qty-btn:hover { background: #f3f4f6; }
.qty-display-text { width: 36px; text-align: center; font-size: .95rem; font-weight: 800; color: #111827; user-select: none; }

/* 📝 ITEM PACKAGING NOTE INPUT FIELD STYLES */
.item-instruction-wrapper { margin-top: 12px; width: 100%; max-width: 380px; }
.item-note-input { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.85rem; font-family: inherit; color: #374151; outline: none; background-color: #f9fafb; box-sizing: border-box; }
.item-note-input:focus { border-color: #16a34a; background-color: #ffffff; }

.item-price-actions-column { display: flex; flex-direction: column; align-items: flex-end; min-width: 110px; }
.item-total-price { font-size: 1.25rem; font-weight: 900; color: #111827; }
.item-unit-price { font-size: .78rem; color: #6b7280; margin-top: 2px; font-weight: 500; }
.delete-action-btn { background: transparent; border: none; color: #dc2626; font-size: .82rem; cursor: pointer; margin-top: 18px; font-weight: 700; padding: 0; }
.delete-action-btn:hover { text-decoration: underline; }
.clear-basket-link { background: transparent; border: none; color: #9ca3af; font-size: 0.85rem; font-weight: 700; cursor: pointer; align-self: flex-start; margin-top: 4px; }
.clear-basket-link:hover { color: #dc2626; text-decoration: underline; }

.cart-summary-sidebar { background: #ffffff; border: 2px solid #111827; border-radius: 16px; padding: 24px; box-shadow: 0 10px 25px -10px rgba(0,0,0,0.02); }
.cart-summary-sidebar h3 { margin: 0 0 16px; font-family: 'Cinzel', serif; font-size: 1.3rem; font-weight: 700; color: #111827; }
.summary-divider { height: 2px; background: #111827; margin: 16px 0; }
.summary-line { display: flex; justify-content: space-between; font-size: .98rem; color: #374151; margin-bottom: 12px; font-weight: 500; }
.text-green { color: #16a34a !important; font-weight: 700; }
.free-shipping-tag { color: #16a34a; font-weight: 800; background: #f0fdf4; padding: 2px 8px; border-radius: 4px; font-size: .78rem; border: 1px solid #bbf7d0; }

/* 🏷️ PROMO CONTAINER DESIGN STYLES */
.promo-coupon-box { margin: 20px 0 10px; padding: 12px; background-color: #f9fafb; border: 1px dashed #cbd5e1; border-radius: 8px; }
.promo-input-row { display: flex; gap: 8px; }
.promo-text-input { flex: 1; padding: 8px 12px; border: 2px solid #cbd5e1; border-radius: 6px; font-family: inherit; font-size: 0.85rem; outline: none; }
.promo-text-input:focus { border-color: #111827; }
.promo-apply-btn { padding: 8px 16px; background-color: #111827; color: #FAF6F0; border: none; border-radius: 6px; font-weight: 700; font-size: 0.82rem; cursor: pointer; text-transform: uppercase; }
.promo-apply-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.promo-msg-error { margin: 6px 0 0; font-size: 0.78rem; color: #dc2626; font-weight: 600; }
.promo-msg-success { margin: 6px 0 0; font-size: 0.78rem; color: #16a34a; font-weight: 700; }

.total-bill-row { font-size: 1.35rem !important; font-weight: 900; color: #111827; margin: 8px 0; }
.disclaimer-note { font-size: .78rem; color: #78716c; margin: 20px 0; line-height: 1.5; background: #FAF6F0; padding: 12px; border-radius: 8px; font-weight: 500; border-left: 3px solid #16a34a; }

.checkout-submit-btn { display: block; text-align: center; text-decoration: none; background: #111827; color: #FAF6F0; padding: 16px; border-radius: 30px; font-weight: 700; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px; transition: background .2s; }
.checkout-submit-btn:hover { background: #16a34a; }

.spinner { width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #16a34a; border-radius: 50%; animation: spin 0.85s linear infinite; margin: 0 auto 12px; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 840px) {
  .cart-split-layout { grid-template-columns: 1fr; gap: 24px; }
  .cart-page-wrapper { padding: calc(90px + 20px) 12px 40px; }
  .cart-item-row { flex-direction: column; align-items: stretch; gap: 14px; position: relative; }
  .item-thumb-box { width: 60px; height: 60px; font-size: 1.8rem; }
  .item-instruction-wrapper { max-width: 100%; }
  .item-price-actions-column { flex-direction: row-reverse; width: 100%; justify-content: space-between; align-items: center; border-top: 1px dashed #cbd5e1; margin-top: 8px; padding-top: 12px; }
  .delete-action-btn { margin-top: 0; }
}
</style>