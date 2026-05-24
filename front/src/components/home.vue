<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchActiveProducts,
  addProductToCart,
  isProductInCart,
  fetchCart,
} from './db.js'

defineOptions({ name: 'Home' })

const router = useRouter()

// ── Category filter
const activeFilter = ref('All')
const filters = ['All', 'Ghee & Oils', 'Juices', 'Spices & Herbs', 'Sweets']

// ── Products
const allProducts  = ref([])
const loading      = ref(true)

// ── Per-product cart state map  { productId: boolean }
// Loaded once on mount so every card knows if it's already in cart
// without additional Firestore reads.
const inCartMap = ref({})

onMounted(async () => {
  try {
    allProducts.value = await fetchActiveProducts()  // cached after first call

    // Pre-load cart items ONCE and build the lookup map
    // This is a single Firestore read — no per-product read inside the loop.
    const cartItems = await fetchCart()
    const map = {}
    cartItems.forEach(item => { map[item.productId] = true })
    inCartMap.value = map
  } catch (e) {
    console.error('Home mount error:', e)
  } finally {
    loading.value = false
  }
})

// ── Navigate to product detail
function goToProduct(productId) {
  router.push(`/product/${productId}`)
}

// ── Add to Cart or Go to Cart (if already in cart)
const addToCart = async (event, product) => {
  event.stopPropagation()

  // Already in cart → navigate instead of re-adding
  if (inCartMap.value[product.id]) {
    router.push('/cart')
    return
  }

  try {
    const finalPrice = hasDiscount(product)
      ? discountedPrice(product)
      : product.price
    await addProductToCart(product, finalPrice)
    // Update local map immediately — no extra Firestore read needed
    inCartMap.value = { ...inCartMap.value, [product.id]: true }
  } catch (error) {
    if (error.message === 'NOT_LOGGED_IN') {
      alert('Please log in first to add items to your cart!')
    } else {
      alert('Error: ' + error.message)
    }
  }
}

// ── Local filter — zero extra DB calls
const products = computed(() => {
  if (activeFilter.value === 'All') return allProducts.value
  return allProducts.value.filter(p => p.category === activeFilter.value)
})

// ── Helpers
function hasDiscount(p)      { return p.discount?.isDiscounted && p.discount?.percent > 0 }
function isOutOfStock(p)     { return p.stock === 0 }
function discountedPrice(p)  { return Math.round(p.price * (1 - p.discount.percent / 100)) }
function primaryImage(p)     { return p.imageUrls?.find(u => u?.trim()) ?? null }
function galleryImages(p)    { return (p.imageUrls ?? []).filter(u => u?.trim()).slice(0, 4) }
function hasImages(p)        { return galleryImages(p).length > 0 }

// Per-card active gallery index — keyed by product id
const activeImageIndex = ref({})
function setImage(productId, index) {
  activeImageIndex.value = { ...activeImageIndex.value, [productId]: index }
}
function getActiveImage(p) {
  const idx   = activeImageIndex.value[p.id] ?? 0
  const imgs  = galleryImages(p)
  return imgs[idx] ?? null
}
</script>

