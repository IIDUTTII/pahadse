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

// ─── COMPUTED ───
const cleanImages = computed(() => {
  // Get images from selected variant first, fallback to product images
  if (selectedVariant.value?.imageUrls && selectedVariant.value.imageUrls.length > 0) {
    return selectedVariant.value.imageUrls.filter(u => u && u.trim() !== '' && !brokenUrls.value.has(u));
  }
  return (product.value?.imageUrls || []).filter(u => u && u.trim() !== '' && !brokenUrls.value.has(u));
})

// Get all variant images for the tray
const allVariantImages = computed(() => {
  if (!product.value?.variants) return [];
  const all = [];
  product.value.variants.forEach(v => {
    if (v.imageUrls && v.imageUrls.length > 0) {
      v.imageUrls.forEach(url => {
        if (url && url.trim() !== '' && !brokenUrls.value.has(url)) {
          all.push({ url, variantLabel: v.label });
        }
      });
    }
  });
  return all;
})

const safeVariants = computed(() => {
  if (product.value?.variants && product.value.variants.length > 0) {
    return product.value.variants;
  }
  // No variants – return empty array
  return [];
})

const hasDiscount = computed(() => product.value?.discount?.isDiscounted && product.value?.discount?.percent > 0)
const isOutOfStock = computed(() => {
  if (!selectedVariant.value) return true;
  return Number(selectedVariant.value.stock || 0) <= 0;
})

const currentBasePrice = computed(() => Number(selectedVariant.value?.price || 0))
const finalPrice = computed(() => hasDiscount.value ? Math.round(currentBasePrice.value * (1 - product.value.discount.percent / 100)) : currentBasePrice.value)

const zoomStyle = ref({})

// ─── WATCHERS ───
watch(selectedVariant, async (newVar) => {
  if (product.value && newVar) {
    alreadyInCart.value = await isVariantInCart(product.value.id, newVar.label || newVar.variantId)
    selectedQuantity.value = 1
    // Reset image index when variant changes
    activeIdx.value = 0
  }
})

// ─── ZOOM FUNCTIONS ───
const handleZoom = (e) => {
  if (window.innerWidth < 768) return
  const { left, top, width, height } = e.target.getBoundingClientRect()
  const x = ((e.clientX - left) / width) * 100
  const y = ((e.clientY - top) / height) * 100
  zoomStyle.value = {
    transformOrigin: `${x}% ${y}%`,
    transform: 'scale(2)'
  }
}

const resetZoom = () => {
  zoomStyle.value = {
    transformOrigin: 'center center',
    transform: 'scale(1)'
  }
}

// ─── LIFEHOOK ───
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
    
    if (safeVariants.value.length > 0) {
      selectedVariant.value = safeVariants.value[0];
    }
    
    reviewsList.value = await fetchProductReviews(product.value.id)
    canReview.value = await canUserReviewProduct(product.value.id)
    logProductView(product.value.id)
  } catch (e) { notFound.value = true } finally { loading.value = false }
})

// ─── ACTIONS ───
const increaseQty = () => selectedQuantity.value++
const decreaseQty = () => { if(selectedQuantity.value > 1) selectedQuantity.value-- }

async function handleAddToCart() {
  if (alreadyInCart.value) { router.push('/cart'); return }
  if (adding.value || isOutOfStock.value) return
  if (!selectedVariant.value) { alert("Please select an option."); return; }

  adding.value = true
  try {
    await addProductToCart(product.value, finalPrice.value, selectedVariant.value, selectedQuantity.value)
    alreadyInCart.value = true
  } catch (err) {
    alert(err.message === 'NOT_LOGGED_IN' ? 'Please log in to add items to cart.' : 'Error: ' + err.message)
  } finally { adding.value = false }
}

