<script setup>
/**
 * ProductDetail.vue — Premium Dynamic Item Information Pane
 * ✨ NOW USES UNIVERSAL URL RESOLUTION (Slug--ID) for SEO + Speed
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  fetchProductById, // 👈 CHANGED: Direct ID fetch for maximum speed
  logProductView,
  addProductToCart,
  isProductInCart,
  fetchProductReviews,
  addProductReview
} from './db.js'

defineOptions({ name: 'ProductDetail' })
const route = useRoute(), router = useRouter()

const product = ref(null), loading = ref(true), notFound = ref(false)
const adding = ref(false), alreadyInCart = ref(false)

// ── GALLERY & REVIEW PANEL STATES ──
const activeIdx = ref(0), brokenUrls = ref(new Set())
const activeDetailTab = ref('description')
const reviewsList = ref([]), newRating = ref(5), newComment = ref(''), submitting = ref(false)

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
  // ✨ UNIVERSAL URL LOGIC: Extracts exact ID from the end of the slug
  const rawParam = route.params.id
  const productId = rawParam.includes('--') ? rawParam.split('--').pop() : rawParam

  try {
    // 🚀 Direct O(1) database fetch using exact ID
    product.value = await fetchProductById(productId)
    
    if (!product.value) { notFound.value = true; return }
    
    // Check cart & pull reviews concurrently
    alreadyInCart.value = await isProductInCart(product.value.id)
    reviewsList.value = await fetchProductReviews(product.value.id)
    
    logProductView(product.value.id)
  } catch (e) {
    console.error('ProductDetail synchronization crash:', e)
    notFound.value = true
  } finally {
    loading.value = false
  }
})

const hasDiscount = computed(() => product.value?.discount?.isDiscounted && product.value?.discount?.percent > 0)
const isOutOfStock = computed(() => product.value?.stock === 0)
const finalPrice = computed(() => {
  if (!product.value) return 0
  return hasDiscount.value ? Math.round(product.value.price * (1 - product.value.discount.percent / 100)) : product.value.price
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
  } finally { adding.value = false }
}

async function handleReviewSubmit() {
  if (!newComment.value.trim()) return
  submitting.value = true
  try {
    await addProductReview(product.value.id, newRating.value, newComment.value)
    reviewsList.value = await fetchProductReviews(product.value.id)
    newComment.value = ''; newRating.value = 5
    alert('Thank you! Your feedback has been published securely.')
  } catch (err) {
    alert(err.message === 'NOT_LOGGED_IN' ? 'Log in required to submit customer reviews.' : err.message)
  } finally { submitting.value = false }
}
</script>

<template>
  <div class="page">
    
    <div class="breadcrumb-container">
      <button class="back-link-action" @click="router.push('/')">
        <span class="icon-arrow">←</span> Back to Collection
      </button>
    </div>

    <div v-if="loading" class="center-state"><div class="spinner"></div><p>Gathering fresh mountain produce…</p></div>
    <div v-else-if="notFound" class="center-state text-404"><span class="state-icon">🏔️</span><h3>Product Not Found</h3><p>This harvest might have been moved or removed.</p><button class="go-home-btn" @click="router.push('/')">Return to Shop</button></div>

    <div v-else-if="product" class="product-viewport-container fade-in">
      
      <div class="rosier-top-split-grid">
        
        <div class="rosier-gallery-pane">
          <div class="gallery-sticky-wrapper">
            <div v-if="cleanImages.length > 1" class="rosier-side-strip-tray">
              <div v-for="(url, idx) in cleanImages" :key="url" :class="['strip-thumb-card', { 'is-active': activeIdx === idx }]" @click="activeIdx = idx">
                <img :src="url" @error="markAsBroken(url)" alt="thumb" />
              </div>
            </div>

            <div class="rosier-focused-display-box">
              <div v-if="hasDiscount" class="promo-sale-ribbon">{{ product.discount.percent }}% OFF</div>
              <div v-if="isOutOfStock" class="promo-sale-ribbon stockout">Out of Stock</div>

              <div class="focused-image-aspect" v-if="cleanImages.length > 0">
                <img :src="cleanImages[activeIdx] || cleanImages[0]" :alt="product.name" @error="markAsBroken(cleanImages[activeIdx])" class="primary-focused-image" />
              </div>
              <div v-else class="emoji-centered-fallback"><span class="giant-emoji-glyph">{{ product.emoji || '🍯' }}</span></div>
            </div>
          </div>
        </div>

        <div class="rosier-quick-buy-pane">
          <div class="header-group">
            <span class="category-meta-header">{{ product.category || 'HIMALAYAN HARVEST' }}</span>
            <h1 class="rosier-item-title">{{ product.name }}</h1>
          </div>

          <div v-if="product.reviewCount > 0" class="rosier-stars-rating-row">
            <span class="stars-badge">★ {{ product.ratingAverage?.toFixed(1) }}</span>
            <span class="review-aggregate-count">({{ product.reviewCount }} verified reviews)</span>
          </div>

          <div class="rosier-pricing-block">
            <span class="current-price">₹{{ finalPrice }}</span>
            <div v-if="hasDiscount" class="price-discount-meta">
              <span class="struck-slashed-price">₹{{ product.price }}</span>
              <span class="savings-pill-alert">Save ₹{{ product.price - finalPrice }}</span>
            </div>
          </div>

          <div class="rosier-micro-metadata-tray">
            <div v-if="product.weight" class="metadata-tray-pill"><span class="lbl">Net Weight</span><strong>{{ product.weight }}</strong></div>
            <div v-if="product.shelfLife" class="metadata-tray-pill"><span class="lbl">Shelf Life</span><strong>{{ product.shelfLife }}</strong></div>
            <div v-if="product.origin" class="metadata-tray-pill"><span class="lbl">Origin</span><strong>{{ product.origin }}</strong></div>
          </div>

          <div class="rosier-cart-transactional-card">
            <div class="stock-availability-bar">
              <span v-if="isOutOfStock" class="stock-txt dynamic-out">✕ Currently Unavailable</span>
              <span v-else-if="product.stock <= 5" class="stock-txt dynamic-low">⏳ Hurry, only {{ product.stock }} units left!</span>
              <span v-else class="stock-txt dynamic-good">✓ Freshly stocked & ready to ship</span>
            </div>
            
            <button class="rosier-primary-cta" :disabled="isOutOfStock && !alreadyInCart" :class="{ 'is-disabled': isOutOfStock, 'is-in-cart': alreadyInCart && !isOutOfStock }" @click="handleAddToCart">
              <span v-if="adding">Processing...</span>
              <span v-else-if="isOutOfStock">Sold Out</span>
              <span v-else-if="alreadyInCart">Added! View Cart →</span>
              <span v-else>Add to Cart — ₹{{ finalPrice }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="product-rich-details-section">
        <div class="rich-tabs-bar">
          <button :class="['rich-tab-nav-btn', { 'is-active': activeDetailTab === 'description' }]" @click="activeDetailTab = 'description'">The Story</button>
          <button v-if="product.benefits?.length" :class="['rich-tab-nav-btn', { 'is-active': activeDetailTab === 'benefits' }]" @click="activeDetailTab = 'benefits'">Benefits</button>
          <button v-if="product.ingredients?.length" :class="['rich-tab-nav-btn', { 'is-active': activeDetailTab === 'nutrition' }]" @click="activeDetailTab = 'nutrition'">Ingredients</button>
          <button :class="['rich-tab-nav-btn', { 'is-active': activeDetailTab === 'info' }]" @click="activeDetailTab = 'info'">Details</button>
        </div>

        <div class="rich-tabs-content-body">
          <div v-show="activeDetailTab === 'description'" class="tab-fade-panel"><p class="paragraph-text">{{ product.description }}</p></div>
          <div v-show="activeDetailTab === 'benefits'" class="tab-fade-panel"><ul class="premium-bullets-stack"><li v-for="benefit in product.benefits" :key="benefit">{{ benefit }}</li></ul></div>
          <div v-show="activeDetailTab === 'nutrition'" class="tab-fade-panel"><div class="ingredients-flex-tray"><span v-for="ing in product.ingredients" :key="ing" class="ing-node-pill">{{ ing }}</span></div></div>
          <div v-show="activeDetailTab === 'info'" class="tab-fade-panel">
            <table class="minimalist-spec-table"><tbody>
              <tr v-if="product.origin"><td>Source Region</td><td>{{ product.origin }}</td></tr>
              <tr v-if="product.shelfLife"><td>Shelf Life</td><td>{{ product.shelfLife }}</td></tr>
              <tr v-if="product.weight"><td>Net Quantity</td><td>{{ product.weight }}</td></tr>
              <tr v-if="product.category"><td>Category</td><td>{{ product.category }}</td></tr>
            </tbody></table>
          </div>
        </div>
      </div>

      <div class="product-reviews-standalone-terminal">
        <h3 class="terminal-headline">Customer Feedback</h3>
        <div class="reviews-split-viewport">
          
          <div class="submit-review-card-form">
            <h4>Share Your Experience</h4>
            <p class="review-sub">Help others by reviewing this Himalayan product.</p>
            <form @submit.prevent="handleReviewSubmit" class="review-inline-form">
              <div class="form-row">
                <label>Rating:</label>
                <select v-model="newRating" class="review-select-input">
                  <option :value="5">⭐⭐⭐⭐⭐ Outstanding</option>
                  <option :value="4">⭐⭐⭐⭐ Great</option>
                  <option :value="3">⭐⭐⭐ Good</option>
                  <option :value="2">⭐⭐ Fair</option>
                  <option :value="1">⭐ Poor</option>
                </select>
              </div>
              <div class="form-row flex-column">
                <textarea v-model="newComment" required placeholder="What did you love about this product?" class="review-textarea"></textarea>
              </div>
              <button type="submit" class="submit-review-btn" :disabled="submitting">{{ submitting ? 'Submitting...' : 'Post Review' }}</button>
            </form>
          </div>

          <div class="live-reviews-feed-column">
            <div v-if="reviewsList.length === 0" class="empty-reviews-placeholder-state">
              <div class="placeholder-icon">✍️</div>
              <h5>No Reviews Yet</h5>
              <p>Be the first to share your thoughts.</p>
            </div>
            <div v-else class="scrollable-reviews-stack">
              <div v-for="review in reviewsList" :key="review.id" class="individual-review-row-card">
                <div class="review-row-header">
                  <span class="user-id-badge">{{ review.userName || 'Verified Buyer' }}</span>
                  <span class="star-rating-score"><span v-for="star in review.rating" :key="star">⭐</span></span>
                </div>
                <p class="review-commentary-paragraph">"{{ review.comment }}"</p>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Jost:wght@400;500;600;700&display=swap');

/* Animations & Base */
.fade-in { animation: fIn 0.4s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.page { padding: 110px 2% 80px; font-family: 'Jost', sans-serif; min-height: 100vh; background-color: #FAFAF8; color: #111827; }

/* Breadcrumb */
.breadcrumb-container { max-width: 1200px; margin: 0 auto 30px; display: flex; align-items: center; }
.back-link-action { display: inline-flex; align-items: center; gap: 8px; background: transparent; border: 1px solid #E5E7EB; color: #4B5563; font-weight: 600; font-size: 0.9rem; cursor: pointer; padding: 10px 18px; border-radius: 30px; transition: all 0.2s; }
.back-link-action:hover { background: #FFFFFF; color: #111827; border-color: #D1D5DB; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }

/* Loaders & Errors */
.center-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 50vh; gap: 16px; color: #6b7280; }
.spinner { width: 44px; height: 44px; border: 3px solid #e5e7eb; border-top-color: #16a34a; border-radius: 50%; animation: spin 0.85s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.go-home-btn { margin-top: 10px; padding: 10px 24px; background: #111827; color: white; border-radius: 30px; border: none; font-weight: 600; cursor: pointer; }

/* Layout Structure */
.product-viewport-container { width: 100%; max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px; }
.rosier-top-split-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 50px; align-items: start; }

/* ── GALLERY PANE ── */
.gallery-sticky-wrapper { position: sticky; top: 100px; display: flex; gap: 16px; height: 500px; }
.rosier-side-strip-tray { display: flex; flex-direction: column; gap: 12px; width: 85px; flex-shrink: 0; overflow-y: auto; padding-right: 4px; }
.rosier-side-strip-tray::-webkit-scrollbar { width: 4px; }
.rosier-side-strip-tray::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
.strip-thumb-card { width: 80px; height: 80px; border-radius: 12px; border: 2px solid transparent; background-color: #ffffff; cursor: pointer; padding: 2px; transition: all 0.2s; opacity: 0.7; }
.strip-thumb-card:hover { opacity: 1; }
.strip-thumb-card.is-active { border-color: #16a34a; opacity: 1; }
.strip-thumb-card img { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; }

.rosier-focused-display-box { flex: 1; height: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #E5E7EB; }
.primary-focused-image { width: 100%; height: 100%; object-fit: cover; }
.emoji-centered-fallback { text-align: center; }
.giant-emoji-glyph { font-size: 8rem; }
.promo-sale-ribbon { position: absolute; top: 20px; left: 20px; background-color: #ef4444; color: #ffffff; font-size: 0.8rem; font-weight: 800; padding: 8px 16px; border-radius: 30px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2); }
.promo-sale-ribbon.stockout { background-color: #4B5563; box-shadow: none; }

/* ── INFO & CART PANE ── */
.rosier-quick-buy-pane { display: flex; flex-direction: column; padding: 10px 0; }
.header-group { margin-bottom: 24px; }
.category-meta-header { font-size: 0.85rem; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px; display: block; }
.rosier-item-title { font-family: 'Cinzel', serif; font-size: 2.8rem; font-weight: 800; color: #111827; margin: 0; line-height: 1.15; }

.rosier-stars-rating-row { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #E5E7EB; }
.stars-badge { font-size: 0.95rem; color: #ca8a04; font-weight: 800; display: flex; align-items: center; }
.review-aggregate-count { font-size: 0.9rem; color: #6B7280; font-weight: 500; text-decoration: underline; text-decoration-color: #E5E7EB; text-underline-offset: 4px; }

.rosier-pricing-block { display: flex; align-items: baseline; gap: 16px; margin-bottom: 30px; }
.current-price { font-size: 2.6rem; font-weight: 700; color: #111827; line-height: 1; }
.price-discount-meta { display: flex; flex-direction: column; gap: 4px; }
.struck-slashed-price { font-size: 1.2rem; color: #9ca3af; text-decoration: line-through; font-weight: 500; }
.savings-pill-alert { color: #16a34a; font-size: 0.85rem; font-weight: 700; }

.rosier-micro-metadata-tray { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 32px; }
.metadata-tray-pill { display: flex; flex-direction: column; gap: 2px; background-color: #ffffff; padding: 12px 16px; border-radius: 12px; border: 1px solid #E5E7EB; }
.metadata-tray-pill .lbl { font-size: 0.75rem; color: #6B7280; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
.metadata-tray-pill strong { font-size: 1rem; color: #111827; font-weight: 600; }

.rosier-cart-transactional-card { background-color: #ffffff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
.stock-availability-bar { margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.stock-txt { font-size: 0.95rem; font-weight: 600; }
.stock-txt.dynamic-good { color: #16a34a; }
.stock-txt.dynamic-low { color: #d97706; }
.stock-txt.dynamic-out { color: #dc2626; }
.rosier-primary-cta { width: 100%; padding: 18px; background-color: #111827; color: #FFFFFF; border: none; border-radius: 12px; font-size: 1.05rem; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; justify-content: center; align-items: center; }
.rosier-primary-cta:hover:not(:disabled) { background-color: #16a34a; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(22, 163, 74, 0.2); }
.rosier-primary-cta.is-in-cart { background-color: #ffffff; color: #111827; border: 2px solid #111827; }
.rosier-primary-cta.is-disabled { opacity: 0.6; cursor: not-allowed; background-color: #4B5563; }

/* ── BOTTOM TABS ── */
.product-rich-details-section { width: 100%; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.01); }
.rich-tabs-bar { display: flex; background-color: #FAFAF8; border-bottom: 1px solid #E5E7EB; }
.rich-tab-nav-btn { flex: 1; padding: 20px 24px; background: transparent; border: none; font-size: 1rem; font-weight: 600; color: #6B7280; cursor: pointer; text-align: center; transition: 0.2s; }
.rich-tab-nav-btn:hover { color: #111827; }
.rich-tab-nav-btn.is-active { color: #111827; border-bottom: 3px solid #111827; background-color: #ffffff; font-weight: 700; }
.rich-tabs-content-body { padding: 40px; }
.paragraph-text { font-size: 1.05rem; color: #4B5563; line-height: 1.8; margin: 0; }
.premium-bullets-stack { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
.premium-bullets-stack li { font-size: 1.05rem; color: #4B5563; position: relative; padding-left: 28px; }
.premium-bullets-stack li::before { content: "✦"; position: absolute; left: 0; color: #16a34a; font-size: 1.2rem; }
.ingredients-flex-tray { display: flex; flex-wrap: wrap; gap: 12px; }
.ing-node-pill { background-color: #F3F4F6; padding: 10px 20px; font-size: 0.95rem; border-radius: 30px; font-weight: 500; color: #111827; border: 1px solid #E5E7EB; }
.minimalist-spec-table { width: 100%; border-collapse: collapse; }
.minimalist-spec-table td { padding: 16px 20px; border-bottom: 1px solid #F3F4F6; font-size: 1rem; }
.minimalist-spec-table td:first-child { font-weight: 600; color: #6B7280; width: 30%; }
.minimalist-spec-table td:last-child { color: #111827; font-weight: 500; }

/* ── REVIEWS SECTION ── */
.product-reviews-standalone-terminal { width: 100%; }
.terminal-headline { font-size: 1.6rem; font-weight: 800; color: #111827; margin: 0 0 32px 0; }
.reviews-split-viewport { display: flex; flex-direction: row; gap: 40px; align-items: start; }
.submit-review-card-form { width: 40%; background-color: #ffffff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
.submit-review-card-form h4 { margin: 0 0 4px 0; font-size: 1.2rem; font-weight: 700; color: #111827; }
.review-sub { font-size: 0.9rem; color: #6B7280; margin: 0 0 24px 0; }
.review-inline-form { display: flex; flex-direction: column; gap: 20px; }
.form-row { display: flex; flex-direction: column; gap: 8px; }
.form-row label { font-size: 0.9rem; font-weight: 600; color: #374151; }
.review-select-input, .review-textarea { padding: 14px; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 0.95rem; font-family: inherit; width: 100%; background: #FAFAF8; outline: none; transition: border-color 0.2s; }
.review-select-input:focus, .review-textarea:focus { border-color: #111827; background: #ffffff; }
.review-textarea { height: 120px; resize: vertical; }
.submit-review-btn { background-color: #111827; color: #ffffff; border: none; padding: 16px; border-radius: 10px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: 0.2s; }
.submit-review-btn:hover:not(:disabled) { background-color: #16a34a; }

.live-reviews-feed-column { width: 60%; }
.empty-reviews-placeholder-state { text-align: center; padding: 60px 20px; background: #ffffff; border: 1px dashed #D1D5DB; border-radius: 16px; }
.placeholder-icon { font-size: 2.5rem; margin-bottom: 12px; }
.empty-reviews-placeholder-state h5 { margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #111827; }
.empty-reviews-placeholder-state p { margin: 0; font-size: 0.95rem; color: #6B7280; }
.scrollable-reviews-stack { display: flex; flex-direction: column; gap: 16px; max-height: 500px; overflow-y: auto; padding-right: 8px; }
.scrollable-reviews-stack::-webkit-scrollbar { width: 6px; }
.scrollable-reviews-stack::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 10px; }
.individual-review-row-card { background-color: #ffffff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 24px; }
.review-row-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.user-id-badge { font-size: 0.9rem; color: #111827; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.user-id-badge::before { content: ""; width: 24px; height: 24px; background: #E5E7EB; border-radius: 50%; display: inline-block; }
.star-rating-score { font-size: 0.9rem; }
.review-commentary-paragraph { margin: 0; font-size: 1rem; color: #4B5563; line-height: 1.6; }

/* ── RESPONSIVE DESIGN ── */
@media (max-width: 1024px) {
  .rosier-top-split-grid { grid-template-columns: 1fr; gap: 40px; }
  .gallery-sticky-wrapper { position: relative; top: 0; height: auto; max-height: 600px; }
  .rosier-focused-display-box { max-width: 500px; margin: 0 auto; width: 100%; }
}

@media (max-width: 768px) {
  .page { padding: 90px 16px 100px; }
  .gallery-sticky-wrapper { flex-direction: column-reverse; gap: 12px; max-height: none; }
  .rosier-side-strip-tray { flex-direction: row; width: 100%; overflow-x: auto; padding-bottom: 8px; }
  .strip-thumb-card { width: 70px; height: 70px; flex-shrink: 0; }
  
  .rosier-item-title { font-size: 2.2rem; }
  .current-price { font-size: 2.2rem; }
  
  .rich-tabs-bar { overflow-x: auto; white-space: nowrap; }
  .rich-tab-nav-btn { min-width: auto; padding: 16px 20px; font-size: 0.95rem; }
  .rich-tabs-content-body { padding: 24px 20px; }
  
  .reviews-split-viewport { flex-direction: column; gap: 32px; }
  .submit-review-card-form, .live-reviews-feed-column { width: 100%; }
}
</style>