<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchActiveProducts } from './db.js'

defineOptions({ name: 'Home' })
const router = useRouter()
const activeFilter = ref('All')
const filters = ['All', 'Ghee & Oils', 'Juices', 'Spices & Herbs', 'Sweets']

const allProducts = ref([])
const loading = ref(true)
const displayLimit = ref(8) 

onMounted(async () => {
    try {
      loading.value = true
      allProducts.value = await fetchActiveProducts()
    } catch (e) { 
      console.error('Home mount error:', e) 
    } finally { 
      loading.value = false 
    }
})

const generateSlug = (name) => name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : 'product'
const goToProduct = (product) => router.push(`/product/${generateSlug(product.name)}--${product.id}`)

const products = computed(() => activeFilter.value === 'All' ? allProducts.value : allProducts.value.filter(p => p.category === activeFilter.value))
const visibleProducts = computed(() => products.value.slice(0, displayLimit.value))

const setFilter = (f) => { activeFilter.value = f; displayLimit.value = 8 }
const hasDiscount = (p) => p.discount?.isDiscounted && p.discount?.percent > 0
const isOutOfStock = (p) => p.stock === 0

// ✨ Calculates Minimum Price safely based on Variants (or fallback to old price structure)
const getMinBasePrice = (p) => {
    if (p.variants && p.variants.length > 0) {
        return Math.min(...p.variants.map(v => Number(v.price)))
    }
    return p.price || 0 // Graceful fallback
}

const displayPrice = (p) => {
    const minBase = getMinBasePrice(p)
    return hasDiscount(p) ? Math.round(minBase * (1 - p.discount.percent / 100)) : minBase
}

const primaryImage = (p) => p.imageUrls?.find(u => u?.trim()) ?? null
</script>

<template>
  <div class="page">
    <div class="hero">
      <div class="hero-badge">🌿 100% Natural | Handmade in Himalayas</div>
      <h1 class="hero-title">Pure Mountain Goodness,<br>Delivered to Your Door</h1>
      <p style="color: red; font-weight: bold;">⚠ Warning: This website is currently in a testing phase. All products shown are for demonstration purposes only.</p>
      <p class="hero-sub">No preservatives · Ethically sourced · Plastic‑free packaging</p>
    </div>

    <div class="section-head">
      <div class="section-title"><span class="leaf-icon">🌱</span> From our forest to your home <span class="count-pill">{{ products.length }}</span></div>
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
            <img v-if="primaryImage(product)" :src="primaryImage(product)" :alt="product.name" class="thumb-img" loading="lazy" />
            <div v-else class="emoji-fallback"><span>{{ product.emoji || '🌾' }}</span></div>
          </div>

          <div class="product-body">
            <h3 class="product-name">{{ product.name }}</h3>
            <p class="product-desc">{{ product.shortDesc || 'Pure Himalayan product.' }}</p>

            <div class="product-footer">
              <div class="price-block">
                <span v-if="hasDiscount(product)" class="price-original">₹{{ getMinBasePrice(product) }}</span>
                <span class="product-price">Starts at ₹{{ displayPrice(product) }}</span>
              </div>
            </div>

            <button class="add-btn" :disabled="isOutOfStock(product)" :class="{ 'add-btn-disabled': isOutOfStock(product) }">
              <template v-if="isOutOfStock(product)">🌱 Out of Stock</template>
              <template v-else>Select Options →</template>
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
  --footer-green: #0F2A1F; --footer-green-light: #2A5C3E; --gold: #C9A96E;
  --cream-bg: #FDFBF7; --warm-cream: #FAF3E0; --text-muted: #5A6E52; --white: #FFFFFF;
  --radius-lg: 28px; --radius-md: 20px;
  --shadow: 0 8px 24px rgba(15, 42, 31, 0.08); --shadow-hover: 0 16px 32px rgba(15, 42, 31, 0.12);
  background: linear-gradient(145deg, var(--cream-bg) 0%, var(--warm-cream) 100%);
  padding: 100px 28px; font-family: 'Inter', 'DM Sans', system-ui, sans-serif; min-height: 100vh;
}

.hero { background: linear-gradient(135deg, var(--footer-green) 0%, var(--footer-green-light) 100%); border-radius: var(--radius-lg); padding: 48px 40px; margin-bottom: 48px; text-align: center; box-shadow: var(--shadow); position: relative; overflow: hidden; }
.hero-badge { background: rgba(255,255,240,0.2); backdrop-filter: blur(4px); display: inline-block; padding: 6px 18px; border-radius: 40px; font-size: 12px; font-weight: 500; color: #F5EDE0; margin-bottom: 20px; }
.hero-title { font-family: 'Playfair Display', 'Georgia', serif; font-size: 38px; font-weight: 700; color: #F5EDE0; line-height: 1.2; margin-bottom: 16px; }
.hero-sub { font-size: 16px; color: rgba(245, 237, 224, 0.85); margin-bottom: 24px; }

.section-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 32px; }
.section-title { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 600; color: var(--footer-green); display: flex; align-items: center; gap: 10px; }
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

.product-thumb { height: 260px; background: #FEFCF5; display: flex; align-items: center; justify-content: center; overflow: hidden; border-bottom: 1px solid #F0F2E8; }
.thumb-img { width: 100%; height: 100%; object-fit: cover; }
.emoji-fallback { font-size: 64px; }

.product-body { padding: 16px; flex: 1; display: flex; flex-direction: column; }
.product-name { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 700; color: var(--footer-green); margin-bottom: 6px; }
.product-desc { font-size: 13px; color: var(--text-muted); line-height: 1.4; margin-bottom: 12px; flex: 1; }
.price-original { font-size: 13px; color: #B0BEA0; text-decoration: line-through; margin-right: 6px; }
.product-price { font-size: 18px; font-weight: 800; color: var(--gold); }

.add-btn { margin-top: 14px; width: 100%; background: transparent; color: var(--footer-green); border: 2px solid var(--footer-green); border-radius: 60px; padding: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.add-btn:hover:not(:disabled) { background: var(--footer-green); color: white; }
.add-btn-disabled { border-color: #E2E8D5; color: #A3B18A; cursor: not-allowed; }

.load-more-container { text-align: center; margin-top: 40px; }
.load-more-btn { background: transparent; border: 2px solid var(--footer-green-light); color: var(--footer-green-light); padding: 12px 30px; border-radius: 40px; font-size: 14px; font-weight: 600; cursor: pointer; }

@media (max-width: 1024px) { .product-grid { grid-template-columns: repeat(3, 1fr); gap: 24px; } .hero-title { font-size: 32px; } }
@media (max-width: 768px) { 
  .page { padding: 80px 16px 90px; } 
  .product-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; } 
  .hero-title { font-size: 26px; } 
  .product-thumb { height: 200px; } 
  .product-name { font-size: 16px; }
}
@media (max-width: 480px) { .product-thumb { height: 180px; } }
</style>