async function handleReviewSubmit() {
  if (!newComment.value.trim()) return
  submitting.value = true
  try {
    await addProductReview(product.value.id, newRating.value, newComment.value)
    reviewsList.value = await fetchProductReviews(product.value.id)
    newComment.value = ''; newRating.value = 5; alert('Review submitted successfully.')
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
    <div class="breadcrumb-container"><button class="back-link-action" @click="router.push('/products')">← Back</button></div>
    <div v-if="loading" class="center-state"><div class="spinner"></div></div>
    <div v-else-if="notFound" class="center-state text-404"><h3>Product Not Found</h3><button class="go-home-btn" @click="router.push('/products')">Return to Shop</button></div>

    <div v-else-if="product" class="product-viewport-container fade-in">
      <div class="main-split-grid">
        
        <!-- ─── GALLERY ─── -->
        <div class="gallery-pane">
          <div class="gallery-sticky-wrapper">
            <!-- Thumbnail strip -->
            <div v-if="cleanImages.length > 1" class="side-strip-tray">
              <div v-for="(url, idx) in cleanImages" :key="url" :class="['strip-thumb-card', { 'is-active': activeIdx === idx }]" @click="activeIdx = idx">
                <img :src="url"/>
              </div>
            </div>

            <!-- Main Image -->
            <div class="focused-display-box" @touchstart="onTouchStart" @touchend="onTouchEnd">
              <div v-if="hasDiscount" class="promo-sale-ribbon">{{ product.discount.percent }}% OFF</div>
              <div v-if="isOutOfStock" class="promo-sale-ribbon stockout">Out of Stock</div>
              
              <div 
                class="focused-image-aspect" 
                v-if="cleanImages.length > 0"
                @mousemove="handleZoom"
                @mouseleave="resetZoom"
              >
                <img 
                  :src="cleanImages[activeIdx] || cleanImages[0]" 
                  class="primary-focused-image" 
                  :style="zoomStyle"
                />
             
                <button v-if="cleanImages.length > 1 && activeIdx > 0" class="slide-btn prev" @click.stop="prevImage">&lt;</button>
                <button v-if="cleanImages.length > 1 && activeIdx < cleanImages.length - 1" class="slide-btn next" @click.stop="nextImage">&gt;</button>
                
                <div class="mobile-slider-dots" v-if="cleanImages.length > 1">
                  <span v-for="(_, i) in cleanImages" :key="i" :class="['dot', { active: activeIdx === i }]" @click.stop="activeIdx = i"></span>
                </div>
              </div>
              <div v-else class="no-image-fallback"><span>No Image Available</span></div>
            </div>
          </div>
        </div>

        <!-- ─── BUY PANE ─── -->
        <div class="quick-buy-pane">
          <div class="header-group">
            <span class="category-meta-header">{{ product.category || 'CATEGORY' }}</span>
            <h1 class="item-title">{{ product.name }}</h1>
            <p class="product-short-desc" v-if="product.shortDesc">{{ product.shortDesc }}</p>
          </div>

          <div v-if="product.reviewCount > 0" class="rating-row">
            <span class="stars-badge">★ {{ product.ratingAverage?.toFixed(1) }}</span>
            <span class="review-aggregate-count">({{ product.reviewCount }} reviews)</span>
          </div>

          <div class="pricing-block">
            <span class="current-price">₹{{ finalPrice }}</span>
            <div v-if="hasDiscount" class="price-discount-meta">
              <span class="struck-slashed-price">₹{{ currentBasePrice }}</span>
              <span class="savings-pill-alert">Save ₹{{ currentBasePrice - finalPrice }}</span>
            </div>
          </div>

          <!-- Variants Selection -->
          <div v-if="safeVariants.length > 0" class="variants-selection-block">
            <label class="variant-label">Select Option:</label>
            <div class="variant-options-tray">
              <button 
                v-for="v in safeVariants" 
                :key="v.variantId || v.label" 
                :class="['variant-btn', { active: selectedVariant === v }]" 
                @click="selectedVariant = v"
              >
                {{ v.label }}
              </button>
            </div>
          </div>
          <div v-else class="variants-selection-block">
            <p class="no-variants-warning">⚠️ This product has no variants available.</p>
          </div>

          <!-- Stock Badge -->
          <div v-if="selectedVariant" class="variant-stock-info">
            <span :class="['stock-badge', isOutOfStock ? 'out-of-stock' : 'in-stock']">
              {{ isOutOfStock ? 'Out of Stock' : 'In Stock: ' + selectedVariant.stock }}
            </span>
          </div>

          <!-- Add to Cart -->
          <div class="cart-transactional-card">
            <div class="stock-availability-bar">
              <span v-if="isOutOfStock" class="stock-txt dynamic-out">Out of Stock</span>
              <span v-else class="stock-txt dynamic-good">In Stock</span>
            </div>

            <div class="transaction-actions-row">
              <div v-if="!alreadyInCart && !isOutOfStock && selectedVariant" class="quantity-adjuster-box">
                <button class="qty-btn" @click="decreaseQty">-</button>
                <span class="qty-val">{{ selectedQuantity }}</span>
                <button class="qty-btn" @click="increaseQty">+</button>
              </div>

              <button 
                class="primary-cta" 
                :disabled="isOutOfStock || !selectedVariant || safeVariants.length === 0" 
                :class="{ 
                  'is-disabled': isOutOfStock || !selectedVariant || safeVariants.length === 0, 
                  'is-in-cart': alreadyInCart && !isOutOfStock 
                }" 
                @click="handleAddToCart"
              >
                <span v-if="adding">Processing...</span>
                <span v-else-if="safeVariants.length === 0">No Variants</span>
                <span v-else-if="isOutOfStock">Sold Out</span>
                <span v-else-if="alreadyInCart">Added to Cart</span>
                <span v-else>Add to Cart — ₹{{ finalPrice * selectedQuantity }}</span>
              </button>
            </div>
          </div>

          <div class="disclaimer-box">
            <p class="disclaimer-text">Note: Information presented is for reference. Actual product packaging may vary.</p>
          </div>
        </div>
      </div>

      <!-- ─── DETAIL TABS ─── -->
      <div class="rich-details-section">
        <div class="rich-tabs-bar">
          <button :class="['rich-tab-nav-btn', { 'is-active': activeDetailTab === 'description' }]" @click="activeDetailTab = 'description'">Description</button>
          <button v-if="product.benefits?.length" :class="['rich-tab-nav-btn', { 'is-active': activeDetailTab === 'benefits' }]" @click="activeDetailTab = 'benefits'">Benefits</button>
          <button v-if="product.ingredients?.length" :class="['rich-tab-nav-btn', { 'is-active': activeDetailTab === 'nutrition' }]" @click="activeDetailTab = 'nutrition'">Ingredients</button>
          <button :class="['rich-tab-nav-btn', { 'is-active': activeDetailTab === 'info' }]" @click="activeDetailTab = 'info'">Details</button>
        </div>

        <div class="rich-tabs-content-body">
          <div v-show="activeDetailTab === 'description'" class="tab-fade-panel"><p class="paragraph-text">{{ product.description }}</p></div>
          <div v-show="activeDetailTab === 'benefits'" class="tab-fade-panel"><ul class="bullets-stack"><li v-for="benefit in product.benefits" :key="benefit">{{ benefit }}</li></ul></div>
          <div v-show="activeDetailTab === 'nutrition'" class="tab-fade-panel"><div class="ingredients-flex-tray"><span v-for="ing in product.ingredients" :key="ing" class="ing-node-pill">{{ ing }}</span></div></div>
          <div v-show="activeDetailTab === 'info'" class="tab-fade-panel">
            <table class="spec-table"><tbody>
              <tr v-if="product.origin"><td>Origin</td><td>{{ product.origin }}</td></tr>
              <tr v-if="product.shelfLife"><td>Shelf Life</td><td>{{ product.shelfLife }}</td></tr>
              <tr v-if="product.category"><td>Category</td><td>{{ product.category }}</td></tr>
            </tbody></table>
          </div>
        </div>
      </div>

      <!-- ─── REVIEWS ─── -->
      <div class="reviews-section">
        <h3 class="section-headline">Customer Reviews</h3>
        <div class="reviews-split-viewport">
          <div class="submit-review-card-form">
            <div v-if="canReview">
              <h4 class="form-title">Write a Review</h4>
              <form @submit.prevent="handleReviewSubmit" class="review-inline-form">
                <div class="form-row">
                  <select v-model="newRating" class="review-select-input">
                    <option :value="5">5 - Excellent</option>
                    <option :value="4">4 - Good</option>
                    <option :value="3">3 - Average</option>
                    <option :value="2">2 - Poor</option>
                    <option :value="1">1 - Terrible</option>
                  </select>
                </div>
                <div class="form-row flex-column"><textarea v-model="newComment" required placeholder="Write your review here..." class="review-textarea"></textarea></div>
                <button type="submit" class="submit-review-btn" :disabled="submitting">Submit Review</button>
              </form>
            </div>
            <div v-else class="not-purchased-alert">
              <h4>Review Eligibility</h4><p>Reviews can only be submitted by customers who have purchased this product.</p>
            </div>
          </div>
          <div class="live-reviews-feed-column">
            <div v-if="reviewsList.length === 0" class="empty-reviews-state"><p>No reviews yet.</p></div>
            <div v-else class="reviews-stack">
              <div v-for="review in reviewsList" :key="review.id" class="review-card">
                <div class="review-row-header">
                  <span class="user-id-badge">{{ review.userName || 'Verified Buyer' }} <span class="verified-tag">Verified</span></span>
                  <div class="review-actions-right">
                    <span class="star-rating-score">★ {{ review.rating }}/5</span>
                    <button v-if="currentUserUid === review.userId || ['admin', 'superadmin'].includes(userRole)" 
                            class="del-review-btn" @click="handleDeleteReview(review.id)" title="Delete Review">Delete</button>
                  </div>
                </div>
                <p class="review-text">{{ review.comment }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.fade-in { animation: fIn 0.3s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.page { padding: 100px 24px 60px; font-family: 'Inter', sans-serif; min-height: 100vh; background-color: #F8FAFC; color: #334155; }

.breadcrumb-container { max-width: 1100px; margin: 0 auto 24px; }
.back-link-action { background: transparent; border: 1px solid #E2E8F0; color: #475569; font-weight: 500; font-size: 13px; cursor: pointer; padding: 8px 16px; border-radius: 6px; transition: 0.2s; font-family: inherit;}
.back-link-action:hover { background: #F1F5F9; color: #0F172A;}
.center-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 50vh; color: #64748B; }
.spinner { width: 36px; height: 36px; border: 3px solid #E2E8F0; border-top-color: #0F172A; border-radius: 50%; animation: spin 0.8s linear infinite; }
.product-viewport-container { width: 100%; max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px; }
.main-split-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start; }

.gallery-sticky-wrapper { position: sticky; top: 100px; display: flex; gap: 16px; }
.side-strip-tray { display: flex; flex-direction: column; gap: 10px; width: 70px; flex-shrink: 0; }
.strip-thumb-card { width: 64px; height: 64px; border-radius: 8px; border: 2px solid transparent; background-color: #ffffff; cursor: pointer; overflow: hidden;}
.strip-thumb-card.is-active { border-color: #0F172A; }
.strip-thumb-card img { width: 100%; height: 100%; object-fit: cover; }

.focused-display-box { flex: 1; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; position: relative; border: 1px solid #E2E8F0; }
.focused-image-aspect { 
  width: 100%; height: 500px; display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  position: relative;
}
.primary-focused-image { 
  width: 100%; height: 100%; object-fit: contain; 
  transition: transform 0.1s ease-out;
  cursor: crosshair;
}
.no-image-fallback { width: 100%; height: 500px; display: flex; align-items: center; justify-content: center; background: #F1F5F9; color: #94A3B8; font-size: 14px;}

.slide-btn { position: absolute; top: 50%; transform: translateY(-50%); background: white; border: 1px solid #E2E8F0; width: 32px; height: 32px; border-radius: 50%; font-size: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0; transition: 0.2s; color: #334155; }
.focused-display-box:hover .slide-btn { opacity: 1; }
.slide-btn.prev { left: 16px; }
.slide-btn.next { right: 16px; }

.mobile-slider-dots { position: absolute; bottom: 16px; left: 0; width: 100%; display: none; justify-content: center; gap: 6px; z-index: 10; }
.mobile-slider-dots .dot { width: 6px; height: 6px; border-radius: 50%; background: #CBD5E1; cursor: pointer; transition: 0.2s; }
.mobile-slider-dots .dot.active { background: #0F172A; }

.promo-sale-ribbon { position: absolute; top: 16px; left: 16px; background-color: #EF4444; color: #ffffff; font-size: 11px; font-weight: 600; padding: 6px 12px; border-radius: 4px; z-index: 10; letter-spacing: 0.5px;}
.promo-sale-ribbon.stockout { background-color: #6B7280; }

.quick-buy-pane { display: flex; flex-direction: column; padding: 10px 0; }
.category-meta-header { font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;}

.item-title { font-size: 24px; font-weight: 600; color: #0F172A; margin: 0 0 8px 0; line-height: 1.3; }
.product-short-desc { font-size: 14px; color: #475569; margin: 0 0 16px 0; }

.rating-row { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
.stars-badge { font-size: 13px; font-weight: 600; color: #0F172A; background: #F1F5F9; padding: 4px 8px; border-radius: 4px;}
.review-aggregate-count { font-size: 13px; color: #64748B; }

.pricing-block { display: flex; align-items: baseline; gap: 12px; margin-bottom: 24px; }
.current-price { font-size: 28px; font-weight: 700; color: #0F172A; }
.struck-slashed-price { font-size: 14px; color: #94A3B8; text-decoration: line-through; }
.savings-pill-alert { color: #10B981; font-size: 12px; font-weight: 500; }

.variants-selection-block { margin-bottom: 20px; }
.variant-label { font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 8px; display: block; text-transform: uppercase; }
.variant-options-tray { display: flex; flex-wrap: wrap; gap: 10px; }
.variant-btn { padding: 10px 16px; border: 1px solid #E2E8F0; background: #ffffff; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 13px; color: #334155; font-family: inherit;}
.variant-btn.active { border-color: #0F172A; color: #0F172A; background: #F8FAFC; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.no-variants-warning { color: #EF4444; font-size: 14px; font-weight: 500; padding: 8px 0; }

.variant-stock-info { margin: 8px 0 12px; }
.stock-badge { 
  font-size: 0.85rem; 
  font-weight: 600; 
  padding: 4px 12px; 
  border-radius: 20px; 
  display: inline-block;
}
.in-stock { background: #dcfce7; color: #16a34a; }
.out-of-stock { background: #fee2e2; color: #dc2626; }

.cart-transactional-card { background-color: #ffffff; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin-bottom: 16px;}
.stock-availability-bar { margin-bottom: 16px; font-size: 13px; font-weight: 500; }
.dynamic-good { color: #10B981; }
.dynamic-out { color: #EF4444; }

.transaction-actions-row { display: flex; gap: 12px; align-items: stretch; }
.quantity-adjuster-box { display: flex; align-items: center; border: 1px solid #E2E8F0; border-radius: 6px; background: #F8FAFC;}
.qty-btn { background: transparent; border: none; font-size: 16px; color: #334155; width: 36px; height: 36px; cursor: pointer; transition: 0.2s; }
.qty-btn:hover { background: #E2E8F0; }
.qty-val { width: 30px; text-align: center; font-size: 14px; font-weight: 500; }

.primary-cta { flex: 1; padding: 12px 16px; background-color: #0F172A; color: #FFFFFF; border: 1px solid #0F172A; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; display: flex; justify-content: center; transition: 0.2s; font-family: inherit;}
.primary-cta:hover:not(:disabled) { background-color: #334155; border-color: #334155;}
.primary-cta.is-in-cart { background-color: #ffffff; color: #0F172A; }
.primary-cta.is-disabled { opacity: 0.6; cursor: not-allowed; background-color: #94A3B8; border-color: #94A3B8;}

.disclaimer-box { margin-top: 16px; padding: 12px; background-color: #F8FAFC; border-radius: 6px; border: 1px dashed #E2E8F0; }
.disclaimer-text { font-size: 12px; color: #64748B; line-height: 1.5; margin: 0; }

.rich-details-section { width: 100%; background: #ffffff; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; margin-top: 20px;}
.rich-tabs-bar { display: flex; background-color: #FAFAFA; border-bottom: 1px solid #E2E8F0; }
.rich-tab-nav-btn { padding: 16px 24px; background: transparent; border: none; font-size: 13px; font-weight: 500; color: #64748B; cursor: pointer; font-family: inherit; border-bottom: 2px solid transparent; }
.rich-tab-nav-btn.is-active { color: #0F172A; border-bottom-color: #0F172A; font-weight: 600; background-color: #ffffff; }
.rich-tabs-content-body { padding: 32px; }

.paragraph-text { font-size: 14px; color: #334155; line-height: 1.6; margin: 0; white-space: pre-wrap; }
.bullets-stack { list-style: disc; padding-left: 20px; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.bullets-stack li { font-size: 14px; color: #334155; }
.ing-node-pill { font-size: 12px; display: inline-block; background: #F1F5F9; padding: 6px 12px; border-radius: 4px; margin: 4px 4px 0 0; color: #475569; }

.spec-table { width: 100%; border-collapse: collapse; }
.spec-table td { padding: 12px; border-bottom: 1px solid #F1F5F9; font-size: 13px; color: #475569; }
.spec-table td:first-child { font-weight: 500; color: #0F172A; width: 30%; }

.reviews-section { width: 100%; margin-top: 40px; }
.section-headline { font-size: 18px; font-weight: 600; color: #0F172A; margin: 0 0 24px 0; }

.reviews-split-viewport { display: flex; gap: 32px; align-items: start; }
.submit-review-card-form { width: 35%; background-color: #ffffff; border: 1px solid #E2E8F0; border-radius: 8px; padding: 24px; }
.form-title { margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #0F172A;}

.not-purchased-alert { background: #FAFAFA; border: 1px solid #E2E8F0; padding: 20px; border-radius: 6px; text-align: center; }
.not-purchased-alert h4 { margin: 0 0 8px; font-size: 14px; color: #0F172A; }
.not-purchased-alert p { margin: 0; font-size: 13px; color: #64748B; line-height: 1.5; }

.live-reviews-feed-column { width: 65%; }
.review-select-input { padding: 10px; border: 1px solid #E2E8F0; border-radius: 6px; font-size: 13px; width: 100%; margin-bottom: 12px; font-family: inherit; color: #334155;}
.review-textarea { padding: 12px; border: 1px solid #E2E8F0; border-radius: 6px; font-size: 13px; font-family: inherit; width: 100%; height: 100px; box-sizing: border-box; resize: vertical; outline: none;}
.review-textarea:focus { border-color: #0F172A; }
.submit-review-btn { background-color: #0F172A; color: #ffffff; border: none; padding: 12px 16px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; width: 100%; margin-top: 12px; font-family: inherit; }

.review-card { background-color: #ffffff; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin-bottom: 16px;}
.review-row-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.user-id-badge { font-size: 13px; color: #0F172A; font-weight: 600; display: flex; align-items: center; gap: 8px;}
.verified-tag { background: #F1F5F9; color: #475569; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 500;}
.review-text { font-size: 14px; color: #334155; line-height: 1.5; margin: 0; }

.review-actions-right { display: flex; align-items: center; gap: 12px; }
.star-rating-score { font-size: 13px; font-weight: 600; color: #0F172A; background: #F8FAFC; padding: 4px 8px; border-radius: 4px;}
.del-review-btn { background: transparent; border: none; color: #EF4444; font-size: 12px; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: 0.2s; font-family: inherit;}
.del-review-btn:hover { background: #FEF2F2; }

@media (max-width: 900px) {
  .main-split-grid { grid-template-columns: 1fr; gap: 32px; }
  .focused-display-box { max-width: 100%; }
}

@media (max-width: 768px) {
  .page { padding: 80px 16px 60px; }
  .side-strip-tray { display: none; } 
  .mobile-slider-dots { display: flex; }
  .slide-btn { display: none; }
  .gallery-sticky-wrapper { flex-direction: column-reverse; gap: 12px; }
  .focused-image-aspect { height: auto; aspect-ratio: 1 / 1; }
  
  .item-title { font-size: 20px; }
  .rich-tabs-bar { overflow-x: auto; white-space: nowrap; }
  .reviews-split-viewport { flex-direction: column; gap: 24px; }
  .submit-review-card-form, .live-reviews-feed-column { width: 100%; }
}
</style>