<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchActiveProducts, addProductToCart, fetchCart } from './db.js'

defineOptions({ name: 'Home' })
const router = useRouter(), activeFilter = ref('All'), filters = ['All', 'Ghee & Oils', 'Juices', 'Spices & Herbs', 'Sweets']
const allProducts = ref([]), loading = ref(true), inCartMap = ref({})

onMounted(async () => {
  try {
    allProducts.value = await fetchActiveProducts()
    const cartItems = await fetchCart(), map = {}
    cartItems.forEach(item => { map[item.productId] = true })
    inCartMap.value = map
  } catch (e) { console.error('Home mount error:', e) } finally { loading.value = false }
})

// Generates uniform lowercase browser slugs
const generateSlug = (name) => name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : 'product'
const goToProduct = (product) => router.push(`/product/${generateSlug(product.name)}`)

const addToCart = async (event, product) => {
  event.stopPropagation()
  if (inCartMap.value[product.id]) { router.push('/cart'); return }
  try {
    const finalPrice = hasDiscount(product) ? discountedPrice(product) : product.price
    await addProductToCart(product, finalPrice)
    inCartMap.value = { ...inCartMap.value, [product.id]: true }
  } catch (error) { alert(error.message === 'NOT_LOGGED_IN' ? 'Please log in first to add items to your cart!' : 'Error: ' + error.message) }
}

const products = computed(() => activeFilter.value === 'All' ? allProducts.value : allProducts.value.filter(p => p.category === activeFilter.value))
const hasDiscount = (p) => p.discount?.isDiscounted && p.discount?.percent > 0
const isOutOfStock = (p) => p.stock === 0
const discountedPrice = (p) => Math.round(p.price * (1 - p.discount.percent / 100))
const primaryImage = (p) => p.imageUrls?.find(u => u?.trim()) ?? null
</script>

<template>
  <div class="page">
    <div class="hero-strip">
      <div>
        <div class="hero-title">Pure Himalayan Goodness,<br>Straight to Your Door</div>
        <div class="hero-sub">No preservatives · Handmade · 100% Natural</div>
      </div>
      <div class="hero-badge">🏔️ Free Shipping ₹499+</div>
    </div>

    <div class="section-head">
      <div class="section-title">Our Products <span class="count-pill">{{ products.length }}</span></div>
      <div class="filter-pills">
        <span v-for="f in filters" :key="f" :class="['pill', { active: activeFilter === f }]" @click="activeFilter = f">{{ f }}</span>
      </div>
    </div>

    <div v-if="loading" class="product-grid"><div v-for="i in 4" :key="i" class="skeleton-card"></div></div>
    <div v-else-if="products.length === 0" class="empty-state"><span>🏔️</span><p>Is category mein abhi koi product nahi hai</p></div>

    <div v-else class="product-grid">
      <div v-for="product in products" :key="product.id" class="product-card" @click="goToProduct(product)" role="button">
        <div v-if="isOutOfStock(product)" class="corner-badge sold-out">Sold Out</div>
        <div v-else-if="hasDiscount(product)" class="corner-badge discount">{{ product.discount.percent }}% OFF</div>

        <div class="product-thumb">
          <!-- 🚨 IMAGE COHERENCE CORRECTION: Fixed error statement to load assets reliably -->
          <img v-if="primaryImage(product)" :src="primaryImage(product)" :alt="product.name" class="thumb-img" loading="lazy" @error="$event.target.style.display='none'" />
          <div v-else class="emoji-fallback"><span>{{ product.emoji || '🍯' }}</span></div>
        </div>

        <div class="product-body">
          <div class="product-name">{{ product.name }}</div>
          <div class="product-desc">{{ product.description }}</div>
          <div v-if="product.weight" class="weight-tag">{{ product.weight }}</div>

          <div class="product-footer">
            <div class="price-block">
              <span v-if="hasDiscount(product)" class="price-original">₹{{ product.price }}</span>
              <span class="product-price">₹{{ hasDiscount(product) ? discountedPrice(product) : product.price }}</span>
            </div>
            <div v-if="product.reviewCount > 0" class="rating">⭐ {{ product.ratingAverage?.toFixed(1) }} <span class="review-count">({{ product.reviewCount }})</span></div>
          </div>

          <button class="add-btn" :disabled="isOutOfStock(product)" :class="{ 'add-btn-disabled': isOutOfStock(product), 'add-btn-incart': inCartMap[product.id] && !isOutOfStock(product) }" @click.stop="addToCart($event, product)">
            <template v-if="isOutOfStock(product)">Out of Stock</template>
            <template v-else-if="inCartMap[product.id]">🛒 Go to Cart</template>
            <template v-else>Add to Cart</template>
          </button>
        </div>
      </div>
    </div>

    <nav class="mobile-bottom-nav">
      <router-link to="/" class="mob-item"><span>🏠</span><span>Home</span></router-link>
      <router-link to="/policies" class="mob-item"><span>🛍️</span><span>Shop</span></router-link>
      <router-link to="/cart" class="mob-item"><span>🛒</span><span>Cart</span></router-link>
      <router-link to="/user" class="mob-item"><span>👤</span><span>Profile</span></router-link>
    </nav>
  </div>
</template>

