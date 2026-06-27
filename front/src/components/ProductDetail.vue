<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { auth } from '../firebase.js'
import { 
  fetchProductById, logProductView, addProductToCart, 
  isVariantInCart, fetchProductReviews, addProductReview, canUserReviewProduct,
  deleteProductReview, fetchUserRole
} from './db.js'

defineOptions({ name: 'ProductDetail' })
const route = useRoute(), router = useRouter()

const product = ref(null), loading = ref(true), notFound = ref(false)
const adding = ref(false), alreadyInCart = ref(false)

const activeIdx = ref(0), brokenUrls = ref(new Set())
const activeDetailTab = ref('description')
const reviewsList = ref([]), newRating = ref(5), newComment = ref(''), submitting = ref(false)
const canReview = ref(false) 

const currentUserUid = ref(null)
const userRole = ref('user')

const selectedVariant = ref(null)
const selectedQuantity = ref(1)

const cleanImages = computed(() => (product.value?.imageUrls || []).filter(u => u && u.trim() !== '' && !brokenUrls.value.has(u)))

const safeVariants = computed(() => {
    if (product.value?.variants && product.value.variants.length > 0) return product.value.variants;
    return [{ type: 'Standard', label: product.value?.weight || '1 Unit', price: product.value?.price || 0 }]
})

watch(selectedVariant, async (newVar) => {
  if (product.value) {
    alreadyInCart.value = await isVariantInCart(product.value.id, newVar ? newVar.label : product.value.weight)
    selectedQuantity.value = 1 
  }
})

onMounted(async () => {
  const rawParam = route.params.id
  const productId = rawParam.includes('--') ? rawParam.split('--').pop() : rawParam

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUserUid.value = user.uid;
      userRole.value = await fetchUserRole();
    }
  })

  try {
    product.value = await fetchProductById(productId)
    if (!product.value) { notFound.value = true; return }
    
    selectedVariant.value = safeVariants.value[0];
    alreadyInCart.value = await isVariantInCart(product.value.id, selectedVariant.value.label)
    reviewsList.value = await fetchProductReviews(product.value.id)
    canReview.value = await canUserReviewProduct(product.value.id)
    logProductView(product.value.id)
  } catch (e) { notFound.value = true } finally { loading.value = false }
})

const hasDiscount = computed(() => product.value?.discount?.isDiscounted && product.value?.discount?.percent > 0)
const isOutOfStock = computed(() => product.value?.stock === 0)

const currentBasePrice = computed(() => Number(selectedVariant.value?.price || 0))
const finalPrice = computed(() => hasDiscount.value ? Math.round(currentBasePrice.value * (1 - product.value.discount.percent / 100)) : currentBasePrice.value)

const increaseQty = () => selectedQuantity.value++
const decreaseQty = () => { if(selectedQuantity.value > 1) selectedQuantity.value-- }

async function handleAddToCart() {
  if (alreadyInCart.value) { router.push('/cart'); return }
  if (adding.value || isOutOfStock.value) return
  if (!selectedVariant.value) { alert("Please select a size or weight option."); return; }

  adding.value = true
  try {
    await addProductToCart(product.value, finalPrice.value, selectedVariant.value, selectedQuantity.value)
    alreadyInCart.value = true
  } catch (err) {
    alert(err.message === 'NOT_LOGGED_IN' ? 'Please log in first!' : 'Error: ' + err.message)
  } finally { adding.value = false }
}

async function handleReviewSubmit() {
  if (!newComment.value.trim()) return
  submitting.value = true
  try {
    await addProductReview(product.value.id, newRating.value, newComment.value)
    reviewsList.value = await fetchProductReviews(product.value.id)
    newComment.value = ''; newRating.value = 5; alert('Verified feedback published.')
  } catch (err) { alert(err.message) } finally { submitting.value = false }
}

async function handleDeleteReview(reviewId) {
  if (!confirm("Are you sure you want to delete this review?")) return;
  try {
    await deleteProductReview(reviewId);
    reviewsList.value = reviewsList.value.filter(r => r.id !== reviewId);
  } catch (e) { alert("Error deleting review: " + e.message); }
}

