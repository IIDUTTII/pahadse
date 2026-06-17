<script setup>
import { ref, computed, onMounted }  from 'vue'
import { db, auth }                  from '../firebase.js'
import { onAuthStateChanged }        from 'firebase/auth'
import { doc, onSnapshot }           from 'firebase/firestore'
import { saveCartItems, fetchCoupons, fetchShippingConfig } from './db.js'

defineOptions({ name: 'CartView' })

const cartItems = ref([]), loading = ref(true), currentUser = ref(null)
const promoCode = ref(''), promoApplied = ref(false), promoError = ref('')
const activeCoupons = ref([]), appliedCoupon = ref(null)
const shippingConfig = ref({ fee: 60, freeThreshold: 499, isFreeShippingActive: true })

onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    currentUser.value = user
    if (user) {
      onSnapshot(doc(db, 'carts', user.uid), (snap) => {
        cartItems.value = snap.exists() ? (snap.data().items ?? []) : []
        loading.value = false
      })
      try {
        activeCoupons.value = await fetchCoupons()
        const shipCfg = await fetchShippingConfig()
        if (shipCfg) shippingConfig.value = shipCfg
      } catch (err) { console.warn("Failed retrieving dynamic promotion matrices.") }
    } else { loading.value = false }
  })
})

const subtotal = computed(() => cartItems.value.reduce((s, i) => s + i.price * i.quantity, 0))
const totalItemCount = computed(() => cartItems.value.reduce((s, i) => s + i.quantity, 0))

const discountAmount = computed(() => {
  if (!promoApplied.value || !appliedCoupon.value) return 0
  if (appliedCoupon.value.type === 'percent') return Math.round(subtotal.value * (appliedCoupon.value.discount / 100))
  return Math.min(subtotal.value, appliedCoupon.value.discount)
})

const shippingCost = computed(() => {
  if (subtotal.value === 0) return 0
  if (shippingConfig.value.isFreeShippingActive && subtotal.value >= shippingConfig.value.freeThreshold) return 0
  return Number(shippingConfig.value.fee) || 0
})

const grandTotal = computed(() => Math.max(subtotal.value - discountAmount.value + shippingCost.value, 0))
const progressToFree = computed(() => {
  if (!shippingConfig.value.isFreeShippingActive) return 0
  return Math.min((subtotal.value / shippingConfig.value.freeThreshold) * 100, 100)
})
const amountNeeded = computed(() => Math.max(shippingConfig.value.freeThreshold - subtotal.value, 0))

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
const updateItemNote = (idx, noteText) => {
  const updated = [...cartItems.value]
  updated[idx] = { ...updated[idx], note: noteText }
  pushUpdate(updated)
}

const applyVoucher = () => {
  promoError.value = ''; promoApplied.value = false; appliedCoupon.value = null
  const code = promoCode.value.trim().toUpperCase()
  const verifiedCoupon = activeCoupons.value.find(c => c.code === code && c.active)

  if (!verifiedCoupon) { promoError.value = "Invalid or inactive mountain batch voucher."; return }
  if (verifiedCoupon.expiresAt && Date.now() > verifiedCoupon.expiresAt) { promoError.value = "This promotion window has expired."; return }
  if (subtotal.value < verifiedCoupon.minOrderAmount) { promoError.value = `Add ₹${verifiedCoupon.minOrderAmount - subtotal.value} more to unlock this code.`; return }
  if (totalItemCount.value < verifiedCoupon.minItems) { promoError.value = `You need at least ${verifiedCoupon.minItems} items allocated to use this voucher.`; return }

  appliedCoupon.value = verifiedCoupon; promoApplied.value = true
  window.sessionStorage.setItem('active_promo_discount', discountAmount.value)
  window.sessionStorage.setItem('active_promo_code', verifiedCoupon.code)
}

const clearVoucher = () => {
  promoCode.value = ''; promoApplied.value = false; appliedCoupon.value = null; promoError.value = ''
  window.sessionStorage.removeItem('active_promo_discount')
  window.sessionStorage.removeItem('active_promo_code')
}
</script>

