<script setup>
/**
 * ProductDetail.vue
 * Features: Fluid ultra-wide layout, premium borders, modern font stack, 
 * dynamic review module, and optimized thumbnail gallery engine.
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter }      from 'vue-router'
import {
  fetchProductById,
  logProductView,
  addProductToCart,
  isProductInCart,
  fetchProductReviews,
  addProductReview
} from './db.js'

defineOptions({ name: 'ProductDetail' })

const route  = useRoute()
const router = useRouter()

const product       = ref(null)
const loading       = ref(true)
const notFound      = ref(false)
const adding        = ref(false)
const alreadyInCart = ref(false)

// ── 🖼️ GALLERY PANEL STATE ──
const activeIdx   = ref(0)
const brokenUrls  = ref(new Set())

// ── 🏷️ INFORMATION TAB STATE ──
const activeDetailTab = ref('description')

// ── ⭐️ LIVE REVIEWS PANEL STATE ──
const reviewsList  = ref([])
const newRating    = ref(5)
const newComment   = ref('')
const submitting   = ref(false)

const cleanImages = computed(() => {
  return (product.value?.imageUrls || []).filter(u => u && u.trim() !== '' && !brokenUrls.value.has(u))
})

watch(cleanImages, (newList) => {
  if (newList.length === 0) activeIdx.value = 0
  else if (activeIdx.value >= newList.length) activeIdx.value = 0
})

function markAsBroken(url) {
  if (!url) return
  brokenUrls.value = new Set([...brokenUrls.value, url])
  activeIdx.value = 0
}

onMounted(async () => {
  const id = route.params.id
  try {
    product.value = await fetchProductById(id)
    if (!product.value) { notFound.value = true; return }
    alreadyInCart.value = await isProductInCart(id)
    
    // Pull product reviews array snapshot from db.js
    reviewsList.value = await fetchProductReviews(id)
    
    logProductView(id)
  } catch (e) {
    console.error('ProductDetail initialization failure:', e)
    notFound.value = true
  } finally {
    loading.value = false
  }
})

const hasDiscount  = computed(() => product.value?.discount?.isDiscounted && product.value?.discount?.percent > 0)
const isOutOfStock = computed(() => product.value?.stock === 0)
const finalPrice   = computed(() => {
  if (!product.value) return 0
  return hasDiscount.value
    ? Math.round(product.value.price * (1 - product.value.discount.percent / 100))
    : product.value.price
})

async function handleAddToCart() {
  if (alreadyInCart.value) { router.push('/cart'); return }
  if (adding.value || isOutOfStock.value) return

  adding.value = true
  try {
    await addProductToCart(product.value, finalPrice.value)
    alreadyInCart.value = true
  } catch (err) {
    alert(err.message === 'NOT_LOGGED_IN' ? 'Please log in first to add items to your cart!' : 'Error: ' + err.message)
  } finally {
    adding.value = false
  }
}

async function handleReviewSubmit() {
  if (!newComment.value.trim()) return
  submitting.value = true
  try {
    await addProductReview(product.value.id, newRating.value, newComment.value)
    // Dynamic hot re-pull without reloading page
    reviewsList.value = await fetchProductReviews(product.value.id)
    newComment.value = ''
    newRating.value = 5
    alert('Thank you! Your feedback has been published securely.')
  } catch (err) {
    alert(err.message === 'NOT_LOGGED_IN' ? 'Log in required to submit customer reviews.' : err.message)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page">
    
    <div class="breadcrumb-container">
      <button class="back-link-action" @click="router.back()">← Return to Harvests</button>
    </div>

    <div v-if="loading" class="center-state">
      <div class="spinner"></div>
      <p>Synchronizing organic item metrics…</p>
    </div>

    <div v-else-if="notFound" class="center-state text-404">
      <span class="state-icon">🏔️</span>
      <h3>Harvest Identity Missing</h3>
      <button class="go-home-btn" @click="router.push('/')">Return to Marketplace</button>
    </div>

    <div v-else-if="product" class="product-viewport-container">
      
      <div class="rosier-top-split-grid">
        
        <div class="rosier-gallery-pane">
          <div class="gallery-sticky-wrapper">
            
            <div v-if="cleanImages.length > 1" class="rosier-side-strip-tray">
              <div
                v-for="(url, idx) in cleanImages"
                :key="url"
                :class="['strip-thumb-card', { 'is-active': activeIdx === idx }]"
                @click="activeIdx = idx"
              >
                <img :src="url" @error="markAsBroken(url)" alt="thumb" />
              </div>
            </div>

            <div class="rosier-focused-display-box">
              <div v-if="hasDiscount" class="promo-sale-ribbon">{{ product.discount.percent }}% OFF</div>
              <div v-if="isOutOfStock" class="promo-sale-ribbon stockout">Out of Stock</div>

              <div class="focused-image-aspect" v-if="cleanImages.length > 0">
                <img
                  :src="cleanImages[activeIdx] || cleanImages[0]"
                  :alt="product.name"
                  @error="markAsBroken(cleanImages[activeIdx])"
                  class="primary-focused-image"
                />
              </div>
              <div v-else class="emoji-centered-fallback">
                <span class="giant-emoji-glyph">{{ product.emoji || '🍯' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="rosier-quick-buy-pane">
          <span class="category-meta-header">{{ product.category || 'HIMALAYAN HARVEST' }}</span>
          <h1 class="rosier-item-title">{{ product.name }}</h1>

          <div v-if="product.reviewCount > 0" class="rosier-stars-rating-row">
            <span class="stars-badge">★ {{ product.ratingAverage?.toFixed(1) }}</span>
            <span class="review-aggregate-count">({{ product.reviewCount }} verified marketplace responses)</span>
          </div>

          <div class="rosier-pricing-block">
            <span class="current-price">₹{{ finalPrice }}</span>
            <span v-if="hasDiscount" class="struck-slashed-price">₹{{ product.price }}</span>
            <span v-if="hasDiscount" class="savings-pill-alert">Saved ₹{{ product.price - finalPrice }}</span>
          </div>

          <div class="rosier-micro-metadata-tray">
            <span v-if="product.weight" class="metadata-tray-pill">Net Weight: <strong>{{ product.weight }}</strong></span>
            <span v-if="product.shelfLife" class="metadata-tray-pill">Shelf Life: <strong>{{ product.shelfLife }}</strong></span>
            <span v-if="product.origin" class="metadata-tray-pill">Origin: <strong>{{ product.origin }}</strong></span>
          </div>

          <div class="rosier-cart-transactional-card">
            <div class="stock-availability-bar">
              <span v-if="isOutOfStock" class="stock-txt dynamic-out">✕ Allocation Exhausted</span>
              <span v-else-if="product.stock <= 5" class="stock-txt dynamic-low">⚠️ Only {{ product.stock }} units remain</span>
              <span v-else class="stock-txt dynamic-good">✓ Fresh Batch Available for Dispatch</span>
            </div>

            <div class="transactional-cta-stack">
              <button
                class="rosier-primary-cta"
                :disabled="isOutOfStock && !alreadyInCart"
                :class="{ 'is-disabled': isOutOfStock, 'is-in-cart': alreadyInCart && !isOutOfStock }"
                @click="handleAddToCart"
              >
                <span v-if="adding">Processing...</span>
                <span v-else-if="isOutOfStock">Sold Out</span>
                <span v-else-if="alreadyInCart">View Shopping Cart →</span>
                <span v-else>Add to Cart</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      <div class="product-rich-details-section">
        <div class="rich-tabs-bar">
          <button :class="['rich-tab-nav-btn', { 'is-active': activeDetailTab === 'description' }]" @click="activeDetailTab = 'description'">Product Description</button>
          <button v-if="product.benefits?.length" :class="['rich-tab-nav-btn', { 'is-active': activeDetailTab === 'benefits' }]" @click="activeDetailTab = 'benefits'">Key Benefits</button>
          <button v-if="product.ingredients?.length" :class="['rich-tab-nav-btn', { 'is-active': activeDetailTab === 'nutrition' }]" @click="activeDetailTab = 'nutrition'">Ingredients Info</button>
          <button :class="['rich-tab-nav-btn', { 'is-active': activeDetailTab === 'info' }]" @click="activeDetailTab = 'info'">Product Specifications</button>
        </div>

        <div class="rich-tabs-content-body">
          <div v-show="activeDetailTab === 'description'" class="tab-fade-panel">
            <p class="paragraph-text">{{ product.description || "A2 Gir Cow Ghee is made using fresh Gir cow milk. The Cows are free-grazed. The milk from them is brought to a boil and naturally cooled down to room temperature and inoculated with a natural starter culture and left overnight to make curd. The curd is churned using the traditional 'Bilona method'." }}</p>
          </div>

          <div v-show="activeDetailTab === 'benefits'" class="tab-fade-panel">
            <ul class="premium-bullets-stack" v-if="product.benefits?.length">
              <li v-for="benefit in product.benefits" :key="benefit">{{ benefit }}</li>
            </ul>
          </div>

          <div v-show="activeDetailTab === 'nutrition'" class="tab-fade-panel">
            <div class="ingredients-flex-tray" v-if="product.ingredients?.length">
              <span v-for="ing in product.ingredients" :key="ing" class="ing-node-pill">{{ ing }}</span>
            </div>
          </div>

          <div v-show="activeDetailTab === 'info'" class="tab-fade-panel">
            <table class="minimalist-spec-table">
              <tbody>
                <tr v-if="product.origin"><td>Regional Origin</td><td>{{ product.origin }}</td></tr>
                <tr v-if="product.shelfLife"><td>Guaranteed Expiry</td><td>{{ product.shelfLife }}</td></tr>
                <tr v-if="product.weight"><td>Net Quantity Metric</td><td>{{ product.weight }}</td></tr>
                <tr v-if="product.howToUse"><td>Directions for Consumption</td><td>{{ product.howToUse }}</td></tr>
                <tr v-if="product.category"><td>Product Classification</td><td>{{ product.category }}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="product-reviews-standalone-terminal">
        <h3 class="terminal-headline">Customer Feedbacks & Ratings Matrix</h3>
        
        <div class="reviews-split-viewport">
          
          <div class="submit-review-card-form">
            <h4>Share Your Harvesting Experience</h4>
            <form @submit.prevent="handleReviewSubmit" class="review-inline-form">
              <div class="form-row">
                <label>Assigned Rating Node Score:</label>
                <select v-model="newRating" class="review-select-input">
                  <option :value="5">⭐⭐⭐⭐⭐ (5 / 5 Excellent)</option>
                  <option :value="4">⭐⭐⭐⭐ (4 / 5 Good)</option>
                  <option :value="3">⭐⭐⭐ (3 / 5 Average)</option>
                  <option :value="2">⭐⭐ (2 / 5 Fair)</option>
                  <option :value="1">⭐ (1 / 5 Poor)</option>
                </select>
              </div>
              <div class="form-row flex-column">
                <label>Written Overview Summary Commentary *</label>
                <textarea v-model="newComment" required placeholder="Describe item flavor profiles, textures, alignment with expectations..." class="review-textarea"></textarea>
              </div>
              <button type="submit" class="submit-review-btn" :disabled="submitting">
                {{ submitting ? 'Transmitting Review...' : 'Publish Feedback Snapshot' }}
              </button>
            </form>
          </div>

          <div class="live-reviews-feed-column">
            <div v-if="reviewsList.length === 0" class="empty-reviews-placeholder-state">
              <div class="placeholder-icon">📋</div>
              <h5>No Reviews Logged Yet</h5>
              <p>Be the first system actor to commit a feedback entry for this item ledger document mapping.</p>
            </div>
            
            <div v-else class="scrollable-reviews-stack">
              <div v-for="review in reviewsList" :key="review.id" class="individual-review-row-card">
                <div class="review-row-header">
                  <span class="user-id-badge">👤 Account: {{ review.userId?.substring(0, 8) || 'User' }}...</span>
                  <span class="star-rating-score">
                    <span v-for="star in review.rating" :key="star">⭐</span>
                  </span>
                </div>
                <p class="review-commentary-paragraph">"{{ review.comment }}"</p>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>

    <nav class="mobile-bottom-nav">
      <router-link to="/"         class="mob-item"><span>🏠</span><span>Home</span></router-link>
      <router-link to="/policies" class="mob-item"><span>🛍️</span><span>Shop</span></router-link>
      <router-link to="/cart"     class="mob-item"><span>🛒</span><span>Cart</span></router-link>
      <router-link to="/user"     class="mob-item"><span>👤</span><span>Profile</span></router-link>
    </nav>

  </div>
</template>

<style scoped>
/* 🏔️ FULLY FLUID ULTRA-WIDE TYPOGRAPHY ARCHITECTURE STYLE */

