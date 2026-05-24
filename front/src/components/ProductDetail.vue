<script setup>
/**
 * ProductDetail.vue
 * Features a Rosier Foods inspired tabbed layout below the main product view.
 * Fixes: Empty left-side space issue and adds a dynamic tab selector.
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter }      from 'vue-router'
import {
  fetchProductById,
  logProductView,
  addProductToCart,
  isProductInCart,
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

// ── 🏷️ DYNAMIC BOTTOM TABS STATE ──
const activeDetailTab = ref('description')

const cleanImages = computed(() => {
  return (product.value?.imageUrls || []).filter(u => u && u.trim() !== '' && !brokenUrls.value.has(u))
})

watch(cleanImages, (newList) => {
  if (newList.length === 0) {
    activeIdx.value = 0
  } else if (activeIdx.value >= newList.length) {
    activeIdx.value = 0
  }
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
    if (err.message === 'NOT_LOGGED_IN') {
      alert('Please log in first to add items to your cart!')
    } else {
      alert('Error: ' + err.message)
    }
  } finally {
    adding.value = false
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
                <span class="giant-emoji-glyph">{{ product.emoji || 'Honey' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="rosier-quick-buy-pane">
          <span class="category-meta-header">{{ product.category || 'HIMALAYAN HARVEST' }}</span>
          <h1 class="rosier-item-title">{{ product.name }}</h1>

          <div v-if="product.reviewCount > 0" class="rosier-stars-rating-row">
            <span class="stars-badge">★ {{ product.ratingAverage?.toFixed(1) }}</span>
            <span class="review-aggregate-count">({{ product.reviewCount }} verified reviews)</span>
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
          <button 
            :class="['rich-tab-nav-btn', { 'is-active': activeDetailTab === 'description' }]"
            @click="activeDetailTab = 'description'"
          >
            Product Description
          </button>
          <button 
            v-if="product.benefits?.length"
            :class="['rich-tab-nav-btn', { 'is-active': activeDetailTab === 'benefits' }]"
            @click="activeDetailTab = 'benefits'"
          >
            Key Benefits
          </button>
          <button 
            v-if="product.ingredients?.length"
            :class="['rich-tab-nav-btn', { 'is-active': activeDetailTab === 'nutrition' }]"
            @click="activeDetailTab = 'nutrition'"
          >
            Nutritional Information
          </button>
          <button 
            :class="['rich-tab-nav-btn', { 'is-active': activeDetailTab === 'info' }]"
            @click="activeDetailTab = 'info'"
          >
            Product Information
          </button>
        </div>

        <div class="rich-tabs-content-body">
          
          <div v-show="activeDetailTab === 'description'" class="tab-fade-panel">
            <p class="paragraph-text" v-if="product.description">{{ product.description }}</p>
            <p class="paragraph-text" v-else>
              A2 Gir Cow Ghee is made using fresh Gir cow milk. The Cows are free-grazed. The milk from them is brought to a boil and naturally cooled down to room temperature and inoculated with a natural starter culture and left overnight to make curd. The curd is churned using the traditional 'Bilona method'.
            </p>
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
                <tr v-if="product.origin">
                  <td>Regional Origin</td>
                  <td>{{ product.origin }}</td>
                </tr>
                <tr v-if="product.shelfLife">
                  <td>Guaranteed Expiry</td>
                  <td>{{ product.shelfLife }}</td>
                </tr>
                <tr v-if="product.weight">
                  <td>Net Quantity Metric</td>
                  <td>{{ product.weight }}</td>
                </tr>
                <tr v-if="product.howToUse">
                  <td>Directions for Consumption</td>
                  <td>{{ product.howToUse }}</td>
                </tr>
                <tr v-if="product.category">
                  <td>Product Classification</td>
                  <td>{{ product.category }}</td>
                </tr>
              </tbody>
            </table>
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
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Jost:wght@300;400;500;600;700&display=swap');

.page {
  padding: 90px 4% 120px;
  font-family: 'Jost', sans-serif;
  min-height: 100vh;
  background-color: #FAF6F0; /* Rosier Foods organic soft cream */
  color: #1c1917;
}