<style scoped>
.page { --cream: #F5EFE0; --warm: #EDE0C4; --gold: #C8963E; --gold-lt: #F0C060; --brown: #5C3D1E; --brown-dk: #3A2410; --muted: #8A7560; --white: #FFFDF7; --radius: 14px; --shadow: 0 4px 24px rgba(92,61,30,0.10); padding: 100px 24px; font-family: 'DM Sans', sans-serif; background-color: #FAF6F0; }
.hero-strip { background: linear-gradient(120deg, var(--brown) 0%, #7A4E28 100%); border-radius: var(--radius); padding: 28px 32px; margin-bottom: 32px; display: flex; align-items: center; justify-content: space-between; gap: 20px; position: relative; overflow: hidden; }
.hero-title { font-family: 'Playfair Display', serif; font-size: 26px; color: var(--cream); font-weight: 700; line-height: 1.3; }
.hero-sub { font-size: 13px; color: rgba(245,239,224,0.65); margin-top: 8px; }
.hero-badge { background: var(--gold-lt); color: var(--brown-dk); padding: 9px 20px; border-radius: 30px; font-size: 13px; font-weight: 600; }
.section-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
.section-title { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: var(--brown-dk); display: flex; align-items: center; gap: 8px; }
.count-pill { font-size: 12px; background: var(--warm); color: var(--muted); padding: 2px 10px; border-radius: 20px; }
.filter-pills { display: flex; gap: 8px; flex-wrap: wrap; }
.pill { padding: 6px 16px; border-radius: 999px; border: 1.5px solid var(--warm); background: var(--white); font-size: 12px; font-weight: 500; color: var(--muted); cursor: pointer; transition: .2s; }
.pill:hover, .pill.active { background: var(--gold); border-color: var(--gold); color: #fff; }

.product-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
.skeleton-card { height: 360px; border-radius: var(--radius); background: linear-gradient(90deg, var(--warm) 25%, #F0E6C8 50%, var(--warm) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.empty-state { text-align: center; padding: 60px 20px; color: var(--muted); }
.empty-state span { font-size: 48px; display: block; margin-bottom: 12px; }

.product-card { background: var(--white); border-radius: var(--radius); overflow: hidden; border: 2px solid var(--warm); box-shadow: var(--shadow); transition: transform .22s, box-shadow .22s; cursor: pointer; position: relative; display: flex; flex-direction: column; }
.product-card:hover { transform: translateY(-5px); box-shadow: 0 16px 36px rgba(92,61,30,0.16); }
.corner-badge { position: absolute; top: 12px; left: 12px; z-index: 2; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; }
.corner-badge.discount { background: var(--gold); color: #fff; }
.corner-badge.sold-out { background: var(--brown-dk); color: #F5EFE0; }

.product-thumb { width: 100%; height: 210px; display: flex; align-items: center; justify-content: center; background: #ffffff; overflow: hidden; position: relative; border-bottom: 1px solid var(--warm); }
.thumb-img { width: 100%; height: 100%; object-fit: cover; z-index: 2; position: relative; }
.emoji-fallback { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 64px; background: linear-gradient(135deg, var(--warm) 0%, #E8D5B0 100%); z-index: 1; }

.product-body { padding: 16px; flex: 1; display: flex; flex-direction: column; }
.product-name { font-family: 'Playfair Display', serif; font-size: 16px; font-weight: 700; color: var(--brown-dk); margin-bottom: 6px; }
.product-desc { font-size: 12px; color: var(--muted); line-height: 1.4; margin-bottom: 12px; flex: 1; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.weight-tag { display: inline-block; font-size: 10px; font-weight: 700; background: var(--warm); color: var(--brown); padding: 2px 10px; border-radius: 999px; align-self: flex-start; margin-bottom: 12px; }
.product-footer { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.price-block { display: flex; align-items: baseline; gap: 6px; }
.price-original { font-size: 12px; color: var(--muted); text-decoration: line-through; }
.product-price { font-size: 17px; font-weight: 800; color: var(--gold); }
.rating { font-size: 12px; font-weight: 600; color: var(--muted); display: flex; align-items: center; gap: 2px; }
.review-count { font-size: 11px; color: #a1a1aa; }
.add-btn { margin-top: 12px; width: 100%; background: var(--brown); color: var(--cream); border: none; border-radius: 8px; padding: 11px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .2s; text-transform: uppercase; letter-spacing: 0.5px; }
.add-btn:hover:not(:disabled) { background: var(--brown-dk); }
.add-btn-disabled { background: var(--warm) !important; color: var(--muted) !important; cursor: not-allowed; }
.add-btn-incart { background: var(--gold) !important; color: #fff !important; }

.mobile-bottom-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,253,247,0.96); backdrop-filter: blur(14px); border-top: 1.5px solid var(--warm); padding: 8px 0; justify-content: space-around; z-index: 200; }
.mob-item { display: flex; flex-direction: column; align-items: center; gap: 3px; text-decoration: none; color: var(--muted); font-size: 11px; }
.mob-item span:first-child { font-size: 20px; }
.mob-item.router-link-active { color: var(--gold); }

@media (max-width: 1024px) { .product-grid { grid-template-columns: repeat(3, 1fr); gap: 20px; } }
@media (max-width: 768px) { .product-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; } .mobile-bottom-nav { display: flex; } .hero-title { font-size: 22px; } .product-thumb { height: 170px; } }
@media (max-width: 480px) { .product-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } .page { padding: 80px 10px 80px; } .hero-strip { padding: 16px; } .hero-title { font-size: 18px; } .product-thumb { height: 135px; } .emoji-fallback { font-size: 48px; } .product-name { font-size: 14px; } .product-body { padding: 10px; } }
</style>