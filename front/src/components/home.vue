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
    <div class="hero">
      <div class="hero-badge">🌿 100% Natural | Handmade in Himalayas</div>
      <h1 class="hero-title">Pure Mountain Goodness,<br>Delivered to Your Door</h1>
      <p style="color: #fca5a5; font-weight: 500; font-size: 13px; margin-bottom: 12px;">⚠ Testing phase — demo products only</p>
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
</template>

<style scoped>
/* ─── PAGE ─── */
.page{background:#FFFFFF;padding:100px 20px 80px;font-family:'Montserrat','Inter','Poppins',sans-serif;min-height:100vh;max-width:1200px;margin:0 auto}
/* ─── HERO ─── ORIGINAL BANNER (Georgia, Cream) */
.hero{background:linear-gradient(135deg,#0F2A1F,#2A5C3E);border-radius:16px;padding:48px 40px;margin-bottom:48px;text-align:center;box-shadow:0 8px 24px rgba(15,42,31,0.06);position:relative;overflow:hidden}
.hero-badge{background:rgba(255,255,240,0.2);backdrop-filter:blur(4px);display:inline-block;padding:6px 18px;border-radius:40px;font-size:12px;font-weight:500;color:#F5EDE0;margin-bottom:20px}
.hero-title{font-family:'Georgia',serif;font-size:38px;font-weight:600;color:#F5EDE0;line-height:1.2;margin-bottom:16px;letter-spacing:-0.3px}
.hero-sub{font-size:16px;color:rgba(245,237,224,0.85);margin-bottom:24px;font-weight:400}
/* ─── SECTION HEAD ─── */
.section-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px}
.section-title{font-family:'Montserrat','Inter',sans-serif;font-size:18px;font-weight:600;color:#0F172A;display:flex;align-items:center;gap:8px}
.count-pill{background:#E8F0E0;color:#2A5C3E;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600}
.filter-pills{display:flex;gap:8px;flex-wrap:wrap}
.pill{background:#fff;border:1px solid #E2E8F0;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:500;color:#475569;cursor:pointer;transition:all 0.15s}
.pill:hover,.pill.active{background:#22C55E;border-color:#22C55E;color:#fff}
/* ─── PRODUCT GRID ─── */
.product-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.skeleton-card{height:320px;background:linear-gradient(90deg,#E8ECF0 25%,#F1F4F8 50%,#E8ECF0 75%);background-size:200% 100%;border-radius:12px;animation:shimmer 1.2s infinite}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
/* ─── PRODUCT CARD ─── */
.product-card{background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E8ECF0;transition:all 0.2s;cursor:pointer;display:flex;flex-direction:column;position:relative}
.product-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,0.06);border-color:#22C55E}
/* ─── BADGES ─── */
.corner-badge{position:absolute;top:10px;left:10px;z-index:2;font-size:10px;font-weight:600;padding:3px 10px;border-radius:12px;letter-spacing:0.2px}
.corner-badge.discount{background:#22C55E;color:#fff}
.corner-badge.sold-out{background:#94A3B8;color:#fff}
/* ─── PRODUCT THUMB ─── */
.product-thumb{width:100%;aspect-ratio:1/1;background:#F8FAFC;display:flex;align-items:center;justify-content:center;overflow:hidden;border-bottom:1px solid #F1F4F8}
.thumb-img{width:100%;height:100%;object-fit:contain;padding:8px}
.emoji-fallback{font-size:48px}
/* ─── PRODUCT BODY ─── */
.product-body{padding:12px 14px 14px;flex:1;display:flex;flex-direction:column}
.product-name{font-family:'Montserrat','Inter',sans-serif;font-size:13px;font-weight:600;color:#0F172A;margin-bottom:4px;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.product-desc{font-size:12px;color:#64748B;line-height:1.3;margin-bottom:8px;flex:1;font-weight:400;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.price-original{font-size:12px;color:#94A3B8;text-decoration:line-through;margin-right:6px}
.product-price{font-size:18px;font-weight:700;color:#0F172A}
/* ─── LOAD MORE ─── */
.load-more-container{text-align:center;margin-top:32px}
.load-more-btn{background:#fff;border:1px solid #E2E8F0;color:#0F172A;padding:10px 28px;border-radius:20px;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s}
.load-more-btn:hover{background:#22C55E;border-color:#22C55E;color:#fff}
/* ─── EMPTY STATE ─── */
.empty-state{text-align:center;padding:60px 20px;color:#64748B}
.empty-state span{font-size:48px;display:block;margin-bottom:12px}
/* ─── RESPONSIVE ─── */
@media(max-width:1024px){.product-grid{grid-template-columns:repeat(3,1fr);gap:14px}.hero-title{font-size:28px}}
@media(max-width:768px){.page{padding:80px 12px 80px}.product-grid{grid-template-columns:repeat(2,1fr);gap:12px}.hero-title{font-size:24px}.hero{padding:28px 20px}.product-name{font-size:13px}.product-body{padding:10px 12px 12px}.product-price{font-size:16px}}
@media(max-width:480px){.hero-title{font-size:20px}.hero-sub{font-size:12px}.section-title{font-size:16px}.filter-pills .pill{font-size:11px;padding:4px 12px}.product-grid{gap:10px}.product-price{font-size:15px}.load-more-btn{padding:8px 18px;font-size:12px}}
</style>