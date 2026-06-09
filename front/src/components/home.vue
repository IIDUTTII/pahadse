<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchActiveProducts, addProductToCart, fetchCart } from './db.js'

// ✨ Naye Imports Auth check ke liye
import { auth } from '../firebase.js' 
import { onAuthStateChanged } from 'firebase/auth'

defineOptions({ name: 'Home' })
const router = useRouter()
const activeFilter = ref('All')
const filters = ['All', 'Ghee & Oils', 'Juices', 'Spices & Herbs', 'Sweets']

const allProducts = ref([])
const loading = ref(true)
const inCartMap = ref({})

// Pagination state
const displayLimit = ref(8) 

onMounted(() => {
  // ✨ FIX: Firebase Auth ke initialize hone ka wait karenge
  onAuthStateChanged(auth, async (user) => {
    try {
      loading.value = true
      
      // 1. Fetch public active products (Sabke liye safe hai)
      allProducts.value = await fetchActiveProducts()
      
      // 2. Fetch cart ONLY agar user permanently logged in hai
      if (user) {
        const cartItems = await fetchCart()
        const map = {}
        cartItems.forEach(item => { map[item.productId] = true })
        inCartMap.value = map
      } else {
        // Agar bina login load kiya hai, toh cart map khali rakho
        inCartMap.value = {}
      }
    } catch (e) { 
      console.error('Home mount error:', e) 
    } finally { 
      loading.value = false 
    }
  })
})

const generateSlug = (name) => name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : 'product'
const goToProduct = (product) => router.push(`/product/${generateSlug(product.name)}--${product.id}`)

const addToCart = async (event, product) => {
  event.stopPropagation()
  if (inCartMap.value[product.id]) { router.push('/cart'); return }
  try {
    const finalPrice = hasDiscount(product) ? discountedPrice(product) : product.price
    await addProductToCart(product, finalPrice)
    inCartMap.value = { ...inCartMap.value, [product.id]: true }
  } catch (error) { 
    alert(error.message === 'NOT_LOGGED_IN' ? 'Please log in first to add items to your cart!' : 'Error: ' + error.message) 
  }
}

const products = computed(() => activeFilter.value === 'All' ? allProducts.value : allProducts.value.filter(p => p.category === activeFilter.value))
const visibleProducts = computed(() => products.value.slice(0, displayLimit.value))

const setFilter = (f) => {
  activeFilter.value = f
  displayLimit.value = 8
}

const hasDiscount = (p) => p.discount?.isDiscounted && p.discount?.percent > 0
const isOutOfStock = (p) => p.stock === 0
const discountedPrice = (p) => Math.round(p.price * (1 - p.discount.percent / 100))
const primaryImage = (p) => p.imageUrls?.find(u => u?.trim()) ?? null
</script>

<template>
  <div class="page">
    <div class="hero">
      <div class="hero-badge">🌿 100% Natural | Handmade in Himalayas</div>
     <h1 class="hero-title">
    Pure Mountain Goodness,<br>
    Delivered to Your Door
</h1>

<p style="color: red; font-weight: bold;">
    ⚠ Warning: This website is currently in a testing phase. All products shown are for demonstration purposes only and are not real products.
