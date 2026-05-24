<script setup>
/**
 * cartview.vue
 * ─────────────────────────────────────────────────────────────────
 * No direct Firebase imports here.
 * Cart writes go through saveCartItems() in db.js.
 * Live sync still uses onSnapshot (correct — needs real-time updates).
 * ─────────────────────────────────────────────────────────────────
 */
import { ref, computed, onMounted }  from 'vue'
import { db, auth }                  from '../firebase.js'
import { onAuthStateChanged }        from 'firebase/auth'
import { doc, onSnapshot }           from 'firebase/firestore'
import { saveCartItems }             from './db.js'

defineOptions({ name: 'CartView' })

const cartItems   = ref([])
const loading     = ref(true)
const currentUser = ref(null)

const SHIPPING_FEE            = 60
const FREE_SHIPPING_THRESHOLD = 499

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    currentUser.value = user
    if (user) {
      // onSnapshot is intentional here — keeps cart in real-time sync
      // (e.g. if user adds from another device)
      onSnapshot(doc(db, 'carts', user.uid), (snap) => {
        cartItems.value = snap.exists() ? (snap.data().items ?? []) : []
        loading.value   = false
      })
    } else {
      loading.value = false
    }
  })
})

// ── Computed totals ──────────────────────────────────────────────
const subtotal    = computed(() =>
  cartItems.value.reduce((s, i) => s + i.price * i.quantity, 0)
)
const shippingCost = computed(() =>
  subtotal.value >= FREE_SHIPPING_THRESHOLD || subtotal.value === 0 ? 0 : SHIPPING_FEE
)
const grandTotal  = computed(() => subtotal.value + shippingCost.value)
const progressToFree = computed(() =>
  Math.min((subtotal.value / FREE_SHIPPING_THRESHOLD) * 100, 100)
)
const amountNeeded = computed(() =>
  Math.max(FREE_SHIPPING_THRESHOLD - subtotal.value, 0)
)

// ── Cart mutations — all go through db.js ───────────────────────
async function pushUpdate(updatedItems) {
  if (!currentUser.value) return
  try {
    await saveCartItems(updatedItems)
  } catch (e) {
    console.error('Cart save error:', e)
  }
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
  } else {
    removeItem(idx)
  }
}

const removeItem = (idx) => {
  pushUpdate(cartItems.value.filter((_, i) => i !== idx))
}

const clearEntireCart = () => {
  if (confirm('Empty your entire basket?')) pushUpdate([])
}
</script>

