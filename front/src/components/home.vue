<script setup>
import { ref, computed, onMounted } from 'vue'
// 🛠️ FIXED: Changed '../' to './' because both files are in the components folder
import { fetchActiveProducts, addProductToCart } from './productService.js'



defineOptions({ name: 'Home' })

// ── Category filter
const activeFilter = ref('All')
const filters = ['All', 'Ghee & Oils', 'Juices', 'Spices & Herbs', 'Sweets']

// ── Products
const allProducts = ref([])
const loading     = ref(true)

onMounted(async () => {
  try {
    allProducts.value = await fetchActiveProducts()
  } catch (e) {
    console.error('DB error:', e)
  } finally {
    loading.value = false
  }
})

// 🛒 Add to cart
const addToCart = async (product) => {
  try {
    const finalPrice = hasDiscount(product) ? discountedPrice(product) : product.price
    await addProductToCart(product, finalPrice)
    alert(`${product.name} saved securely to your cloud cart! 🏔️`)
  } catch (error) {
    if (error.message === 'NOT_LOGGED_IN') {
      alert('Please log in first to add items to your cart!')
    } else {
      alert('Database error: ' + error.message)
    }
  }
}

// Local filter — no extra DB call
const products = computed(() => {
  if (activeFilter.value === 'All') return allProducts.value
  return allProducts.value.filter(p => p.category === activeFilter.value)
})

// ── Helpers
function hasDiscount(p)     { return p.discount?.isDiscounted && p.discount?.percent > 0 }
function isOutOfStock(p)    { return p.stock === 0 }
function discountedPrice(p) { return Math.round(p.price * (1 - p.discount.percent / 100)) }

// Badge label like in the image: ORGANIC, FARM FRESH, LIMITED, etc.
function badgeLabel(p) {
  if (isOutOfStock(p))    return 'SOLD OUT'
  if (hasDiscount(p))     return `${p.discount.percent}% OFF`
  if (p.badge)            return p.badge.toUpperCase()
  return null
}
</script>

<template>
  <div class="page">

    <!-- Hero Banner -->
    <div class="hero-strip">
      <div class="hero-text">
        <div class="hero-eyebrow">✦ FROM THE HILLS</div>
        <div class="hero-title">Pure Himalayan Goodness,<br>Straight to Your Door</div>
        <div class="hero-sub">No preservatives · Handmade · 100% Natural</div>
      </div>
      <div class="hero-badge">🏔️ Free Shipping ₹499+</div>
    </div>

    <!-- Section head + filter pills -->
    <div class="section-head">
      <div class="section-title">
        Our Products
        <span class="count-pill">{{ products.length }}</span>
      </div>
      <div class="filter-pills">
        <span
          v-for="f in filters" :key="f"
          :class="['pill', { active: activeFilter === f }]"
          @click="activeFilter = f"
        >{{ f }}</span>
      </div>
    </div>

    <!-- Loading skeletons -->
    <div v-if="loading" class="product-grid">
      <div v-for="i in 6" :key="i" class="skeleton-card"></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="products.length === 0" class="empty-state">
      <span>🏔️</span>
      <p>Is category mein abhi koi product nahi hai</p>
    </div>

    <!-- Product Grid -->
    <div v-else class="product-grid">
      <div v-for="product in products" :key="product.id" class="product-card">

        <!-- Top image area with mountain silhouette bg + badge -->
        <div class="product-thumb" :class="{ 'thumb-sold': isOutOfStock(product) }">
          <div v-if="badgeLabel(product)" class="corner-badge"
               :class="{
                 'badge-sold':     isOutOfStock(product),
                 'badge-discount': hasDiscount(product) && !isOutOfStock(product),
                 'badge-default':  !isOutOfStock(product) && !hasDiscount(product)
               }">
            {{ badgeLabel(product) }}
          </div>
          <span class="product-emoji">{{ product.emoji }}</span>
          <!-- Mountain silhouette SVG (matches image aesthetic) -->
          <svg class="mountain-svg" viewBox="0 0 320 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <polygon points="0,80 60,30 100,50 160,10 220,45 270,25 320,50 320,80" fill="rgba(180,150,110,0.25)"/>
            <polygon points="0,80 80,45 130,65 200,30 260,55 320,35 320,80" fill="rgba(160,130,90,0.18)"/>
          </svg>
        </div>

        <!-- Info -->
        <div class="product-body">
          <div class="product-category">{{ product.category || 'HIMALAYAN HARVEST' }}</div>
          <div class="product-name">{{ product.name }}</div>

          <div class="product-footer">
            <div class="price-block">
              <span v-if="hasDiscount(product)" class="price-original">₹{{ product.price }}</span>
              <span class="product-price">
                ₹{{ hasDiscount(product) ? discountedPrice(product) : product.price }}
              </span>
            </div>
            <button class="add-btn-circle" :disabled="isOutOfStock(product)"
              :class="{ 'add-btn-disabled': isOutOfStock(product) }"
              @click="addToCart(product)" :title="isOutOfStock(product) ? 'Out of Stock' : 'Add to Cart'">
              <span v-if="!isOutOfStock(product)">+</span>
              <span v-else style="font-size:10px">✕</span>
            </button>
          </div>

          <div v-if="product.weight" class="weight-tag">{{ product.weight }}</div>

          <div v-if="product.reviewCount > 0" class="rating">
            ⭐ {{ product.ratingAverage?.toFixed(1) }}
            <span class="review-count">({{ product.reviewCount }})</span>
          </div>
        </div>

      </div>
    </div>

    <!-- Story section (matches image bottom section) -->
    <div class="story-section">
      <div class="story-eyebrow">✦ OUR STORY</div>
      <div class="story-title">Rooted in the<br><span class="story-accent">Mountains</span></div>
      <p class="story-body">We work directly with Himalayan farmers to bring pure, honest food to your table.</p>
    </div>

    <!-- Mobile bottom nav -->
    <nav class="mobile-bottom-nav">
      <router-link to="/"         class="mob-item"><span>🏠</span><span>Home</span></router-link>
      <router-link to="/policies" class="mob-item"><span>🛍️</span><span>Shop</span></router-link>
      <router-link to="/cart"     class="mob-item"><span>🛒</span><span>Cart</span></router-link>
      <router-link to="/user"     class="mob-item"><span>👤</span><span>Profile</span></router-link>
    </nav>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');