</p>
      
      <p class="hero-sub">No preservatives · Ethically sourced · Plastic‑free packaging</p>
      <div class="hero-stats">
        <span>🏔️ Free shipping over ₹499</span>
        <span>✨ 5000+ happy families</span>
      </div>
    </div>

    <div class="section-head">
      <div class="section-title">
        <span class="leaf-icon">🌱</span> 
        From our forest to your home
        <span class="count-pill">{{ products.length }}</span>
      </div>
      <div class="filter-pills">
        <span v-for="f in filters" :key="f" :class="['pill', { active: activeFilter === f }]" @click="setFilter(f)">{{ f }}</span>
      </div>
    </div>

    <div v-if="loading" class="product-grid"><div v-for="i in 8" :key="i" class="skeleton-card"></div></div>
    <div v-else-if="products.length === 0" class="empty-state"><span>🍃</span><p>No products in this category — explore others!</p></div>

    <div v-else>
      <div class="product-grid">
        <div v-for="product in visibleProducts" :key="product.id" class="product-card" @click="goToProduct(product)">
          <div v-if="isOutOfStock(product)" class="corner-badge sold-out">Sold Out</div>
          <div v-else-if="hasDiscount(product)" class="corner-badge discount">{{ product.discount.percent }}% Off</div>

          <div class="product-thumb">
            <img v-if="primaryImage(product)" :src="primaryImage(product)" :alt="product.name" class="thumb-img" loading="lazy" @error="$event.target.style.display='none'" />
            <div v-else class="emoji-fallback"><span>{{ product.emoji || '🌾' }}</span></div>
          </div>

          <div class="product-body">
            <h3 class="product-name">{{ product.name }}</h3>
            <p class="product-desc">{{ product.description }}</p>
            <div v-if="product.weight" class="weight-tag">{{ product.weight }}</div>

            <div class="product-footer">
              <div class="price-block">
                <span v-if="hasDiscount(product)" class="price-original">₹{{ product.price }}</span>
                <span class="product-price">₹{{ hasDiscount(product) ? discountedPrice(product) : product.price }}</span>
              </div>
              <div v-if="product.reviewCount > 0" class="rating">
                <span class="star">⭐</span> {{ product.ratingAverage?.toFixed(1) }} 
                <span class="review-count">({{ product.reviewCount }})</span>
              </div>
            </div>

            <button class="add-btn" :disabled="isOutOfStock(product)" :class="{ 'add-btn-disabled': isOutOfStock(product), 'add-btn-incart': inCartMap[product.id] && !isOutOfStock(product) }" @click.stop="addToCart($event, product)">
              <template v-if="isOutOfStock(product)">🌱 Out of Stock</template>
              <template v-else-if="inCartMap[product.id]">🛒 Go to Cart</template>
              <template v-else>+ Add to Cart</template>
            </button>
          </div>
        </div>
      </div>

      <div v-if="products.length > displayLimit" class="load-more-container">
        <button class="load-more-btn" @click="displayLimit += 8">↓ Discover More Products</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  --footer-green: #0F2A1F;
  --footer-green-light: #2A5C3E;
  --gold: #C9A96E;
  --cream-bg: #FDFBF7;
  --warm-cream: #FAF3E0;
  --text-dark: #2C2E2A;
  --text-muted: #5A6E52;
  --white: #FFFFFF;
  --radius-lg: 28px;
  --radius-md: 20px;
  --radius-sm: 14px;
  --shadow: 0 8px 24px rgba(15, 42, 31, 0.08);
  --shadow-hover: 0 16px 32px rgba(15, 42, 31, 0.12);
  
  background: linear-gradient(145deg, var(--cream-bg) 0%, var(--warm-cream) 100%);
  padding: 100px 28px;
  font-family: 'Inter', 'DM Sans', system-ui, sans-serif;
  min-height: 100vh;
}

