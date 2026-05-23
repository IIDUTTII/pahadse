<script setup>
import { ref, computed, onMounted } from 'vue'
import { db, auth } from '../firebase.js'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore'

defineOptions({
  name: 'CartView'
})

const cartItems = ref([])
const loading = ref(true)
const currentUser = ref(null)

// 🏔️ Mountain Shipping Logistics Rates
const SHIPPING_FEE = 60
const FREE_SHIPPING_THRESHOLD = 499

// 1. Establish Real-time Cloud Sync with user's cart document
onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    currentUser.value = user
    if (user) {
      const cartRef = doc(db, 'carts', user.uid)
      
      // Live stream listener updates Vue state instantly if db updates
      onSnapshot(cartRef, (docSnap) => {
        if (docSnap.exists()) {
          cartItems.value = docSnap.data().items || []
        } else {
          cartItems.value = []
        }
        loading.value = false
      })
    } else {
      loading.value = false
    }
  })
})

// ── 📊 COMPUTED CHECKOUT METRICS ──
const subtotal = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

const shippingCost = computed(() => {
  if (subtotal.value >= FREE_SHIPPING_THRESHOLD || subtotal.value === 0) return 0
  return SHIPPING_FEE
})

const grandTotal = computed(() => subtotal.value + shippingCost.value)

// Free Shipping Dynamic Progress Tracker
const progressToFreeShipping = computed(() => {
  const percentage = (subtotal.value / FREE_SHIPPING_THRESHOLD) * 100
  return Math.min(percentage, 100)
})

const amountNeededForFreeShipping = computed(() => {
  return Math.max(FREE_SHIPPING_THRESHOLD - subtotal.value, 0)
})

// ── 🛠️ CART UTILITY ACTIONS ──

// Push modified quantities back into Firestore Array database matrix
const updateDatabaseCart = async (updatedItems) => {
  if (!currentUser.value) return
  try {
    const cartRef = doc(db, 'carts', currentUser.value.uid)
    await setDoc(cartRef, { items: updatedItems }, { merge: true })
  } catch (error) {
    console.error("Cart update failed:", error)
  }
}

const increaseQty = (index) => {
  const updated = [...cartItems.value]
  updated[index].quantity++
  updateDatabaseCart(updated)
}

const decreaseQty = (index) => {
  const updated = [...cartItems.value]
  if (updated[index].quantity > 1) {
    updated[index].quantity--
    updateDatabaseCart(updated)
  } else {
    removeItem(index) // Delete automatically if drops past 1
  }
}

const removeItem = (index) => {
  const updated = cartItems.value.filter((_, i) => i !== index)
  updateDatabaseCart(updated)
}

const clearEntireCart = () => {
  if (confirm('Are you sure you want to empty your basket?')) {
    updateDatabaseCart([])
  }
}
</script>

