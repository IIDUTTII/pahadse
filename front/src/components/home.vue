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
  try { loading.value = true; allProducts.value = await fetchActiveProducts() }
  catch (e) { console.error('Home mount error:', e) }
  finally { loading.value = false }
})

const generateSlug = (name) => name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : 'product'
const goToProduct = (product) => router.push(`/product/${generateSlug(product.name)}--${product.id}`)

const products = computed(() => activeFilter.value === 'All' ? allProducts.value : allProducts.value.filter(p => p.category === activeFilter.value))
const visibleProducts = computed(() => products.value.slice(0, displayLimit.value))

const setFilter = (f) => { activeFilter.value = f; displayLimit.value = 8 }
const hasDiscount = (p) => p.discount?.isDiscounted && p.discount?.percent > 0
const isOutOfStock = (p) => p.stock === 0

const getMinBasePrice = (p) => {
  if (p.variants && p.variants.length > 0) return Math.min(...p.variants.map(v => Number(v.price)))
  return p.price || 0
}
const displayPrice = (p) => {
  const minBase = getMinBasePrice(p)
  return hasDiscount(p) ? Math.round(minBase * (1 - p.discount.percent / 100)) : minBase
}
const primaryImage = (p) => p.imageUrls?.find(u => u?.trim()) ?? null
</script>

<template>
  <div class="page">
    <div class="page-inner">
      
      <!-- Premium Hero Banner (Restored) -->
      <div class="hero">
        <div class="hero-badge">🌿 100% Natural | Handmade in Himalayas</div>
        <h1 class="hero-title">Pure Mountain Goodness,<br>Delivered to Your Door</h1>
        <p class="hero-demo-warn">⚠ Testing phase — demo products only</p>
        <p class="hero-sub">No preservatives · Ethically sourced · Plastic‑free packaging</p>
      </div>

      <div class="content-wrapper">
        <div class="section-head">
          <div class="section-title">
            <span class="leaf-icon">🌱</span> From our forest to your home 
            <span class="count-pill">{{ products.length }}</span>
          </div>
          <div class="filter-pills">
            <span v-for="f in filters" :key="f" :class="['pill', { active: activeFilter === f }]" @click="setFilter(f)">{{ f }}</span>
          </div>
        </div>

        <div v-if="loading" class="product-grid">
          <div v-for="i in 8" :key="i" class="skeleton-card"></div>
        </div>
        
        <div v-else-if="products.length === 0" class="empty-state">
          <span>🍃</span><p>No products found.</p>
        </div>

        <div v-else>
          <div class="product-grid">
            <div v-for="product in visibleProducts" :key="product.id" class="product-card" @click="goToProduct(product)">
              
              <div class="product-thumb">
                <!-- Premium Drop-down Banner (Blinkit Style) -->
                <div v-if="isOutOfStock(product)" class="premium-banner sold-out">Sold Out</div>
                <div v-else-if="hasDiscount(product)" class="premium-banner discount">{{ product.discount.percent }}% OFF</div>

                <img v-if="primaryImage(product)" :src="primaryImage(product)" :alt="product.name" class="thumb-img" loading="lazy" />
                <div v-else class="emoji-fallback"><span>{{ product.emoji || '🌾' }}</span></div>
              </div>

              <!-- Content stack flowing immediately down with zero vertical gaps -->
              <div class="product-body">
                <h4 class="product-name">{{ product.name }}</h4>
                <p class="product-desc">{{ product.shortDesc || 'Pure Himalayan product' }}</p>
                <div class="product-price-row">
                  <span class="product-price">₹{{ displayPrice(product) }}</span>
                  <span v-if="hasDiscount(product)" class="price-original">₹{{ getMinBasePrice(product) }}</span>
                </div>
              </div>

            </div>
          </div>

          <div v-if="products.length > displayLimit" class="load-more-container">
            <button class="load-more-btn" @click="displayLimit += 8">↓ Discover More</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ─── SYSTEM CORE & LAYOUT ─── */