.breadcrumb-container { max-width: 1200px; margin: 0 auto 24px; }
.back-link-action { background: none; border: none; color: #78716c; font-weight: 600; font-size: 0.9rem; cursor: pointer; padding: 0; }
.back-link-action:hover { color: #15803d; }

.center-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 50vh; gap: 16px; color: #78716c; }
.spinner { width: 44px; height: 44px; border: 3px solid #e7e5e4; border-top-color: #15803d; border-radius: 50%; animation: spin 0.85s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.product-viewport-container {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 50px; /* Space between product view and bottom tabs */
}

/* ── TOP SECTION LAYOUT SPLIT ── */
.rosier-top-split-grid {
  display: grid;
  grid-template-columns: 46% 54%;
  gap: 50px;
  align-items: start;
}

.gallery-sticky-wrapper {
  position: sticky;
  top: 100px;
  display: flex;
  gap: 16px;
}
.rosier-side-strip-tray { display: flex; flex-direction: column; gap: 12px; width: 70px; flex-shrink: 0; }
.strip-thumb-card { width: 64px; height: 64px; border-radius: 6px; border: 1.5px solid #d6d3d1; background-color: #ffffff; overflow: hidden; cursor: pointer; padding: 2px; box-sizing: border-box; }
.strip-thumb-card img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; }
.strip-thumb-card.is-active { border-color: #15803d; box-shadow: 0 0 0 3px rgba(21, 128, 61, 0.12); }

.rosier-focused-display-box { flex: 1; aspect-ratio: 1; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 2px solid #e7e5e4; position: relative; display: flex; align-items: center; justify-content: center; }
.focused-image-aspect { width: 100%; height: 100%; }
.primary-focused-image { width: 100%; height: 100%; object-fit: cover; }
.emoji-centered-fallback { text-align: center; }
.giant-emoji-glyph { font-size: 7rem; }

.promo-sale-ribbon { position: absolute; top: 16px; left: 16px; z-index: 5; background-color: #15803d; color: #ffffff; font-size: 0.7rem; font-weight: 700; padding: 4px 12px; border-radius: 4px; text-transform: uppercase; }
.promo-sale-ribbon.stockout { background-color: #44403c; }

/* BUY OPTIONS PANEL */
.rosier-quick-buy-pane { display: flex; flex-direction: column; }
.category-meta-header { font-size: 0.75rem; font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px; display: block; }
.rosier-item-title { font-family: 'Cinzel', serif; font-size: 2.2rem; font-weight: 700; color: #1c1917; margin: 0 0 12px; }

.rosier-stars-rating-row { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.stars-badge { font-size: 0.85rem; color: #b45309; font-weight: 700; background-color: #fef3c7; padding: 2px 8px; border-radius: 4px; }
.review-aggregate-count { font-size: 0.85rem; color: #57534e; }

.rosier-pricing-block { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
.current-price { font-family: 'Cinzel', serif; font-size: 2.4rem; font-weight: 700; color: #1c1917; }
.struck-slashed-price { font-size: 1.3rem; color: #a8a29e; text-decoration: line-through; }
.savings-pill-alert { background-color: #dcfce7; color: #15803d; font-size: 0.78rem; font-weight: 700; padding: 4px 12px; border-radius: 30px; }

.rosier-micro-metadata-tray { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
.metadata-tray-pill { font-size: 0.82rem; color: #44403c; background-color: #f5f5f4; padding: 6px 14px; border-radius: 6px; border: 1px solid #e7e5e4; }

.rosier-cart-transactional-card { background-color: #ffffff; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(68,64,60,0.02); }
.stock-availability-bar { margin-bottom: 12px; }
.stock-txt { font-size: 0.85rem; font-weight: 700; }
.stock-txt.dynamic-good { color: #15803d; }
.stock-txt.dynamic-low { color: #b45309; }
.stock-txt.dynamic-out { color: #a8a29e; }

.rosier-primary-cta { width: 100%; padding: 16px; background-color: #1c1917; color: #FAF6F0; border: none; border-radius: 30px; font-size: 0.95rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; transition: 0.2s; }
.rosier-primary-cta:hover:not(:disabled) { background-color: #15803d; }
.rosier-primary-cta.is-in-cart { background-color: #ca8a04; }
.rosier-primary-cta.is-disabled { background-color: #e7e5e4; color: #a8a29e; cursor: not-allowed; }

/* ================================================================= */
/* 🪵 NEW FULL WIDTH TAB SYSTEM STYLING MATRIX                       */
/* ================================================================= */
.product-rich-details-section {
  width: 100%;
  background: #ffffff;
  border: 2px solid #cbd5e1;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.02);
}

/* Horizontal Tab Header Row Layout */
.rich-tabs-bar {
  display: flex;
  background-color: #f8fafc;
  border-bottom: 2px solid #cbd5e1;
  overflow-x: auto;
  scrollbar-width: none;
}
.rich-tabs-bar::-webkit-scrollbar { display: none; }

.rich-tab-nav-btn {
  flex: 1;
  min-width: 160px;
  padding: 18px 24px;
  background: transparent;
  border: none;
  font-size: 0.95rem;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
  text-align: center;
  border-bottom: 3px solid transparent;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.rich-tab-nav-btn:hover {
  background-color: #f1f5f9;
  color: #1c1917;
}
/* Active Tab Style - Rosier Highlight Accent Green */
.rich-tab-nav-btn.is-active {
  color: #15803d;
  border-bottom-color: #15803d;
  background-color: #ffffff;
}

/* Tabs Inner Body Container */
.rich-tabs-content-body {
  padding: 35px;
  background-color: #ffffff;
}

.tab-fade-panel {
  animation: fadeIn 0.2s ease-out;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.paragraph-text {
  font-size: 1.05rem;
  color: #44403c;
  line-height: 1.8;
  margin: 0;
}

.premium-bullets-stack {
  list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px;
}
.premium-bullets-stack li {
  font-size: 1rem; color: #44403c; position: relative; padding-left: 20px; line-height: 1.6; font-weight: 500;
}
.premium-bullets-stack li::before {
  content: "✦"; position: absolute; left: 0; color: #15803d; font-size: 0.85rem;
}

.ingredients-flex-tray { display: flex; flex-wrap: wrap; gap: 10px; }
.ing-node-pill {
  background-color: #f5f5f4; border: 1px solid #d6d3d1; padding: 6px 16px; font-size: 0.9rem; border-radius: 20px; font-weight: 500; color: #1c1917;
}

/* Data Spec Information Table */
.minimalist-spec-table {
  width: 100%;
  border-collapse: collapse;
}
.minimalist-spec-table td {
  padding: 14px 20px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.95rem;
}
.minimalist-spec-table tr:last-child td { border-bottom: none; }
.minimalist-spec-table td:first-child {
  font-weight: 700;
  color: #57534e;
  width: 30%;
  background-color: #fefefe;
}
.minimalist-spec-table td:last-child {
  color: #1c1917;
  font-weight: 500;
}

/* MOBILE CONTEXT TRAY BAR */
.mobile-bottom-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: rgba(250, 246, 240, 0.96); backdrop-filter: blur(14px); border-top: 2px solid #cbd5e1; padding: 8px 0; justify-content: space-around; z-index: 200; }
.mob-item { display: flex; flex-direction: column; align-items: center; gap: 3px; text-decoration: none; color: #78716c; font-size: 11px; }
.mob-item span:first-child { font-size: 20px; }
.mob-item.router-link-active { color: #15803d; font-weight: 700; }

/* RESPONSIVE DESIGN CONTROLS */
@media (max-width: 1024px) {
  .rosier-top-split-grid { grid-template-columns: 1fr; gap: 30px; }
  .gallery-sticky-wrapper { position: relative; top: 0; }
  .rosier-focused-display-box { max-width: 450px; margin: 0 auto; }
}
@media (max-width: 767px) {
  .page { padding: 40px 16px 100px; }
  .mobile-bottom-nav { display: flex; }
  .gallery-sticky-wrapper { flex-direction: column-reverse; gap: 12px; }
  .rosier-side-strip-tray { flex-direction: row; width: 100%; overflow-x: auto; height: auto; }
  .strip-thumb-card { width: 56px; height: 56px; flex-shrink: 0; }
  .rosier-focused-display-box { max-width: 100%; }
  .rich-tab-nav-btn { padding: 14px 16px; font-size: 0.85rem; min-width: 140px; }
  .rich-tabs-content-body { padding: 20px; }
  .minimalist-spec-table td { font-size: 0.88rem; padding: 10px 12px; }
}
</style>