<template>
  <div class="page">

    <!-- Hero Banner -->
    <div class="hero-strip">
      <div>
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
      <div
        v-for="product in products"
        :key="product.id"
        class="product-card"
        @click="goToProduct(product.id)"
        role="button"
        :aria-label="`View ${product.name} details`"
      >
        <!-- Corner badge -->
        <div v-if="isOutOfStock(product)" class="corner-badge sold-out">Sold Out</div>
        <div v-else-if="hasDiscount(product)" class="corner-badge discount">
          {{ product.discount.percent }}% OFF
        </div>

        <!-- ── Thumb: real image OR emoji fallback ── -->
        <div class="product-thumb">
          <!-- If product has images, show the active one -->
          <template v-if="hasImages(product)">
            <img
              :src="getActiveImage(product)"
              :alt="product.name"
              class="thumb-img"
              loading="lazy"
              @error="$event.target.style.display='none'; $event.target.nextElementSibling.style.display='flex'"
            />
            <!-- Fallback emoji shown if image fails to load -->
            <div class="emoji-fallback" style="display:none">
              <span>{{ product.emoji }}</span>
            </div>
          </template>
          <!-- No images at all → emoji -->
          <template v-else>
            <span class="product-emoji">{{ product.emoji }}</span>
          </template>
        </div>

        <!-- Gallery strip — only shown when product has >1 image -->
        <div
          v-if="galleryImages(product).length > 1"
          class="gallery-strip"
          @click.stop
        >
          <div
            v-for="(url, idx) in galleryImages(product)"
            :key="idx"
            :class="['gallery-dot-thumb', { active: (activeImageIndex[product.id] ?? 0) === idx }]"
            @click.stop="setImage(product.id, idx)"
          >
            <img :src="url" :alt="`${product.name} image ${idx+1}`" loading="lazy" />
          </div>
        </div>

        <!-- Info body -->
        <div class="product-body">
          <div class="product-name">{{ product.name }}</div>
          <div class="product-desc">{{ product.description }}</div>
          <div v-if="product.weight" class="weight-tag">{{ product.weight }}</div>

          <div class="product-footer">
            <div class="price-block">
              <span v-if="hasDiscount(product)" class="price-original">₹{{ product.price }}</span>
              <span class="product-price">
                ₹{{ hasDiscount(product) ? discountedPrice(product) : product.price }}
              </span>
            </div>
            <div v-if="product.reviewCount > 0" class="rating">
              ⭐ {{ product.ratingAverage?.toFixed(1) }}
              <span class="review-count">({{ product.reviewCount }})</span>
            </div>
          </div>

          <!-- Add to Cart  ←→  Go to Cart toggle -->
          <button
            class="add-btn"
            :disabled="isOutOfStock(product)"
            :class="{
              'add-btn-disabled' : isOutOfStock(product),
              'add-btn-incart'   : inCartMap[product.id] && !isOutOfStock(product),
            }"
            @click.stop="addToCart($event, product)"
          >
            <template v-if="isOutOfStock(product)">Out of Stock</template>
            <template v-else-if="inCartMap[product.id]">🛒 Go to Cart</template>
            <template v-else>Add to Cart</template>
          </button>
        </div>

      </div>
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
  --cream:    #F5EFE0;
  --warm:     #EDE0C4;
  --gold:     #C8963E;
  --gold-lt:  #F0C060;
  --brown:    #5C3D1E;
  --brown-dk: #3A2410;
  --muted:    #8A7560;
  --white:    #FFFDF7;
  --green:    #3D6B4A;
  --radius:   14px;
  --shadow:   0 4px 24px rgba(92,61,30,0.10);

  padding-top: 88px;
  padding-left: 24px;
  padding-right: 24px;
  padding-bottom: 100px;
  font-family: 'DM Sans', sans-serif;
}