.page {
  padding: 90px 2% 120px; /* Reduced side padding to pull layout outwards */
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; /* Upgraded text font */
  min-height: 100vh;
  background-color: #FAF6F0; 
  color: #111827;
}

.breadcrumb-container { max-width: 98%; margin: 0 auto 24px; }
.back-link-action { background: none; border: none; color: #6b7280; font-weight: 700; font-size: 0.95rem; cursor: pointer; padding: 0; }
.back-link-action:hover { color: #16a34a; }

.center-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 50vh; gap: 16px; }
.spinner { width: 44px; height: 44px; border: 3px solid #e5e7eb; border-top-color: #16a34a; border-radius: 50%; animation: spin 0.85s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* 1st: SCREEN FULLY FILLED CONTAINER */
.product-viewport-container {
  width: 100%;
  max-width: 96%; /* Fluid scaling across ultra-widescreens */
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 40px; 
}

/* ── ROSIER FULL WIDESCREEN GRID ── */
.rosier-top-split-grid {
  display: grid;
  grid-template-columns: 52% 48%; /* 2nd: Expanded space allocation for left image canvas */
  gap: 60px; /* Big explicit spacing gap between image and right side info box */
  align-items: start;
  width: 100%;
}

.gallery-sticky-wrapper {
  position: sticky;
  top: 100px;
  display: flex;
  gap: 24px;
}

/* 2nd: INCREASED SIZE OF THUMBNAIL STRIPS WITH CRISP BORDERS */
.rosier-side-strip-tray { display: flex; flex-direction: column; gap: 14px; width: 90px; flex-shrink: 0; }
.strip-thumb-card { 
  width: 84px; 
  height: 84px; 
  border-radius: 8px; 
  border: 2px solid #111827; /* Dark ultra-crisp border line */
  background-color: #ffffff; 
  overflow: hidden; 
  cursor: pointer; 
  padding: 2px; 
  box-sizing: border-box; 
}
.strip-thumb-card img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; }
.strip-thumb-card.is-active { border-color: #16a34a; box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.2); }

/* 2nd: MAXIMIZED MAIN FOCUS WINDOW WITH THICK BORDER LINES */
.rosier-focused-display-box { 
  flex: 1; 
  aspect-ratio: 1; 
  background-color: #ffffff; 
  border-radius: 14px; 
  overflow: hidden; 
  border: 3px solid #111827; /* Heavy contrast crisp product outline frame */
  position: relative; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
}
.focused-image-aspect { width: 100%; height: 100%; }
.primary-focused-image { width: 100%; height: 100%; object-fit: cover; }
.emoji-centered-fallback { text-align: center; }
.giant-emoji-glyph { font-size: 9rem; }

.promo-sale-ribbon { position: absolute; top: 16px; left: 16px; z-index: 5; background-color: #16a34a; color: #ffffff; font-size: 0.75rem; font-weight: 800; padding: 6px 14px; border-radius: 4px; text-transform: uppercase; }
.promo-sale-ribbon.stockout { background-color: #374151; }

/* INFO BUY OPTIONS PANEL */
.rosier-quick-buy-pane { display: flex; flex-direction: column; padding-top: 10px; }
.category-meta-header { font-size: 0.8rem; font-weight: 800; color: #16a34a; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; display: block; }
.rosier-item-title { font-size: 2.5rem; font-weight: 900; color: #111827; margin: 0 0 16px; line-height: 1.2; letter-spacing: -0.5px; }

.rosier-stars-rating-row { display: flex; align-items: center; gap: 8px; margin-bottom: 18px; }
.stars-badge { font-size: 0.9rem; color: #9a3412; font-weight: 800; background-color: #ffedd5; padding: 4px 10px; border-radius: 6px; }
.review-aggregate-count { font-size: 0.9rem; color: #4b5563; font-weight: 500; }

.rosier-pricing-block { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.current-price { font-size: 2.8rem; font-weight: 900; color: #111827; }
.struck-slashed-price { font-size: 1.5rem; color: #9ca3af; text-decoration: line-through; }
.savings-pill-alert { background-color: #dcfce7; color: #16a34a; font-size: 0.85rem; font-weight: 800; padding: 4px 14px; border-radius: 30px; }

.rosier-micro-metadata-tray { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
.metadata-tray-pill { font-size: 0.88rem; color: #1f2937; background-color: #f3f4f6; padding: 8px 16px; border-radius: 8px; border: 2px solid #e5e7eb; font-weight: 500; }

.rosier-cart-transactional-card { background-color: #ffffff; border: 2px solid #111827; border-radius: 12px; padding: 24px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
.stock-availability-bar { margin-bottom: 16px; }
.stock-txt { font-size: 0.9rem; font-weight: 800; }
.stock-txt.dynamic-good { color: #16a34a; }
.stock-txt.dynamic-low { color: #ea580c; }
.stock-txt.dynamic-out { color: #6b7280; }

.rosier-primary-cta { width: 100%; padding: 18px; background-color: #111827; color: #FAF6F0; border: none; border-radius: 30px; font-size: 1rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; transition: 0.2s; }
.rosier-primary-cta:hover:not(:disabled) { background-color: #16a34a; }
.rosier-primary-cta.is-in-cart { background-color: #ca8a04; }
.rosier-primary-cta.is-disabled { background-color: #e5e7eb; color: #9ca3af; cursor: not-allowed; }

/* ── MIDDLE SECTION DESCRIPTION TABS ── */
.product-rich-details-section {
  width: 100%; background: #ffffff; border: 2px solid #111827; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.02);
}
.rich-tabs-bar { display: flex; background-color: #f9fafb; border-bottom: 2px solid #111827; overflow-x: auto; }
.rich-tab-nav-btn {
  flex: 1; min-width: 160px; padding: 20px 24px; background: transparent; border: none; font-size: 1rem; font-weight: 800; color: #4b5563; cursor: pointer; text-align: center; border-bottom: 3px solid transparent; transition: all 0.2s ease;
}
.rich-tab-nav-btn:hover { background-color: #f3f4f6; color: #111827; }
.rich-tab-nav-btn.is-active { color: #16a34a; border-bottom-color: #16a34a; background-color: #ffffff; }
.rich-tabs-content-body { padding: 40px; background-color: #ffffff; }
.tab-fade-panel { animation: fadeIn 0.2s ease-out; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.paragraph-text { font-size: 1.05rem; color: #374151; line-height: 1.8; margin: 0; font-weight: 400; }

.premium-bullets-stack { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.premium-bullets-stack li { font-size: 1.05rem; color: #374151; position: relative; padding-left: 24px; line-height: 1.6; font-weight: 500; }
.premium-bullets-stack li::before { content: "✦"; position: absolute; left: 0; color: #16a34a; font-size: 0.9rem; }
.ingredients-flex-tray { display: flex; flex-wrap: wrap; gap: 10px; }
.ing-node-pill { background-color: #f3f4f6; border: 2px solid #e5e7eb; padding: 8px 20px; font-size: 0.95rem; border-radius: 20px; font-weight: 600; color: #111827; }

.minimalist-spec-table { width: 100%; border-collapse: collapse; }
.minimalist-spec-table td { padding: 16px 20px; border-bottom: 1px solid #e5e7eb; font-size: 1rem; }
.minimalist-spec-table tr:last-child td { border-bottom: none; }
.minimalist-spec-table td:first-child { font-weight: 800; color: #4b5563; width: 30%; background-color: #f9fafb; border-right: 1px solid #e5e7eb; }
.minimalist-spec-table td:last-child { color: #111827; font-weight: 500; padding-left: 32px; }

/* ================================================================= */
/* ⭐️ 4th: STANDALONE CLIENT REVIEWS STRUCTURAL INTERFACE             */
/* ================================================================= */
.product-reviews-standalone-terminal {
  width: 100%;
  background: #ffffff;
  border: 2px solid #111827;
  border-radius: 12px;
  padding: 40px;
  box-sizing: border-box;
}

.terminal-headline {
  font-size: 1.5rem; font-weight: 900; color: #111827; margin: 0 0 32px 0; border-bottom: 2px solid #111827; padding-bottom: 12px; text-transform: uppercase; letter-spacing: -0.5px;
}

.reviews-split-viewport {
  display: grid;
  grid-template-columns: 42% 58%;
  gap: 48px;
  align-items: start;
}

.submit-review-card-form {
  background-color: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  padding: 24px;
}
.submit-review-card-form h4 { margin: 0 0 20px 0; font-size: 1.15rem; font-weight: 800; color: #111827; }

.review-inline-form { display: flex; flex-direction: column; gap: 18px; }
.form-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.form-row.flex-column { flex-direction: column; align-items: flex-start; }
.form-row label { font-size: 0.9rem; font-weight: 700; color: #374151; }

.review-select-input, .review-textarea {
  padding: 12px; border: 2px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; font-family: inherit; background-color: #ffffff; box-sizing: border-box; outline: none;
}
.review-select-input { flex: 1; font-weight: 600; cursor: pointer; }
.review-textarea { width: 100%; height: 110px; resize: vertical; margin-top: 4px; }
.review-select-input:focus, .review-textarea:focus { border-color: #16a34a; }

.submit-review-btn {
  background-color: #16a34a; color: #ffffff; border: none; padding: 14px; border-radius: 8px; font-size: 0.95rem; font-weight: 800; cursor: pointer; text-transform: uppercase; transition: background 0.2s;
}
.submit-review-btn:hover { background-color: #15803d; }
.submit-review-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* Live Stack Feed Column */
.live-reviews-feed-column {
  width: 100%;
}
.empty-reviews-placeholder-state {
  text-align: center; padding: 48px 20px; background: #fafafa; border: 2px dashed #cbd5e1; border-radius: 10px; color: #6b7280;
}
.placeholder-icon { font-size: 3rem; margin-bottom: 12px; }
.empty-reviews-placeholder-state h5 { margin: 0 0 6px 0; font-size: 1.1rem; font-weight: 800; color: #111827; }
.empty-reviews-placeholder-state p { margin: 0; font-size: 0.9rem; line-height: 1.5; }

.scrollable-reviews-stack {
  display: flex; flex-direction: column; gap: 16px; max-height: 480px; overflow-y: auto; padding-right: 8px;
}
.scrollable-reviews-stack::-webkit-scrollbar { width: 6px; }
.scrollable-reviews-stack::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 4px; }

.individual-review-row-card {
  background-color: #ffffff; border: 2px solid #e5e7eb; border-radius: 8px; padding: 18px; box-shadow: 0 2px 5px rgba(0,0,0,0.01);
}
.review-row-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.user-id-badge { font-size: 0.8rem; background-color: #f3f4f6; padding: 4px 10px; border-radius: 6px; color: #4b5563; font-weight: 700; font-family: monospace; }
.star-rating-score { font-size: 0.85rem; }
.review-commentary-paragraph { margin: 0; font-size: 0.95rem; color: #374151; line-height: 1.6; font-style: italic; font-weight: 500; }

/* BOTTOM PHONE NAVIGATION TERMINALS */
.mobile-bottom-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: rgba(250, 246, 240, 0.96); backdrop-filter: blur(14px); border-top: 2px solid #cbd5e1; padding: 8px 0; justify-content: space-around; z-index: 200; }
.mob-item { display: flex; flex-direction: column; align-items: center; gap: 3px; text-decoration: none; color: #78716c; font-size: 11px; }
.mob-item span:first-child { font-size: 20px; }
.mob-item.router-link-active { color: #16a34a; font-weight: 700; }

/* RESPONSIVE SUB BREAKPOINTS */
@media (max-width: 1024px) {
  .rosier-top-split-grid { grid-template-columns: 1fr; gap: 32px; }
  .gallery-sticky-wrapper { position: relative; top: 0; }
  .rosier-focused-display-box { max-width: 480px; margin: 0 auto; }
  .reviews-split-viewport { grid-template-columns: 1fr; gap: 32px; }
}
@media (max-width: 767px) {
  .page { padding: 40px 12px 100px; }
  .mobile-bottom-nav { display: flex; }
  .gallery-sticky-wrapper { flex-direction: column-reverse; gap: 12px; }
  .rosier-side-strip-tray { flex-direction: row; width: 100%; overflow-x: auto; height: auto; }
  .strip-thumb-card { width: 68px; height: 68px; }
  .rosier-focused-display-box { max-width: 100%; }
  .rich-tab-nav-btn { padding: 16px 12px; font-size: 0.88rem; min-width: 130px; }
  .rich-tabs-content-body { padding: 24px; }
  .minimalist-spec-table td { font-size: 0.9rem; padding: 12px; }
  .minimalist-spec-table td:first-child { width: 40%; }
  .product-reviews-standalone-terminal { padding: 20px; }
}
</style>