let touchStartX = 0
const onTouchStart = (e) => { touchStartX = e.changedTouches[0].screenX }
const onTouchEnd = (e) => {
  const touchEndX = e.changedTouches[0].screenX
  if (touchStartX - touchEndX > 40) nextImage()
  if (touchEndX - touchStartX > 40) prevImage()
}
const prevImage = () => { if(activeIdx.value > 0) activeIdx.value-- }
const nextImage = () => { if(activeIdx.value < cleanImages.value.length - 1) activeIdx.value++ }
</script>

<template>
  <div class="page">
    <div class="breadcrumb-container"><button class="back-link-action" @click="router.push('/')">← Back to Collection</button></div>
    <div v-if="loading" class="center-state"><div class="spinner"></div></div>
    <div v-else-if="notFound" class="center-state text-404"><h3>Product Not Found</h3><button class="go-home-btn" @click="router.push('/')">Return to Shop</button></div>

    <div v-else-if="product" class="product-viewport-container fade-in">
      <div class="rosier-top-split-grid">
        
        <div class="rosier-gallery-pane">
          <div class="gallery-sticky-wrapper">
            <div v-if="cleanImages.length > 1" class="rosier-side-strip-tray">
              <div v-for="(url, idx) in cleanImages" :key="url" :class="['strip-thumb-card', { 'is-active': activeIdx === idx }]" @click="activeIdx = idx"><img :src="url"/></div>
            </div>

            <div class="rosier-focused-display-box" @touchstart="onTouchStart" @touchend="onTouchEnd">
              <div v-if="hasDiscount" class="promo-sale-ribbon">{{ product.discount.percent }}% OFF</div>
              <div v-if="isOutOfStock" class="promo-sale-ribbon stockout">Out of Stock</div>
              
              <div class="focused-image-aspect" v-if="cleanImages.length > 0">
                <img :src="cleanImages[activeIdx] || cleanImages[0]" class="primary-focused-image" />
                
                <button v-if="cleanImages.length > 1 && activeIdx > 0" class="slide-btn prev" @click.stop="prevImage">❮</button>
                <button v-if="cleanImages.length > 1 && activeIdx < cleanImages.length - 1" class="slide-btn next" @click.stop="nextImage">❯</button>
                
                <div class="mobile-slider-dots" v-if="cleanImages.length > 1">
                  <span v-for="(_, i) in cleanImages" :key="i" :class="['dot', { active: activeIdx === i }]" @click.stop="activeIdx = i"></span>
                </div>
              </div>
              <div v-else class="emoji-centered-fallback"><span class="giant-emoji-glyph">{{ product.emoji || '🍯' }}</span></div>
            </div>
          </div>
        </div>

        <div class="rosier-quick-buy-pane">
          <div class="header-group">
            <span class="category-meta-header">{{ product.category || 'HIMALAYAN HARVEST' }}</span>
            <h1 class="rosier-item-title">{{ product.name }}</h1>
            <p class="product-short-desc" v-if="product.shortDesc">{{ product.shortDesc }}</p>
          </div>

          <div v-if="product.reviewCount > 0" class="rosier-stars-rating-row">
            <span class="stars-badge">★ {{ product.ratingAverage?.toFixed(1) }}</span>
            <span class="review-aggregate-count">({{ product.reviewCount }} verified reviews)</span>
          </div>

          <div class="rosier-pricing-block">
            <span class="current-price">₹{{ finalPrice }}</span>
            <div v-if="hasDiscount" class="price-discount-meta">
              <span class="struck-slashed-price">₹{{ currentBasePrice }}</span>
              <span class="savings-pill-alert">Save ₹{{ currentBasePrice - finalPrice }}</span>
            </div>
          </div>

          <div class="variants-selection-block">
              <label class="variant-label">Select Option:</label>
              <div class="variant-options-tray">
                  <button v-for="v in safeVariants" :key="v.label" :class="['variant-btn', { active: selectedVariant === v }]" @click="selectedVariant = v">
                      {{ v.label }}
                  </button>
              </div>
          </div>

          <div class="rosier-cart-transactional-card">
            <div class="stock-availability-bar">
              <span v-if="isOutOfStock" class="stock-txt dynamic-out">✕ Currently Unavailable</span>
              <span v-else class="stock-txt dynamic-good">✓ Ready to ship</span>
            </div>

            <div class="transaction-actions-row">
                <div v-if="!alreadyInCart && !isOutOfStock" class="quantity-adjuster-box">
                    <button class="qty-btn" @click="decreaseQty">−</button>
                    <span class="qty-val">{{ selectedQuantity }}</span>
                    <button class="qty-btn" @click="increaseQty">+</button>
                </div>

                <button class="rosier-primary-cta" :disabled="isOutOfStock && !alreadyInCart" :class="{ 'is-disabled': isOutOfStock, 'is-in-cart': alreadyInCart && !isOutOfStock }" @click="handleAddToCart">
                  <span v-if="adding">Processing...</span>
                  <span v-else-if="isOutOfStock">Sold Out</span>
                  <span v-else-if="alreadyInCart">Added! View Cart →</span>
                  <span v-else>Add to Cart — ₹{{ finalPrice * selectedQuantity }}</span>
                </button>
            </div>

          </div>

          <div class="blinkit-disclaimer">
            <span class="disclaimer-icon">ⓘ</span>
            <p class="disclaimer-text">Every effort is made to maintain the accuracy of all information. However, actual product packaging and materials may contain more and/or different information. It is recommended not to solely rely on the information presented.</p>
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
              <tr v-if="product.category"><td>Category</td><td>{{ product.category }}</td></tr>
            </tbody></table>
          </div>
        </div>
      </div>

      <div class="product-reviews-standalone-terminal">
        <h3 class="terminal-headline">Verified Customer Feedback</h3>
        <div class="reviews-split-viewport">
          <div class="submit-review-card-form">
            <div v-if="canReview">
              <h4>Share Your Experience</h4>
              <form @submit.prevent="handleReviewSubmit" class="review-inline-form">
                <div class="form-row"><select v-model="newRating" class="review-select-input"><option :value="5">⭐⭐⭐⭐⭐ Outstanding</option><option :value="4">⭐⭐⭐⭐ Great</option><option :value="3">⭐⭐⭐ Good</option><option :value="2">⭐⭐ Fair</option><option :value="1">⭐ Poor</option></select></div>
                <div class="form-row flex-column"><textarea v-model="newComment" required placeholder="What did you love about this product?" class="review-textarea"></textarea></div>
                <button type="submit" class="submit-review-btn" :disabled="submitting">Post Review</button>
              </form>
            </div>
            <div v-else class="not-purchased-alert">
              <div class="icon">🛍️</div><h4>Review Requires Purchase</h4><p>Only customers who have purchased and received this product can leave a review.</p>
            </div>
          </div>
          <div class="live-reviews-feed-column">
            <div v-if="reviewsList.length === 0" class="empty-reviews-placeholder-state"><h5>No Reviews Yet</h5><p>Be the first to share your thoughts.</p></div>
            <div v-else class="scrollable-reviews-stack">
              <div v-for="review in reviewsList" :key="review.id" class="individual-review-row-card">
                
                <div class="review-row-header">
                  <span class="user-id-badge">{{ review.userName || 'Verified Buyer' }} <span class="verified-tick">✓</span></span>
                  <div class="review-actions-right">
                    <span class="star-rating-score"><span v-for="star in review.rating" :key="star">⭐</span></span>
                    
                    <button v-if="currentUserUid === review.userId || ['admin', 'superadmin'].includes(userRole)" 
                            class="del-review-btn" @click="handleDeleteReview(review.id)" title="Delete Review">🗑️</button>
                  </div>
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
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Jost:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap');

