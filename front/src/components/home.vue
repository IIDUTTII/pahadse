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
    <div class="hero">
      <div class="hero-badge">🌿 100% Natural | Handmade in Himalayas</div>
      <h1 class="hero-title">Pure Mountain Goodness,<br>Delivered to Your Door</h1>
      <p style="color: #fca5a5; font-weight: 500; font-size: 13px; margin-bottom: 12px;">⚠ Testing phase — demo products only</p>
      <p class="hero-sub" style="color: #22C55E;">No preservatives · Ethically sourced · Plastic‑free packaging</p>
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
            <span v-if="product.category" class="product-category">{{ product.category }}</span>
            <h4 class="product-name">{{ product.name }}</h4>
            <p class="product-desc">{{ product.shortDesc || 'Pure Himalayan product.' }}</p>

            <div class="product-footer">
              <div class="price-block">
                <span v-if="hasDiscount(product)" class="price-original">₹{{ getMinBasePrice(product) }}</span>
                <span class="product-price">₹{{ displayPrice(product) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="products.length > displayLimit" class="load-more-container">
        <button class="load-more-btn" @click="displayLimit += 8">↓ Discover More Products</button>
      </div>
    </div>
   </div>
  </div>
</template>


<style scoped>
/* ─── PAGE ─── */
.page {
  background: #fafaf8;
  min-height: 100vh;
  width: 100%;
  color: #1a1a1a;
  line-height: 1.6;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
}
.page-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 100px 20px 80px;
  flex: 1;
}

/* ─── HERO ─── */
.hero {
  background: linear-gradient(135deg, #0F2A1F, #2A5C3E);
  border-radius: 16px;
  padding: 48px 40px;
  margin-bottom: 48px;
  text-align: center;
  box-shadow: 0 8px 24px rgba(15, 42, 31, 0.06);
  position: relative;
  overflow: hidden;
}
.hero-badge {
  background: rgba(255, 255, 240, 0.2);
  backdrop-filter: blur(4px);
  display: inline-block;
  padding: 6px 18px;
  border-radius: 40px;
  font-size: 12px;
  font-weight: 500;
  color: #F5EDE0;
  margin-bottom: 20px;
  font-family: 'Inter', sans-serif;
}
.hero-title {
  font-family: 'Georgia', serif;
  font-size: 38px;
  font-weight: 600;
  color: #F5EDE0;
  line-height: 1.2;
  margin-bottom: 16px;
  letter-spacing: -0.3px;
}
.hero-sub {
  font-size: 16px;
  color: rgba(245, 237, 224, 0.85);
  margin-bottom: 24px;
  font-weight: 400;
  font-family: 'Inter', sans-serif;
}

/* ─── SECTION HEAD & FILTERS ─── */
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}
.section-title {
  font-family: 'Inter', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #0F172A;
  display: flex;
  align-items: center;
  gap: 8px;
}
.count-pill {
  background: #E8F0E0;
  color: #2A5C3E;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}
.filter-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.pill {
  background: #fff;
  border: 1px solid #E2E8F0;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Inter', sans-serif;
}
.pill:hover,
.pill.active {
  background: #0F2A1F;
  border-color: #0F2A1F;
  color: #fff;
}

/* ─── PRODUCT GRID ─── */
.product-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

/* ─── PRODUCT CARD (exact match to landing.vue) ─── */
.product-card {
  background: rgba(255, 255, 255, 0.40);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 28px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.7);
  transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  position: relative;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.product-card:hover {
  transform: translateY(-8px);
  background: rgba(255, 255, 255, 0.65);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

/* ─── BADGES ─── */
.corner-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 12px;
  border-radius: 40px;
  backdrop-filter: blur(4px);
  font-family: 'Inter', sans-serif;
}
.corner-badge.discount {
  background: #2d5016;
  color: #fff;
}
.corner-badge.sold-out {
  background: #94A3B8;
  color: #fff;
}

/* ─── PRODUCT THUMB ─── */
.product-thumb {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: rgba(245, 245, 240, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}
.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 8px;
  transition: transform 0.5s;
}
.product-card:hover .thumb-img {
  transform: scale(1.04);
}
.emoji-fallback {
  font-size: 48px;
}

/* ─── PRODUCT BODY ─── */
.product-body {
  padding: 18px 20px 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.product-category {
  font-family: 'Inter', sans-serif;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #6a8a5a;
  font-weight: 600;
}

.product-name {
  font-family: 'Inter', sans-serif;
  font-size: 1.05rem;
  font-weight: 600;
  color: #1a2a1a;
  margin: 4px 0 6px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.product-desc {
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  color: #5a6a5a;
  line-height: 1.5;
  flex: 1;
  margin-bottom: 12px;
  font-weight: 400;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  letter-spacing: normal;
}

/* ─── PRICE & FOOTER ─── */
.product-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}
.price-original {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: #94A3B8;
  text-decoration: line-through;
  margin-right: 6px;
}
.product-price {
  font-family: 'Inter', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  color: #1a3a1a;
  letter-spacing: normal;
}

/* ─── LOAD MORE ─── */
.load-more-container {
  text-align: center;
  margin-top: 32px;
}
.load-more-btn {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  color: #1a2a1a;
  padding: 10px 28px;
  border-radius: 40px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Inter', sans-serif;
}
.load-more-btn:hover {
  background: #2d5016;
  color: #fff;
}

/* ─── EMPTY STATE ─── */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #64748B;
}
.empty-state span {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

/* ─── SKELETON ─── */
.skeleton-card {
  height: 320px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.3) 25%, rgba(255, 255, 255, 0.5) 50%, rgba(255, 255, 255, 0.3) 75%);
  background-size: 200% 100%;
  border-radius: 28px;
  animation: shimmer 1.2s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ─── RESPONSIVE ─── */
@media (max-width: 1024px) {
  .product-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  .hero-title {
    font-size: 28px;
  }
}
@media (max-width: 768px) {
  .page {
    padding: 80px 12px 80px;
  }
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .hero-title {
    font-size: 24px;
  }
  .hero {
    padding: 28px 20px;
  }
  .product-name {
    font-size: 13px;
  }
  .product-body {
    padding: 10px 12px 12px;
  }
  .product-price {
    font-size: 16px;
  }
}
@media (max-width: 480px) {
  .hero-title {
    font-size: 20px;
  }
  .hero-sub {
    font-size: 12px;
  }
  .section-title {
    font-size: 16px;
  }
  .filter-pills .pill {
    font-size: 11px;
    padding: 4px 12px;
  }
  .product-grid {
    gap: 10px;
  }
  .product-price {
    font-size: 15px;
  }
  .load-more-btn {
    padding: 8px 18px;
    font-size: 12px;
  }
}
</style>