.hero { background: linear-gradient(135deg, var(--footer-green) 0%, var(--footer-green-light) 100%); border-radius: var(--radius-lg); padding: 48px 40px; margin-bottom: 48px; text-align: center; box-shadow: var(--shadow); position: relative; overflow: hidden; }
.hero::before { content: "❄️🌿🏔️"; font-size: 140px; opacity: 0.06; position: absolute; bottom: -20px; right: -30px; pointer-events: none; }
.hero-badge { background: rgba(255,255,240,0.2); backdrop-filter: blur(4px); display: inline-block; padding: 6px 18px; border-radius: 40px; font-size: 12px; font-weight: 500; color: #F5EDE0; margin-bottom: 20px; }
.hero-title { font-family: 'Playfair Display', 'Georgia', serif; font-size: 38px; font-weight: 700; color: #F5EDE0; line-height: 1.2; margin-bottom: 16px; }
.hero-sub { font-size: 16px; color: rgba(245, 237, 224, 0.85); margin-bottom: 24px; }
.hero-stats { display: flex; gap: 24px; justify-content: center; font-size: 13px; font-weight: 500; color: #F5EDE0; }
.hero-stats span { background: rgba(255,255,240,0.15); padding: 6px 14px; border-radius: 40px; }

.section-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 32px; }
.section-title { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 600; color: var(--footer-green); display: flex; align-items: center; gap: 10px; }
.leaf-icon { font-size: 28px; }
.count-pill { background: var(--footer-green-light); color: white; font-size: 13px; padding: 2px 12px; border-radius: 40px; margin-left: 8px; }
.filter-pills { display: flex; gap: 12px; flex-wrap: wrap; }
.pill { background: white; border: 1.5px solid #D4E0C8; padding: 6px 20px; border-radius: 40px; font-size: 13px; font-weight: 500; color: var(--text-muted); cursor: pointer; transition: all 0.2s ease; }
.pill:hover, .pill.active { background: var(--footer-green-light); border-color: var(--footer-green-light); color: white; }

.product-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 28px; }
.skeleton-card { height: 380px; background: linear-gradient(90deg, #E9EFE3 25%, #F4F8ED 50%, #E9EFE3 75%); background-size: 200% 100%; border-radius: var(--radius-md); animation: shimmer 1.2s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.product-card { background: var(--white); border-radius: var(--radius-md); overflow: hidden; border: 1px solid #E2E8D5; box-shadow: var(--shadow); transition: all 0.25s ease; cursor: pointer; position: relative; display: flex; flex-direction: column; }
.product-card:hover { transform: translateY(-6px); box-shadow: var(--shadow-hover); border-color: var(--footer-green-light); }
.corner-badge { position: absolute; top: 14px; left: 14px; z-index: 2; font-size: 11px; font-weight: 700; padding: 5px 14px; border-radius: 40px; letter-spacing: 0.5px; }
.corner-badge.discount { background: var(--gold); color: var(--footer-green); }
.corner-badge.sold-out { background: var(--text-muted); color: white; }

.product-thumb { height: 220px; background: #FEFCF5; display: flex; align-items: center; justify-content: center; overflow: hidden; border-bottom: 1px solid #F0F2E8; }
.thumb-img { width: 100%; height: 100%; object-fit: contain; }
.emoji-fallback { font-size: 64px; background: linear-gradient(145deg, #E6EDDC, #F9F6EA); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }

.product-body { padding: 20px 18px; flex: 1; display: flex; flex-direction: column; }
.product-name { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 700; color: var(--footer-green); margin-bottom: 8px; }
.product-desc { font-size: 13px; color: var(--text-muted); line-height: 1.45; margin-bottom: 14px; flex: 1; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.weight-tag { font-size: 11px; font-weight: 600; background: #EDF3E5; color: var(--footer-green-light); padding: 3px 12px; border-radius: 40px; align-self: flex-start; margin-bottom: 14px; }
.product-footer { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
.price-block { display: flex; align-items: baseline; gap: 8px; }
.price-original { font-size: 13px; color: #B0BEA0; text-decoration: line-through; }
.product-price { font-size: 20px; font-weight: 800; color: var(--gold); }
.rating { font-size: 13px; color: #7B8A6F; display: flex; align-items: center; gap: 4px; }
.star { font-size: 14px; }
.review-count { font-size: 11px; color: #B2C0A4; }

.add-btn { margin-top: 16px; width: 100%; background: var(--footer-green); color: white; border: none; border-radius: 60px; padding: 12px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit; }
.add-btn:hover:not(:disabled) { background: var(--footer-green-light); transform: scale(0.98); }
.add-btn-disabled { background: #E2E8D5 !important; color: #A3B18A !important; cursor: not-allowed; }
.add-btn-incart { background: var(--gold) !important; color: var(--footer-green) !important; }

/* ✨ LOAD MORE CSS */
.load-more-container { text-align: center; margin-top: 40px; }
.load-more-btn { background: transparent; border: 2px solid var(--footer-green-light); color: var(--footer-green-light); padding: 12px 30px; border-radius: 40px; font-size: 14px; font-weight: 600; cursor: pointer; transition: 0.2s; }
.load-more-btn:hover { background: var(--footer-green-light); color: white; }

.empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
.empty-state span { font-size: 48px; display: block; margin-bottom: 12px; }

@media (max-width: 1024px) { .product-grid { grid-template-columns: repeat(3, 1fr); gap: 24px; } .hero-title { font-size: 32px; } }
@media (max-width: 768px) { .product-grid { grid-template-columns: repeat(2, 1fr); gap: 18px; } .mobile-bottom-nav { display: flex; } .page { padding: 80px 16px 90px; } .hero { padding: 32px 20px; } .hero-title { font-size: 26px; } .hero-stats { flex-direction: column; gap: 10px; align-items: center; } .product-thumb { height: 170px; } }
@media (max-width: 480px) { .product-grid { gap: 12px; } .product-thumb { height: 140px; } .product-body { padding: 12px; } .product-name { font-size: 15px; } }
</style>