<template>
  <div class="cart-page-wrapper">
    <div class="cart-container">

      <header class="cart-header">
        <h1>Your Mountain Basket 🧺</h1>
        <p v-if="cartItems.length > 0">
          {{ cartItems.length }} pure Himalayan item{{ cartItems.length > 1 ? 's' : '' }}
        </p>
      </header>

      <!-- Loading -->
      <div v-if="loading" class="cart-state-card">
        <div class="spinner"></div>
        <p>Fetching your cloud basket…</p>
      </div>

      <!-- Not logged in -->
      <div v-else-if="!currentUser" class="cart-state-card">
        <span>🔒</span>
        <h3>Please Login</h3>
        <p>Log in to view and checkout items saved in your account.</p>
        <router-link to="/login" class="shop-btn">Go to Login</router-link>
      </div>

      <!-- Empty -->
      <div v-else-if="cartItems.length === 0" class="cart-state-card">
        <span>🍯</span>
        <h3>Aapka basket khali hai!</h3>
        <p>Add pure Himalayan Ghee, Spices, and Organic Sweets to get started.</p>
        <router-link to="/" class="shop-btn">Browse Products</router-link>
      </div>

      <!-- Active cart -->
      <div v-else class="cart-split-layout">

        <!-- LEFT: Items -->
        <main class="cart-main-list">

          <!-- Shipping tracker -->
          <div class="shipping-tracker-card">
            <p v-if="subtotal < FREE_SHIPPING_THRESHOLD">
              Add <strong>₹{{ amountNeeded }}</strong> more for <strong>FREE Shipping!</strong>
            </p>
            <p v-else>🎉 Mubarak ho! You unlocked <strong>Free Mountain Delivery!</strong></p>
            <div class="progress-bar-container">
              <div class="progress-fill" :style="{ width: progressToFree + '%' }"></div>
            </div>
          </div>

          <!-- Item rows -->
          <div v-for="(item, idx) in cartItems" :key="item.productId" class="cart-item-row">
            <div class="item-thumb-box">
              <span class="item-emoji">{{ item.emoji || '📦' }}</span>
            </div>
            <div class="item-details">
              <h4 class="item-title-name">{{ item.name }}</h4>
              <p class="item-weight-metric">{{ item.weight || 'Pure Organic Batch' }}</p>
              <div class="quantity-control-tool">
                <button class="qty-btn" @click="decreaseQty(idx)">−</button>
                <span class="qty-display-text">{{ item.quantity }}</span>
                <button class="qty-btn" @click="increaseQty(idx)">+</button>
              </div>
            </div>
            <div class="item-price-actions-column">
              <span class="item-total-price">₹{{ item.price * item.quantity }}</span>
              <span v-if="item.quantity > 1" class="item-unit-price">(₹{{ item.price }} each)</span>
              <button class="delete-action-btn" @click="removeItem(idx)">🗑️ Remove</button>
            </div>
          </div>

          <button class="clear-basket-link" @click="clearEntireCart">
            ❌ Empty My Entire Basket
          </button>
        </main>

        <!-- RIGHT: Summary -->
        <aside class="cart-summary-sidebar">
          <h3>Order Summary</h3>
          <div class="summary-divider"></div>
          <div class="summary-line">
            <span>Basket Subtotal</span>
            <span>₹{{ subtotal }}</span>
          </div>
          <div class="summary-line">
            <span>Mountain Shipping</span>
            <span v-if="shippingCost === 0" class="free-shipping-tag">FREE</span>
            <span v-else>₹{{ shippingCost }}</span>
          </div>
          <div class="summary-divider"></div>
          <div class="summary-line total-bill-row">
            <span>Grand Total</span>
            <span>₹{{ grandTotal }}</span>
          </div>
          <p class="disclaimer-note">
            🏔️ Orders shipped fresh from our Himalayan basecamp.
            Transit duration depends on high-altitude weather conditions.
          </p>
          <router-link to="/checkout" class="checkout-submit-btn">
            Proceed to Checkout 🚀
          </router-link>
        </aside>

      </div>

    </div>
  </div>
</template>