<template>
  <div class="cart-page-wrapper">
    <div class="cart-container">

      <header class="cart-header">
        <h1>Your Mountain Basket</h1>
        <p v-if="cartItems.length > 0">{{ cartItems.length }} pure high-altitude provision{{ cartItems.length > 1 ? 's' : '' }} reserved.</p>
      </header>

      <div v-if="loading" class="cart-state-card"><div class="spinner"></div><p>Gathering your basket…</p></div>
      <div v-else-if="!currentUser" class="cart-state-card isolated-auth"><span class="state-glyph">🔒</span><h3>Authorization Required</h3><p>Please log in to view cart.</p><router-link to="/login" class="shop-btn">Go to Login</router-link></div>
      <div v-else-if="cartItems.length === 0" class="cart-state-card isolated-auth"><span class="state-glyph">🍯</span><h3>Your basket is empty</h3><p>Add pure Himalayan goods to initialize checkout.</p><router-link to="/" class="shop-btn">Browse Products</router-link></div>

      <div v-else class="cart-split-layout fade-in">
        <main class="cart-main-list">
          <div v-if="shippingConfig.isFreeShippingActive" class="shipping-tracker-card">
            <p v-if="subtotal < shippingConfig.freeThreshold">Add <strong>₹{{ amountNeeded }}</strong> more to unlock <strong>FREE Shipping!</strong></p>
            <p v-else>🎉 Mubarak ho! You have unlocked <strong>Free Mountain Delivery!</strong></p>
            <div class="progress-bar-container"><div class="progress-fill" :style="{ width: progressToFree + '%' }"></div></div>
          </div>

          <div class="cart-items-wrapper">
            <div v-for="(item, idx) in cartItems" :key="idx" class="cart-item-card">
              
              <router-link :to="`/product/${item.slug || 'product'}--${item.productId}`" class="item-img-link">
                <img v-if="item.imageUrl" :src="item.imageUrl" class="item-visual-img" />
                <span v-else class="item-emoji">{{ item.emoji || '📦' }}</span>
              </router-link>
              
              <div class="item-core-details">
                <div class="item-title-row">
                  <div>
                    <router-link :to="`/product/${item.slug || 'product'}--${item.productId}`" class="item-title-link">
                      {{ item.name }}
                    </router-link>
                    <p class="item-variant-tag">{{ item.variant || item.weight || 'Standard Spec' }}</p>
                  </div>
                  <div class="item-price-display">
                    <strong>₹{{ item.price * item.quantity }}</strong>
                    <span v-if="item.quantity > 1" class="unit-price">(₹{{ item.price }} / unit)</span>
                  </div>
                </div>

                <div class="item-actions-row">
                  <div class="quantity-pill">
                    <button class="qty-btn" @click="decreaseQty(idx)">−</button>
                    <span class="qty-val">{{ item.quantity }}</span>
                    <button class="qty-btn" @click="increaseQty(idx)">+</button>
                  </div>
                  
                  <div class="item-note-box">
                    <input :value="item.note || ''" @change="updateItemNote(idx, $event.target.value)" placeholder="✍️ Add packaging note..." class="note-input" />
                  </div>

                  <button class="delete-btn" @click="removeItem(idx)" title="Remove Item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button class="clear-basket-link" @click="clearEntireCart">Empty Entire Basket</button>
        </main>

        <aside class="cart-summary-sidebar">
          <h3>Order Summary</h3>
          <div class="summary-line"><span>Basket Subtotal</span><span>₹{{ subtotal }}</span></div>
          <div v-if="promoApplied" class="summary-line text-green"><span>{{ appliedCoupon.code }} ({{ appliedCoupon.type === 'percent' ? appliedCoupon.discount + '%' : '₹' + appliedCoupon.discount }})</span><span>-₹{{ discountAmount }}</span></div>
          <div class="summary-line"><span>Mountain Shipping</span><span v-if="shippingCost === 0" class="free-shipping-tag">FREE</span><span v-else>₹{{ shippingCost }}</span></div>

          <div class="promo-coupon-box">
            <div class="promo-input-row">
              <input v-model="promoCode" placeholder="Promo Code..." :disabled="promoApplied" class="promo-input" />
              <button v-if="!promoApplied" @click="applyVoucher" class="promo-btn">Apply</button>
              <button v-else @click="clearVoucher" class="promo-btn clear-promo">✕</button>
            </div>
            <p v-if="promoError" class="promo-error">{{ promoError }}</p>
            <p v-if="promoApplied" class="promo-success">✓ Discount applied successfully.</p>
          </div>

          <div class="summary-divider"></div>
          <div class="summary-line total-bill-row"><span>Grand Total</span><span>₹{{ grandTotal }}</span></div>
          
          <router-link to="/checkout" class="checkout-submit-btn">Proceed to Checkout 🚀</router-link>
          <p class="disclaimer-note">🏔️ Gathered and packaged directly at our hubs in Mandi and Kullu.</p>
        </aside>

      </div>
    </div>
  </div>