.page { background: #ffffff; min-height: 100vh; width: 100%; color: #111; font-family: 'Inter', -apple-system, sans-serif; display: flex; flex-direction: column;padding-top:40px; overflow-x: hidden; }
.page-inner { max-width: 1200px; margin: 0 auto; padding: 40px 20px 80px; flex: 1; width: 100%; }

/* ─── PREMIUM HERO BANNER (RESTORED) ─── */
.hero { 
  background: radial-gradient(circle at top left, #1b422e, #0b1f15); 
  border-radius: 24px; 
  padding: 64px 40px; 
  margin-bottom: 48px; 
  text-align: center; 
  position: relative; 
  overflow: hidden; 
  box-shadow: 0 20px 40px rgba(11, 31, 21, 0.15); 
}
.hero-badge { 
  background: rgba(255, 255, 255, 0.1); 
  border: 1px solid rgba(255, 255, 255, 0.2); 
  backdrop-filter: blur(8px); 
  display: inline-block; 
  padding: 6px 18px; 
  border-radius: 40px; 
  font-size: 12px; 
  font-weight: 600; 
  color: #E8F0E0; 
  margin-bottom: 24px; 
  letter-spacing: 0.5px; 
}
.hero-title { 
  font-family: 'Georgia', serif; 
  font-size: 44px; 
  font-weight: 600; 
  color: #ffffff; 
  line-height: 1.15; 
  margin-bottom: 16px; 
  letter-spacing: -0.5px; 
}
.hero-demo-warn { 
  color: #fca5a5; 
  font-weight: 500; 
  font-size: 13px; 
  margin-bottom: 12px; 
}
.hero-sub { 
  font-size: 16px; 
  color: #A7F3D0; 
  font-weight: 500; 
}

/* ─── CONTROLS & HEADERS ─── */
.section-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 32px; }
.section-title { font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.count-pill { background: #F3F4F6; color: #4B5563; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
.filter-pills { display: flex; gap: 8px; flex-wrap: wrap; }
.pill { background: #F9FAFB; border: 1px solid #E5E7EB; padding: 6px 14px; border-radius: 40px; font-size: 12px; font-weight: 500; color: #4B5563; cursor: pointer; transition: all 0.15s; }
.pill.active { background: #1b422e; border-color: #1b422e; color: #fff; }

/* ─── STABLE UNIFORM PRODUCT GRID ─── */
.product-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px 20px; align-items: start; }
.product-card { background: transparent; border: none; cursor: pointer; display: flex; flex-direction: column; width: 100%; min-width: 0; }

/* ─── PRODUCT IMAGES (Blends perfectly with white bg) ─── */
.product-thumb { width: 100%; aspect-ratio: 1 / 1; background: #ffffff; border-radius: 12px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.thumb-img { width: 100%; height: 100%; object-fit: contain; padding: 4px; transition: transform 0.3s ease; }
.product-card:hover .thumb-img { transform: scale(1.04); }
.emoji-fallback { font-size: 40px; }

/* ─── BLINKIT STYLE PREMIUM TOP BANNER ─── */
.premium-banner { position: absolute; top: 0; left: 0; z-index: 2; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 0 0 6px 0; letter-spacing: 0.2px; text-transform: uppercase; }
.premium-banner.discount { background: #2563EB; color: #ffffff; }
.premium-banner.sold-out { background: #4B5563; color: #ffffff; }

/* ─── FLOATING BODY (Tight layout configuration) ─── */
.product-body { padding: 10px 2px 0; display: flex; flex-direction: column; gap: 3px; }
.product-name { font-size: 14px; font-weight: 600; color: #111827; margin: 0; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; }
.product-desc { font-size: 12px; color: #6B7280; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.product-price-row { display: flex; align-items: baseline; gap: 6px; margin-top: 2px; }
.product-price { font-size: 15px; font-weight: 700; color: #111827; }
.price-original { font-size: 11px; color: #9CA3AF; text-decoration: line-through; }

/* ─── UTILITIES ─── */
.load-more-container { text-align: center; margin-top: 40px; }
.load-more-btn { background: #F3F4F6; border: none; color: #111827; padding: 10px 24px; border-radius: 40px; font-size: 13px; font-weight: 600; cursor: pointer; }
.empty-state { text-align: center; padding: 40px; color: #6B7280; }
.skeleton-card { aspect-ratio: 1 / 1.3; background: #F3F4F6; border-radius: 12px; }

/* ─── STRICT RESPONSIVE MOBILE FIXES ─── */

/* ─── STRICT RESPONSIVE MOBILE FIXES ─── */
@media (max-width: 768px) {
  /* Added 80px top padding to push the banner down exactly below your navbar */
  .page-inner { padding: 30px 0 50px; }
  
  /* Restored premium mobile banner styling */
  .hero { 
    border-radius: 0; 
    margin: 0 0 32px 0; 
    padding: 56px 24px; /* Increased vertical breathing room */
    width: 100vw; 
    position: relative; 
    left: 50%; 
    right: 50%; 
    margin-left: -50vw; 
    margin-right: -50vw; 
    box-shadow: 0 12px 24px rgba(11, 31, 21, 0.15); /* Richer shadow for premium feel */
  }
  
  .hero-badge { font-size: 11px; padding: 6px 14px; margin-bottom: 20px; }
  .hero-title { font-size: 30px; line-height: 1.25; margin-bottom: 12px; }
  .hero-demo-warn { font-size: 12px; margin-bottom: 12px; }
  .hero-sub { font-size: 14px; line-height: 1.4; }
  
  .content-wrapper { padding: 0 6px; }
  .product-grid { grid-template-columns: repeat(2, 1fr); gap: 24px 14px; align-items: start; }
  .product-name { font-size: 13px; }
  .product-price { font-size: 15px; }
  .product-thumb { border-radius: 10px; }
}
</style>