<style scoped>
/* (Styles identical to original cartview.vue — no visual changes needed) */
.cart-page-wrapper { background: #f9fafb; min-height: 100vh; padding: 100px 20px; font-family: system-ui, sans-serif; color: #1f2937; }
.cart-container { max-width: 1000px; margin: 0 auto; }
.cart-header { text-align: center; margin-bottom: 40px; }
.cart-header h1 { font-size: 2.25rem; font-weight: 700; margin: 0 0 6px; letter-spacing: -.5px; }
.cart-header p { color: #6b7280; margin: 0; font-size: 1rem; }
.cart-state-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 50px 30px; text-align: center; max-width: 450px; margin: 40px auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,.05); }
.cart-state-card span { font-size: 3rem; display: block; margin-bottom: 16px; }
.cart-state-card h3 { margin: 0 0 8px; font-size: 1.3rem; }
.cart-state-card p { color: #6b7280; font-size: .95rem; margin: 0 0 24px; }
.shop-btn { display: inline-block; text-decoration: none; background: #10b981; color: #fff; padding: 10px 24px; border-radius: 6px; font-weight: 600; transition: background .2s; }
.shop-btn:hover { background: #059669; }
.cart-split-layout { display: grid; grid-template-columns: 1fr 340px; gap: 30px; align-items: start; }
.cart-main-list { display: flex; flex-direction: column; gap: 16px; }
.shipping-tracker-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; font-size: .9rem; }
.shipping-tracker-card p { margin: 0 0 10px; color: #4b5563; }
.progress-bar-container { background: #e5e7eb; height: 6px; border-radius: 999px; overflow: hidden; }
.progress-fill { background: #10b981; height: 100%; transition: width .4s ease; }
.cart-item-row { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; display: flex; align-items: center; gap: 16px; }
.item-thumb-box { background: #f3f4f6; width: 70px; height: 70px; display: flex; justify-content: center; align-items: center; border-radius: 6px; font-size: 2rem; flex-shrink: 0; }
.item-details { flex: 1; }
.item-title-name { margin: 0 0 2px; font-size: 1.1rem; font-weight: 600; color: #111827; }
.item-weight-metric { margin: 0 0 12px; font-size: .82rem; color: #9ca3af; font-weight: 500; text-transform: uppercase; }
.quantity-control-tool { display: inline-flex; align-items: center; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; background: #fafafa; }
.qty-btn { background: transparent; border: none; width: 32px; height: 32px; cursor: pointer; font-size: 1.1rem; font-weight: 600; color: #4b5563; transition: background .15s; }
.qty-btn:hover { background: #e5e7eb; }
.qty-display-text { width: 36px; text-align: center; font-size: .95rem; font-weight: 700; color: #111827; user-select: none; }
.item-price-actions-column { display: flex; flex-direction: column; align-items: flex-end; min-width: 100px; }
.item-total-price { font-size: 1.15rem; font-weight: 700; color: #111827; }
.item-unit-price { font-size: .78rem; color: #9ca3af; margin-top: 2px; }
.delete-action-btn { background: transparent; border: none; color: #ef4444; font-size: .82rem; cursor: pointer; margin-top: 14px; font-weight: 500; padding: 0; }
.delete-action-btn:hover { text-decoration: underline; }
.clear-basket-link { background: transparent; border: none; color: #9ca3af; font-size: .88rem; cursor: pointer; align-self: flex-start; margin-top: 4px; }
.clear-basket-link:hover { color: #ef4444; text-decoration: underline; }
.cart-summary-sidebar { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,.02); }
.cart-summary-sidebar h3 { margin: 0 0 16px; font-size: 1.25rem; font-weight: 600; }
.summary-divider { height: 1px; background: #e5e7eb; margin: 16px 0; }
.summary-line { display: flex; justify-content: space-between; font-size: .95rem; color: #4b5563; margin-bottom: 12px; }
.free-shipping-tag { color: #10b981; font-weight: 700; background: #e0f2fe; padding: 2px 6px; border-radius: 4px; font-size: .8rem; }
.total-bill-row { font-size: 1.25rem !important; font-weight: 800; color: #111827; margin: 8px 0; }
.disclaimer-note { font-size: .78rem; color: #9ca3af; margin: 20px 0; line-height: 1.5; background: #f9fafb; padding: 10px; border-radius: 6px; }
.checkout-submit-btn { display: block; text-align: center; text-decoration: none; background: #10b981; color: #fff; padding: 14px; border-radius: 8px; font-weight: 700; font-size: 1rem; transition: background .2s; box-shadow: 0 4px 12px rgba(16,185,129,.2); }
.checkout-submit-btn:hover { background: #059669; }
.spinner { width: 30px; height: 30px; border: 3px solid #e5e7eb; border-top-color: #10b981; border-radius: 50%; animation: spin 1s infinite linear; margin: 0 auto 12px; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 768px) {
  .cart-split-layout { grid-template-columns: 1fr; }
  .cart-page-wrapper { padding: 30px 12px; }
  .cart-item-row { flex-wrap: wrap; }
  .item-price-actions-column { flex-direction: row; width: 100%; justify-content: space-between; align-items: center; border-top: 1px dashed #e5e7eb; margin-top: 10px; padding-top: 10px; }
  .delete-action-btn { margin-top: 0; }
}
</style>