</template>

<style scoped>
.cart-page-wrapper { background: #FAFAF8; min-height: 100vh; padding: 130px 20px 80px; font-family: 'Jost', sans-serif; color: #111827; }
.cart-container { max-width: 1140px; margin: 0 auto; }
.cart-header { text-align: center; margin-bottom: 40px; }
.cart-header h1 { font-family: 'Cinzel', serif; font-size: 2.5rem; font-weight: 800; margin: 0 0 8px; color: #111827; }
.cart-header p { color: #6B7280; margin: 0; font-size: 1.05rem; font-weight: 500; }
.cart-state-card { background: #ffffff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 60px 30px; text-align: center; max-width: 460px; margin: 40px auto; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
.state-glyph { font-size: 3.5rem; display: block; margin-bottom: 16px; }
.cart-state-card h3 { font-family: 'Cinzel', serif; margin: 0 0 10px; font-size: 1.5rem; font-weight: 700; }
.cart-state-card p { color: #6b7280; font-size: 1rem; margin: 0 0 28px; }
.shop-btn { display: inline-block; background: #111827; color: #ffffff; padding: 14px 32px; border-radius: 30px; font-weight: 700; text-decoration: none; text-transform: uppercase; font-size: 0.9rem; transition: 0.2s; }
.shop-btn:hover { background: #16a34a; transform: translateY(-2px); }
.spinner { width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #16a34a; border-radius: 50%; animation: spin 0.85s linear infinite; margin: 0 auto 16px; }
@keyframes spin { to { transform: rotate(360deg); } }

.cart-split-layout { display: grid; grid-template-columns: 1fr 380px; gap: 40px; align-items: start; }
.cart-main-list { display: flex; flex-direction: column; gap: 20px; }

.shipping-tracker-card { background: #ffffff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 18px 24px; font-size: 0.95rem; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
.shipping-tracker-card p { margin: 0 0 12px; color: #374151; }
.progress-bar-container { background: #F3F4F6; height: 8px; border-radius: 999px; overflow: hidden; }
.progress-fill { background: #16a34a; height: 100%; transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1); }

.cart-items-wrapper { display: flex; flex-direction: column; gap: 16px; }
.cart-item-card { background: #ffffff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 20px; display: flex; align-items: stretch; gap: 24px; transition: 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.01); }
.cart-item-card:hover { border-color: #D1D5DB; box-shadow: 0 8px 24px rgba(0,0,0,0.04); }

.item-img-link { width: 100px; height: 100px; border-radius: 12px; background: #F9FAFB; border: 1px solid #F3F4F6; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; text-decoration: none; transition: 0.2s; }
.item-img-link:hover { opacity: 0.9; transform: scale(1.02); }
.item-visual-img { width: 100%; height: 100%; object-fit: cover; }
.item-emoji { font-size: 2.5rem; }

.item-core-details { flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 16px; }
.item-title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.item-title-link { font-size: 1.2rem; font-weight: 800; color: #111827; text-decoration: none; transition: 0.2s; display: inline-block; margin-bottom: 4px; }
.item-title-link:hover { color: #16a34a; text-decoration: underline; }

.item-variant-tag { margin: 0; font-size: 0.85rem; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: #F3F4F6; display: inline-block; padding: 2px 8px; border-radius: 4px;}

.item-price-display { text-align: right; display: flex; flex-direction: column; align-items: flex-end; }
.item-price-display strong { font-size: 1.25rem; font-weight: 900; color: #111827; }
.unit-price { font-size: 0.8rem; color: #9CA3AF; margin-top: 2px; font-weight: 500; }

.item-actions-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.quantity-pill { display: flex; align-items: center; background: #F3F4F6; border-radius: 30px; border: 1px solid #E5E7EB; }
.qty-btn { background: transparent; border: none; width: 34px; height: 34px; font-size: 1.1rem; font-weight: 700; color: #374151; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; border-radius: 50%; }
.qty-btn:hover { background: #E5E7EB; color: #111827; }
.qty-val { width: 30px; text-align: center; font-size: 0.95rem; font-weight: 800; color: #111827; }

.item-note-box { flex: 1; min-width: 150px; }
.note-input { width: 100%; padding: 8px 14px; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 0.85rem; font-family: inherit; color: #374151; outline: none; background: #F9FAFB; transition: 0.2s; box-sizing: border-box; }
.note-input:focus { border-color: #111827; background: #ffffff; }

.delete-btn { background: transparent; border: none; color: #9CA3AF; cursor: pointer; padding: 6px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.delete-btn:hover { background: #FEF2F2; color: #DC2626; }

.clear-basket-link { align-self: flex-start; background: transparent; border: none; color: #6B7280; font-size: 0.9rem; font-weight: 700; cursor: pointer; margin-top: 8px; padding: 8px 16px; border-radius: 8px; transition: 0.2s; }
.clear-basket-link:hover { background: #F3F4F6; color: #111827; }

.cart-summary-sidebar { background: #ffffff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); position: sticky; top: 110px; }
.cart-summary-sidebar h3 { margin: 0 0 24px; font-family: 'Cinzel', serif; font-size: 1.4rem; font-weight: 800; color: #111827; }
.summary-line { display: flex; justify-content: space-between; font-size: 1rem; color: #4B5563; margin-bottom: 16px; font-weight: 500; }
.text-green { color: #16a34a !important; font-weight: 700; }
.free-shipping-tag { color: #16a34a; font-weight: 800; background: #F0FDF4; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; border: 1px solid #BBF7D0; }

.promo-coupon-box { margin: 24px 0; }
.promo-input-row { display: flex; gap: 8px; }
.promo-input { flex: 1; padding: 12px 14px; border: 1px solid #E5E7EB; border-radius: 8px; font-family: inherit; font-size: 0.9rem; outline: none; background: #F9FAFB; }
.promo-input:focus { border-color: #111827; background: #ffffff; }
.promo-btn { padding: 0 20px; background: #111827; color: #ffffff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.2s; }
.promo-btn:hover:not(:disabled) { background: #16a34a; }
.promo-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.clear-promo { background: #F3F4F6; color: #374151; }
.clear-promo:hover { background: #FEE2E2; color: #DC2626; }
.promo-error { margin: 8px 0 0; font-size: 0.85rem; color: #dc2626; font-weight: 600; }
.promo-success { margin: 8px 0 0; font-size: 0.85rem; color: #16a34a; font-weight: 700; }

.summary-divider { height: 1px; background: #E5E7EB; margin: 24px 0; }
.total-bill-row { font-size: 1.5rem !important; font-weight: 900; color: #111827; margin: 0 0 24px; align-items: center; }
.checkout-submit-btn { display: block; text-align: center; text-decoration: none; background: #111827; color: #ffffff; padding: 18px; border-radius: 12px; font-weight: 800; font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.5px; transition: 0.2s; box-shadow: 0 4px 12px rgba(17, 24, 39, 0.15); }
.checkout-submit-btn:hover { background: #16a34a; box-shadow: 0 6px 16px rgba(22, 163, 74, 0.25); transform: translateY(-2px); }
.disclaimer-note { font-size: 0.85rem; color: #6B7280; margin: 24px 0 0; line-height: 1.5; text-align: center; font-weight: 500; }

.fade-in { animation: fIn 0.3s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

@media (max-width: 960px) {
  .cart-split-layout { grid-template-columns: 1fr; gap: 32px; }
  .cart-summary-sidebar { position: static; }
}
@media (max-width: 640px) {
  .cart-page-wrapper { padding: 100px 16px 80px; }
  .cart-item-card { flex-direction: column; gap: 16px; position: relative; }
  .item-img-link { width: 80px; height: 80px; }
  .item-title-row { flex-direction: column; gap: 8px; }
  .item-price-display { align-items: flex-start; text-align: left; }
  .item-actions-row { justify-content: space-between; margin-top: 8px; border-top: 1px dashed #E5E7EB; padding-top: 16px; }
  .item-note-box { order: 3; width: 100%; min-width: 100%; }
}
</style>