<template>
  <div class="cart-page-wrapper">
    <div class="cart-container">
      
      <header class="cart-header">
        <h1>Your Mountain Basket 🧺</h1>
        <p v-if="cartItems.length > 0">You have picked {{ cartItems.length }} pure Himalayan items</p>
      </header>

      <!-- ⏳ LOADING STATE -->
      <div v-if="loading" class="cart-state-card">
        <div class="spinner"></div>
        <p>Fetching your cloud basket...</p>
      </div>

      <!-- 🔒 NOT LOGGED IN STATE -->
      <div v-else-if="!currentUser" class="cart-state-card">
        <span>🔒</span>
        <h3>Please Login</h3>
        <p>Log in to view and checkout items saved in your account.</p>
        <router-link to="/login" class="shop-btn">Go to Login</router-link>
      </div>

      <!-- 🫙 EMPTY CART STATE -->
      <div v-else-if="cartItems.length === 0" class="cart-state-card">
        <span>🍯</span>
        <h3>Aapka basket khali hai!</h3>
        <p>Add pure Himalayan Ghee, Spices, and Organic Sweets to get started.</p>
        <router-link to="/" class="shop-btn">Browse Products</router-link>
      </div>

      <!-- 🛒 ACTIVE ITEMS LISTING CONTAINER -->
      <div v-else class="cart-split-layout">
        
        <!-- LEFT PANEL: PRODUCT FIELDS ROW GENERATOR -->
        <main class="cart-main-list">
          
          <!-- ⚡ Dynamic Shipping Tracker Banner -->
          <div class="shipping-tracker-card">
            <p v-if="subtotal < FREE_SHIPPING_THRESHOLD">
              Add <strong>₹{{ amountNeededForFreeShipping }}</strong> more for <strong>FREE Shipping!</strong>
            </p>
            <p v-else>🎉 Mubarak ho! You unlocked <strong>Free Mountain Delivery!</strong></p>
            <div class="progress-bar-container">
              <div class="progress-fill" :style="{ width: progressToFreeShipping + '%' }"></div>
            </div>
          </div>

          <!-- Product Row Loop -->
          <div v-for="(item, index) in cartItems" :key="item.productId" class="cart-item-row">
            
            <!-- Product Thumbnail Icon -->
            <div class="item-thumb-box">
              <span class="item-emoji">{{ item.emoji || '📦' }}</span>
            </div>

            <!-- Product Identifiers -->
            <div class="item-details">
              <h4 class="item-title-name">{{ item.name }}</h4>
              <p class="item-weight-metric">{{ item.weight || 'Pure Organic Batch' }}</p>
              
              <!-- Quantity Increment Step Counter tool -->
              <div class="quantity-control-tool">
                <button class="qty-btn" @click="decreaseQty(index)">−</button>
                <span class="qty-display-text">{{ item.quantity }}</span>
                <button class="qty-btn" @click="increaseQty(index)">+</button>
              </div>
            </div>

            <!-- Price calculations & delete actions alignment column -->
            <div class="item-price-actions-column">
              <span class="item-total-price">₹{{ item.price * item.quantity }}</span>
              <span v-if="item.quantity > 1" class="item-unit-price">(₹{{ item.price }} each)</span>
              
              <button class="delete-action-btn" @click="removeItem(index)">
                🗑️ Remove
              </button>
            </div>

          </div>

          <button class="clear-basket-link" @click="clearEntireCart">
            ❌ Empty My Entire Basket
          </button>
        </main>

        <!-- RIGHT PANEL: BILLING INVOICE CALCULATION SUMMARY CARD -->
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

          <p class="disclaimer-note">🏔️ Orders are shipped fresh from our Himalayan basecamp. Transit duration depends on high-altitude weather conditions.</p>

          <router-link to="/checkout" class="checkout-submit-btn">
            Proceed to Checkout 🚀
          </router-link>
        </aside>

      </div>

    </div>
  </div>
</template>