/* HERO */
.hero-strip {
  background: linear-gradient(120deg, var(--brown) 0%, #7A4E28 100%);
  border-radius: var(--radius);
  padding: 28px 32px; margin-bottom: 32px;
  display: flex; align-items: center; justify-content: space-between; gap: 20px;
  position: relative; overflow: hidden;
}
.hero-strip::after { content: '🏔️'; position: absolute; right: 160px; top: 50%; transform: translateY(-50%); font-size: 70px; opacity: .10; pointer-events: none; }
.hero-title { font-family: 'Playfair Display', serif; font-size: 26px; color: var(--cream); font-weight: 700; line-height: 1.3; }
.hero-sub   { font-size: 13px; color: rgba(245,239,224,0.65); margin-top: 8px; }
.hero-badge { background: var(--gold-lt); color: var(--brown-dk); padding: 9px 20px; border-radius: 30px; font-size: 13px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
@media (max-width: 600px) {
  .hero-strip { flex-direction: column; align-items: flex-start; padding: 20px; }
  .hero-strip::after { right: 10px; opacity: .07; }
  .hero-title { font-size: 20px; }
}

/* SECTION */
.section-head  { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
.section-title { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: var(--brown-dk); display: flex; align-items: center; gap: 8px; }
.count-pill    { font-size: 12px; background: var(--warm); color: var(--muted); padding: 2px 10px; border-radius: 20px; font-family: 'DM Sans', sans-serif; }
.filter-pills  { display: flex; gap: 8px; flex-wrap: wrap; }
.pill          { padding: 6px 16px; border-radius: 999px; border: 1.5px solid var(--warm); background: var(--white); font-size: 12px; font-weight: 500; color: var(--muted); cursor: pointer; transition: all .2s; user-select: none; }
.pill:hover, .pill.active { background: var(--gold); border-color: var(--gold); color: #fff; }

/* SKELETONS */
.skeleton-card { height: 320px; border-radius: var(--radius); background: linear-gradient(90deg, var(--warm) 25%, #F0E6C8 50%, var(--warm) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

/* EMPTY */
.empty-state      { text-align: center; padding: 60px 20px; color: var(--muted); }
.empty-state span { font-size: 48px; display: block; margin-bottom: 12px; }

/* GRID */
.product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 18px; }
@media (max-width: 480px) { .product-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; } }

/* CARD */
.product-card {
  background: var(--white); border-radius: var(--radius); overflow: hidden;
  border: 1.5px solid var(--warm); box-shadow: var(--shadow);
  transition: transform .22s, box-shadow .22s;
  cursor: pointer; position: relative;
}
.product-card:hover { transform: translateY(-4px); box-shadow: 0 12px 36px rgba(92,61,30,0.14); }
.product-card:active { transform: scale(0.98); }

/* BADGES */
.corner-badge         { position: absolute; top: 10px; left: 10px; z-index: 2; font-size: 10px; font-weight: 700; padding: 4px 9px; border-radius: 999px; letter-spacing: .3px; }
.corner-badge.discount { background: var(--gold); color: #fff; }
.corner-badge.sold-out { background: #3A2410; color: #F5EFE0; }

/* THUMB — fixed height, image or emoji */
.product-thumb {
  width: 100%; height: 160px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--warm) 0%, #E8D5B0 100%);
  overflow: hidden; position: relative;
}
.thumb-img {
  width: 100%; height: 100%; object-fit: cover;
  transition: transform .3s;
}
.product-card:hover .thumb-img { transform: scale(1.04); }
.product-emoji  { font-size: 54px; }
.emoji-fallback { width: 100%; height: 100%; align-items: center; justify-content: center; font-size: 54px; }

/* GALLERY STRIP — small thumbnail row below the main image */
.gallery-strip {
  display: flex; gap: 5px; padding: 6px 8px;
  background: var(--warm); overflow-x: auto;
  scrollbar-width: none;
}
.gallery-strip::-webkit-scrollbar { display: none; }
.gallery-dot-thumb {
  width: 40px; height: 40px; flex-shrink: 0;
  border-radius: 6px; overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer; transition: border-color .15s;
}
.gallery-dot-thumb.active { border-color: var(--gold); }
.gallery-dot-thumb img { width: 100%; height: 100%; object-fit: cover; }

/* INFO BODY */
.product-body  { padding: 13px; }
.product-name  { font-family: 'Playfair Display', serif; font-size: 14px; font-weight: 600; color: var(--brown-dk); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.product-desc  { font-size: 11px; color: var(--muted); line-height: 1.4; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.weight-tag    { display: inline-block; font-size: 10px; background: var(--warm); color: var(--muted); padding: 2px 8px; border-radius: 999px; margin-bottom: 8px; }

.product-footer { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
.price-block    { display: flex; align-items: baseline; gap: 5px; }
.price-original { font-size: 11px; color: var(--muted); text-decoration: line-through; }
.product-price  { font-size: 15px; font-weight: 700; color: var(--gold); }
.rating         { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 2px; }
.review-count   { font-size: 10px; }

/* CTA BUTTON */
.add-btn          { margin-top: 10px; width: 100%; background: var(--brown); color: var(--cream); border: none; border-radius: 8px; padding: 9px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background .2s; position: relative; z-index: 1; }
.add-btn:hover:not(:disabled) { background: var(--brown-dk); }
.add-btn-disabled { background: var(--warm) !important; color: var(--muted) !important; cursor: not-allowed; }
/* "Go to Cart" state — gold highlight */
.add-btn-incart   { background: var(--gold) !important; color: #fff !important; }
.add-btn-incart:hover { background: #b07828 !important; }

/* MOBILE BOTTOM NAV */
.mobile-bottom-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,253,247,0.96); backdrop-filter: blur(14px); border-top: 1.5px solid var(--warm); padding: 8px 0; justify-content: space-around; z-index: 200; }
@media (max-width: 767px) { .mobile-bottom-nav { display: flex; } }
.mob-item { display: flex; flex-direction: column; align-items: center; gap: 3px; text-decoration: none; color: var(--muted); font-size: 11px; padding: 4px 14px; border-radius: 10px; transition: color .2s; }
.mob-item span:first-child { font-size: 20px; }
.mob-item.router-link-active { color: var(--gold); }
</style>