.page {
  --cream:      #F5EDE0;
  --warm:       #E8D5B5;
  --warm-lt:    #F0E4CC;
  --gold:       #B8832A;
  --gold-lt:    #D4A855;
  --brown:      #5C3D1E;
  --brown-dk:   #3A2410;
  --brown-md:   #7A5230;
  --muted:      #8A7055;
  --card-bg:    #FAF3E8;
  --thumb-bg:   #EDD9B5;
  --white:      #FFFDF7;
  --radius:     16px;
  --shadow:     0 2px 16px rgba(92,61,30,0.10);

  padding-top: 96px;
  padding-left: 20px;
  padding-right: 20px;
  padding-bottom: 110px;
  font-family: 'DM Sans', sans-serif;
  background: var(--cream);
  min-height: 100vh;
}

/* HERO ──────────────────────────────── */
.hero-strip {
  background: linear-gradient(118deg, #4A2E10 0%, #6B3D18 55%, #8A5025 100%);
  border-radius: var(--radius);
  padding: 32px 28px;
  margin-bottom: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  position: relative;
  overflow: hidden;
}
.hero-strip::before {
  content: '';
  position: absolute; inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  pointer-events: none;
}
.hero-eyebrow {
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(245,237,224,0.55);
  margin-bottom: 10px;
  font-weight: 500;
}
.hero-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 28px;
  font-weight: 700;
  color: var(--cream);
  line-height: 1.25;
}
.hero-sub {
  font-size: 12px;
  color: rgba(245,237,224,0.55);
  margin-top: 10px;
  letter-spacing: 0.3px;
}
.hero-badge {
  background: var(--gold-lt);
  color: var(--brown-dk);
  padding: 10px 20px;
  border-radius: 30px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}
@media (max-width: 600px) {
  .hero-strip  { flex-direction: column; align-items: flex-start; padding: 22px 20px; }
  .hero-title  { font-size: 22px; }
}