.fade-in { animation: fIn 0.4s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.page { padding: 110px 2% 80px; font-family: 'Inter', 'Jost', sans-serif; min-height: 100vh; background-color: #FAFAF8; color: #111827; }

.breadcrumb-container { max-width: 1200px; margin: 0 auto 30px; display: flex; align-items: center; }
.back-link-action { display: inline-flex; align-items: center; gap: 8px; background: transparent; border: 1px solid #E5E7EB; color: #4B5563; font-weight: 600; font-size: 0.9rem; cursor: pointer; padding: 10px 18px; border-radius: 30px; transition: all 0.2s; }
.center-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 50vh; gap: 16px; color: #6b7280; }
.spinner { width: 44px; height: 44px; border: 3px solid #e5e7eb; border-top-color: #16a34a; border-radius: 50%; animation: spin 0.85s linear infinite; }
.product-viewport-container { width: 100%; max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px; }
.rosier-top-split-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 50px; align-items: start; }

.gallery-sticky-wrapper { position: sticky; top: 100px; display: flex; gap: 16px; height: auto; }
.rosier-side-strip-tray { display: flex; flex-direction: column; gap: 12px; width: 85px; flex-shrink: 0; overflow-y: auto; padding-right: 4px; max-height: 500px; }
.strip-thumb-card { width: 80px; height: 80px; border-radius: 12px; border: 2px solid transparent; background-color: #ffffff; cursor: pointer; padding: 2px; }
.strip-thumb-card.is-active { border-color: #16a34a; opacity: 1; }
.strip-thumb-card img { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; }

.rosier-focused-display-box { flex: 1; background-color: #F9FAFB; border-radius: 20px; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #E5E7EB; }
.focused-image-aspect { width: 100%; height: 500px; display: flex; position: relative; }
.primary-focused-image { width: 100%; height: 100%; object-fit: contain; }

.slide-btn { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.8); border: none; width: 40px; height: 40px; border-radius: 50%; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.1); opacity: 0; transition: 0.3s; color: #111827; }
.rosier-focused-display-box:hover .slide-btn { opacity: 1; }
.slide-btn.prev { left: 16px; }
.slide-btn.next { right: 16px; }
.slide-btn:hover { background: #ffffff; }

.mobile-slider-dots { position: absolute; bottom: 16px; left: 0; width: 100%; display: none; justify-content: center; gap: 8px; z-index: 10; }
.mobile-slider-dots .dot { width: 8px; height: 8px; border-radius: 50%; background: #D1D5DB; cursor: pointer; transition: 0.3s; }
.mobile-slider-dots .dot.active { background: #16a34a; transform: scale(1.3); }

.promo-sale-ribbon { position: absolute; top: 20px; left: 20px; background-color: #ef4444; color: #ffffff; font-size: 0.8rem; font-weight: 800; padding: 8px 16px; border-radius: 30px; z-index: 10; }
.rosier-quick-buy-pane { display: flex; flex-direction: column; padding: 10px 0; }
.category-meta-header { font-size: 0.85rem; font-weight: 700; color: #16a34a; text-transform: uppercase; margin-bottom: 10px; display: block; }

/* ─── PRODUCT TITLE — BIGGER ─── */
.rosier-item-title { font-family: 'Inter', 'Montserrat', sans-serif; font-size: 22px; font-weight: 800; color: #111827; margin: 0 0 4px 0; line-height: 1.2; letter-spacing: -0.2px; }

.product-short-desc { font-size: 1.15rem; color: #4B5563; margin-top: 12px; font-weight: 500; }

.rosier-pricing-block { display: flex; align-items: baseline; gap: 16px; margin-bottom: 30px; margin-top: 20px;}
.current-price { font-size: 2.6rem; font-weight: 700; color: #111827; }
.struck-slashed-price { font-size: 1.2rem; color: #9ca3af; text-decoration: line-through; font-weight: 500; display: block;}
.savings-pill-alert { color: #16a34a; font-size: 0.85rem; font-weight: 700; }

.variants-selection-block { margin-bottom: 32px; }
.variant-label { font-size: 0.9rem; font-weight: 700; color: #374151; margin-bottom: 10px; display: block; text-transform: uppercase; }
.variant-options-tray { display: flex; flex-wrap: wrap; gap: 12px; }
.variant-btn { padding: 12px 20px; border: 2px solid #E5E7EB; background: #ffffff; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 0.95rem; color: #4B5563; }
.variant-btn.active { border-color: #16a34a; background: #F0FDF4; color: #16a34a; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.1); }

/* ─── ADD TO CART CARD — SMALLER ─── */
.rosier-cart-transactional-card { background-color: #ffffff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px 18px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
.stock-availability-bar { margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
.stock-txt { font-size: 0.85rem; font-weight: 600; }
.stock-txt.dynamic-good { color: #16a34a; }
.stock-txt.dynamic-out { color: #dc2626; }

.transaction-actions-row { display: flex; gap: 12px; align-items: stretch; }
.quantity-adjuster-box { display: flex; align-items: center; background: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 10px; }
.qty-btn { background: transparent; border: none; font-size: 1rem; font-weight: 700; color: #111827; width: 34px; height: 34px; cursor: pointer; transition: 0.2s; border-radius: 50%; }
.qty-btn:hover { background: #E5E7EB; }
.qty-val { width: 24px; text-align: center; font-weight: 800; font-size: 0.95rem; }

.rosier-primary-cta { flex: 1; padding: 12px 16px; background-color: #111827; color: #FFFFFF; border: none; border-radius: 10px; font-size: 0.9rem; font-weight: 700; cursor: pointer; display: flex; justify-content: center; transition: 0.2s; }
.rosier-primary-cta:hover:not(:disabled) { background-color: #16a34a; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(22, 163, 74, 0.2); }
.rosier-primary-cta.is-in-cart { background-color: #ffffff; color: #111827; border: 2px solid #111827; }
.rosier-primary-cta.is-disabled { opacity: 0.6; cursor: not-allowed; background-color: #4B5563; }

/* ─── BLINKIT-STYLE DISCLAIMER ─── */
.blinkit-disclaimer { display: flex; gap: 10px; align-items: flex-start; margin-top: 16px; padding: 12px 16px; background-color: #F8FAFC; border-radius: 8px; border: 1px solid #E8ECF0; }
.disclaimer-icon { font-size: 14px; color: #64748B; flex-shrink: 0; margin-top: 1px; }
.disclaimer-text { font-size: 12px; font-weight: 400; color: #64748B; line-height: 1.5; margin: 0; font-family: 'Inter', sans-serif; }

/* ─── DETAILS SECTION ─── */
.product-rich-details-section { width: 100%; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; margin-top: 30px;}
.rich-tabs-bar { display: flex; background-color: #FAFAF8; border-bottom: 1px solid #E5E7EB; }
.rich-tab-nav-btn { flex: 1; padding: 20px 24px; background: transparent; border: none; font-size: 1rem; font-weight: 600; color: #6B7280; cursor: pointer; font-family: 'Inter', sans-serif; }
.rich-tab-nav-btn.is-active { color: #111827; border-bottom: 3px solid #111827; background-color: #ffffff; font-weight: 700; }
.rich-tabs-content-body { padding: 40px; }

/* ─── STORY/DESCRIPTION ─── */
.paragraph-text { font-size: 14px; color: #4B5563; line-height: 1.6; margin: 0; white-space: pre-wrap; font-family: 'Inter', sans-serif; }

/* ─── BENEFITS BULLETS ─── */
.premium-bullets-stack { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
.premium-bullets-stack li { font-size: 14px; color: #4B5563; padding-left: 28px; position: relative; font-family: 'Inter', sans-serif; }
.premium-bullets-stack li::before { content: "✦"; position: absolute; left: 0; color: #16a34a; }

/* ─── INGREDIENTS ─── */
.ing-node-pill { font-size: 13px; display: inline-block; background: #F3F4F6; padding: 6px 14px; border-radius: 20px; margin: 4px; color: #374151; font-weight: 500; }

/* ─── SPEC TABLE ─── */
.minimalist-spec-table { width: 100%; border-collapse: collapse; }
.minimalist-spec-table td { padding: 10px 12px; border-bottom: 1px solid #F3F4F6; font-size: 14px; color: #4B5563; }
.minimalist-spec-table td:first-child { font-weight: 600; color: #111827; width: 40%; }

/* ─── REVIEWS SECTION ─── */
.product-reviews-standalone-terminal { width: 100%; margin-top: 40px; }
.terminal-headline { font-size: 1.2rem; font-weight: 700; color: #111827; margin: 0 0 24px 0; font-family: 'Cinzel', serif; }

.reviews-split-viewport { display: flex; flex-direction: row; gap: 40px; align-items: start; }
.submit-review-card-form { width: 40%; background-color: #ffffff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 32px; }

.not-purchased-alert { background: #F9FAFB; border: 1px dashed #D1D5DB; padding: 24px; border-radius: 12px; text-align: center; }
.not-purchased-alert .icon { font-size: 2rem; margin-bottom: 10px; }
.verified-tick { background: #16a34a; color: white; border-radius: 50%; width: 16px; height: 16px; display: inline-flex; justify-content: center; align-items: center; font-size: 10px; margin-left: 6px; }

.live-reviews-feed-column { width: 60%; }
.review-textarea { padding: 14px; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 0.95rem; font-family: 'Inter', sans-serif; width: 100%; height: 120px; }
.submit-review-btn { background-color: #111827; color: #ffffff; border: none; padding: 16px; border-radius: 10px; font-size: 1rem; font-weight: 700; cursor: pointer; width: 100%; margin-top: 10px; font-family: 'Inter', sans-serif; }
.individual-review-row-card { background-color: #ffffff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 24px; margin-bottom: 16px;}
.review-row-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.user-id-badge { font-size: 0.9rem; color: #111827; font-weight: 700; display: flex; align-items: center; font-family: 'Inter', sans-serif; }
.review-commentary-paragraph { font-family: 'Inter', sans-serif; font-size: 14px; color: #4B5563; line-height: 1.5; margin: 0; }

.review-actions-right { display: flex; align-items: center; gap: 12px; }
.del-review-btn { background: transparent; border: none; color: #9CA3AF; cursor: pointer; font-size: 1.1rem; padding: 4px; border-radius: 6px; transition: 0.2s; }
.del-review-btn:hover { background: #FEF2F2; color: #DC2626; }

/* ─── RESPONSIVE ─── */
@media (max-width: 1024px) {
  .rosier-top-split-grid { grid-template-columns: 1fr; gap: 40px; }
  .rosier-focused-display-box { max-width: 600px; margin: 0 auto; width: 100%; }
}

@media (max-width: 768px) {
  .page { padding: 90px 16px 100px; }
  .rosier-side-strip-tray { display: none; } 
  .mobile-slider-dots { display: flex; }
  .slide-btn { display: none; }
  .gallery-sticky-wrapper { flex-direction: column-reverse; gap: 12px; }
  .rosier-focused-display-box { border-radius: 12px; }
  .focused-image-aspect { height: auto; aspect-ratio: 1 / 1; }
  
  /* ─── MOBILE TITLE ─── */
  .rosier-item-title { font-size: 18px; }
  
  /* ─── MOBILE TEXT ─── */
  .paragraph-text { font-size: 13px; }
  .premium-bullets-stack li { font-size: 13px; }
  .review-commentary-paragraph { font-size: 13px; }
  .terminal-headline { font-size: 1rem; }
  
  /* ─── MOBILE CART CARD ─── */
  .rosier-cart-transactional-card { padding: 14px; }
  .transaction-actions-row { flex-direction: column; gap: 10px; }
  .quantity-adjuster-box { justify-content: center; padding: 4px 0; }
  .rosier-primary-cta { padding: 12px; font-size: 0.85rem; }
  
  .rich-tabs-bar { overflow-x: auto; white-space: nowrap; }
  .reviews-split-viewport { flex-direction: column; gap: 32px; }
  .submit-review-card-form, .live-reviews-feed-column { width: 100%; }
}
</style>