<style scoped>
/* 🎨 MINIMALIST PREMIUM E-COMMERCE LAYOUT SCHEMATICS */
.cart-page-wrapper { background: #f9fafb; min-height: 100vh; padding: 100px 20px; font-family: system-ui, sans-serif; color: #1f2937; }
.cart-container { max-width: 1000px; margin: 0 auto; }

.cart-header { text-align: center; margin-bottom: 40px; }
.cart-header h1 { font-size: 2.25rem; font-weight: 700; margin: 0 0 6px 0; letter-spacing: -0.5px; }
.cart-header p { color: #6b7280; margin: 0; font-size: 1rem; }

/* Placeholder utility layout states */
.cart-state-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 50px 30px; text-align: center; max-width: 450px; margin: 40px auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.cart-state-card span { font-size: 3rem; display: block; margin-bottom: 16px; }
.cart-state-card h3 { margin: 0 0 8px 0; font-size: 1.3rem; }
.cart-state-card p { color: #6b7280; font-size: 0.95rem; margin: 0 0 24px 0; }
.shop-btn { display: inline-block; text-decoration: none; background: #10b981; color: white; padding: 10px 24px; border-radius: 6px; font-weight: 600; font-size: 0.95rem; transition: background 0.2s; }
.shop-btn:hover { background: #059669; }

/* 🛒 RESPONSIVE SPLIT TWO-COLUMN GRID */
.cart-split-layout { display: grid; grid-template-columns: 1fr 340px; gap: 30px; align-items: start; }

/* Left Hand Items Rows Panel */
.cart-main-list { display: flex; flex-direction: column; gap: 16px; }

/* Shipping Free Progress Tracker Widget */
.shipping-tracker-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; font-size: 0.9rem; }
.shipping-tracker-card p { margin: 0 0 10px 0; color: #4b5563; }
.progress-bar-container { background: #e5e7eb; height: 6px; border-radius: 999px; overflow: hidden; }
.progress-fill { background: #10b981; height: 100%; transition: width 0.4s ease; width: 0%; }

/* ITEM ROW CONTAINER MODULE */
.cart-item-row { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; display: flex; align-items: center; gap: 16px; position: relative; }
.item-thumb-box { background: #f3f4f6; width: 70px; height: 70px; display: flex; justify-content: center; align-items: center; border-radius: 6px; font-size: 2rem; }
.item-details { flex: 1; }
.item-title-name { margin: 0 0 2px 0; font-size: 1.1rem; font-weight: 600; color: #111827; }
.item-weight-metric { margin: 0 0 12px 0; font-size: 0.82rem; color: #9ca3af; font-weight: 500; text-transform: uppercase; }

/* Incremental Counter Utility buttons Box */
.quantity-control-tool { display: inline-flex; align-items: center; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; background: #fafafa; }
.qty-btn { background: transparent; border: none; width: 32px; height: 32px; cursor: pointer; font-size: 1.1rem; font-weight: 600; color: #4b5563; transition: background 0.15s; }
.qty-btn:hover { background: #e5e7eb; }
.qty-display-text { width: 36px; text-align: center; font-size: 0.95rem; font-weight: 700; color: #111827; user-select: none; }

/* Invoice Calculations Metrics layout styling */
.item-price-actions-column { display: flex; flex-direction: column; align-items: flex-end; text-align: right; min-width: 100px; }
.item-total-price { font-size: 1.15rem; font-weight: 700; color: #111827; }
.item-unit-price { font-size: 0.78rem; color: #9ca3af; margin-top: 2px; }
.delete-action-btn { background: transparent; border: none; color: #ef4444; font-size: 0.82rem; cursor: pointer; margin-top: 14px; font-weight: 500; padding: 0; }
.delete-action-btn:hover { text-decoration: underline; }

.clear-basket-link { background: transparent; border: none; color: #9ca3af; font-size: 0.88rem; cursor: pointer; align-self: flex-start; margin-top: 4px; }
.clear-basket-link:hover { color: #ef4444; text-decoration: underline; }

/* SIDEBAR CARD BOX CONFIGURATIONS */
.cart-summary-sidebar { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
.cart-summary-sidebar h3 { margin: 0 0 16px 0; font-size: 1.25rem; font-weight: 600; }
.summary-divider { height: 1px; background: #e5e7eb; margin: 16px 0; }
.summary-line { display: flex; justify-content: space-between; font-size: 0.95rem; color: #4b5563; margin-bottom: 12px; }
.free-shipping-tag { color: #10b981; font-weight: 700; background: #e0f2fe; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; }
.total-bill-row { font-size: 1.25rem !important; font-weight: 800; color: #111827; margin: 8px 0; }
.disclaimer-note { font-size: 0.78rem; color: #9ca3af; margin: 20px 0; line-height: 1.5; background: #f9fafb; padding: 10px; border-radius: 6px; }

.checkout-submit-btn { display: block; text-align: center; text-decoration: none; background: #10b981; color: white; padding: 14px; border-radius: 8px; font-weight: 700; font-size: 1rem; transition: background 0.2s; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); }
.checkout-submit-btn:hover { background: #059669; }

/* Loading State Animations CSS code */
.spinner { width: 30px; height: 30px; border: 3px solid #e5e7eb; border-top-color: #10b981; border-radius: 50%; animation: spin 1s infinite linear; margin: 0 auto 12px auto; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* 📱 RESPONSIVE MEDIA QUERIES DETECTOR PACK */
@media (max-width: 768px) {
  .cart-split-layout { grid-template-columns: 1fr; }
  .cart-page-wrapper { padding: 30px 12px; }
  .cart-item-row { flex-wrap: wrap; }
  .item-price-actions-column { flex-direction: row; width: 100%; justify-content: space-between; align-items: center; border-top: 1px dashed #e5e7eb; margin-top: 10px; padding-top: 10px; }
  .delete-action-btn { margin-top: 0; }
}
</style>