/* SECTION HEAD ──────────────────────── */
.section-head  { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 22px; }
.section-title { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 700; color: var(--brown-dk); display: flex; align-items: center; gap: 8px; }
.count-pill    { font-size: 11px; background: var(--warm); color: var(--muted); padding: 3px 11px; border-radius: 20px; font-family: 'DM Sans', sans-serif; font-weight: 500; }
.filter-pills  { display: flex; gap: 8px; flex-wrap: wrap; }
.pill          { padding: 6px 16px; border-radius: 999px; border: 1.5px solid var(--warm); background: var(--white); font-size: 12px; font-weight: 500; color: var(--muted); cursor: pointer; transition: all .2s; user-select: none; }
.pill:hover, .pill.active { background: var(--brown); border-color: var(--brown); color: #fff; }

/* SKELETON ──────────────────────────── */
.skeleton-card { height: 300px; border-radius: var(--radius); background: linear-gradient(90deg, var(--warm) 25%, var(--warm-lt) 50%, var(--warm) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

/* EMPTY ─────────────────────────────── */
.empty-state      { text-align: center; padding: 60px 20px; color: var(--muted); }
.empty-state span { font-size: 48px; display: block; margin-bottom: 12px; }

/* GRID ──────────────────────────────── */
.product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
@media (max-width: 480px) { .product-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; } }

/* CARD ──────────────────────────────── */
.product-card {
  background: var(--card-bg);
  border-radius: var(--radius);
  overflow: hidden;
  border: 1.5px solid var(--warm);
  box-shadow: var(--shadow);
  transition: transform .22s, box-shadow .22s;
  position: relative;
}
.product-card:hover { transform: translateY(-3px); box-shadow: 0 10px 32px rgba(92,61,30,0.14); }

/* THUMB (image area) ────────────────── */
.product-thumb {
  width: 100%;
  height: 160px;
  background: var(--thumb-bg);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.product-thumb.thumb-sold { opacity: 0.7; }

.mountain-svg {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  width: 100%; height: 50%;
  pointer-events: none;
}

.product-emoji { font-size: 62px; z-index: 1; position: relative; }

/* BADGE ─────────────────────────────── */
.corner-badge {
  position: absolute; top: 10px; left: 10px; z-index: 3;
  font-size: 9px; font-weight: 700; letter-spacing: 0.8px;
  padding: 4px 10px; border-radius: 999px;
  font-family: 'DM Sans', sans-serif;
}
.badge-default  { background: rgba(58,36,16,0.85); color: var(--cream); }
.badge-discount { background: var(--gold); color: #fff; }
.badge-sold     { background: #2C3520; color: #F5EDE0; }

/* BODY ──────────────────────────────── */
.product-body     { padding: 14px 14px 12px; }
.product-category {
  font-size: 9px; font-weight: 700; letter-spacing: 1.2px;
  text-transform: uppercase; color: var(--muted);
  margin-bottom: 5px;
}
.product-name {
  font-family: 'Cormorant Garamond', serif;
  font-size: 20px; font-weight: 700;
  color: var(--brown-dk); line-height: 1.15;
  margin-bottom: 10px;
}

.product-footer {
  display: flex; align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.price-block    { display: flex; align-items: baseline; gap: 5px; flex-direction: column; }
.price-original { font-size: 11px; color: var(--muted); text-decoration: line-through; line-height: 1; }
.product-price  { font-size: 22px; font-weight: 700; color: var(--brown-dk); font-family: 'Cormorant Garamond', serif; line-height: 1; }

/* Circle + button — matches image exactly */
.add-btn-circle {
  width: 40px; height: 40px;
  background: var(--brown-dk);
  color: var(--cream);
  border: none; border-radius: 10px;
  font-size: 22px; line-height: 1;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: background .2s, transform .15s;
  font-family: 'DM Sans', sans-serif;
  font-weight: 300;
}
.add-btn-circle:hover:not(:disabled) { background: var(--brown); transform: scale(1.07); }
.add-btn-disabled { background: var(--warm) !important; color: var(--muted) !important; cursor: not-allowed; transform: none !important; }

.weight-tag  { display: inline-block; font-size: 11px; color: var(--muted); margin-top: 2px; }
.rating      { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 3px; margin-top: 6px; }
.review-count{ font-size: 10px; }

/* STORY SECTION ─────────────────────── */
.story-section {
  background: var(--brown-dk);
  border-radius: var(--radius);
  padding: 36px 28px;
  margin-top: 40px;
  color: var(--cream);
}
.story-eyebrow {
  font-size: 11px; letter-spacing: 2px;
  color: rgba(245,237,224,0.50);
  margin-bottom: 12px; font-weight: 500;
}
.story-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 34px; font-weight: 700;
  line-height: 1.15; margin-bottom: 14px;
  color: var(--cream);
}
.story-accent { color: var(--gold-lt); font-style: italic; }
.story-body   { font-size: 14px; color: rgba(245,237,224,0.65); line-height: 1.7; max-width: 480px; }

/* MOBILE BOTTOM NAV ─────────────────── */
.mobile-bottom-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,253,247,0.96); backdrop-filter: blur(14px); border-top: 1.5px solid var(--warm); padding: 8px 0; justify-content: space-around; z-index: 200; }
@media (max-width: 767px) { .mobile-bottom-nav { display: flex; } }
.mob-item { display: flex; flex-direction: column; align-items: center; gap: 3px; text-decoration: none; color: var(--muted); font-size: 11px; padding: 4px 14px; border-radius: 10px; transition: color .2s; }
.mob-item span:first-child { font-size: 20px; }
.mob-item.router-link-active { color: var(--gold); }
</style>