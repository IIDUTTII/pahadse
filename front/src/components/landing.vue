<template>
  <div class="page">
    <svg style="display:none"><filter id="lg-dist" x="0%" y="0%" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves="2" seed="92" result="noise"/><feGaussianBlur in="noise" stdDeviation="2" result="blurred"/><feDisplacementMap in="SourceGraphic" in2="blurred" scale="50" xChannelSelector="R" yChannelSelector="G"/></filter></svg>

    <!-- ====== HERO ====== -->
    <div class="hero-wrapper" :class="{ 'hero-settled': settled }">
      <div class="hero">
        <h1 class="brand" :class="{ 'brand-dark': settled }">
          <span class="pahad" :class="{ 'pahad-dark': settled }">Pahad</span>
          <span class="s-wrap">
            <span class="s-color" :class="{ 's-color-dark': settled }">S</span>
            <span class="s-masked" :class="{ 's-masked-dark': settled }">S</span>
          </span>
        </h1>
        <p class="tagline" :class="{ 'tagline-dark': settled }">From the Himalayas with love 🌿</p>
      </div>
    </div>

    <div class="reveal-bg"></div>

    <!-- ====== CARDS ====== -->
    <div class="card-field" :class="{ 'cards-visible': settled }">
      <div v-for="i in 5" :key="'skeleton-' + i" class="glass-card skeleton" :class="[['lg','sm','md','sm','md'][i-1]]" :style="{ transform: `translate3d(${getPosition(i-1).x}px, ${getPosition(i-1).y}px, 0) rotate(${cards[i-1]?.rotate || 0}deg)`, zIndex: 0, opacity: settled && !loadedCards[i-1] ? 1 : 0 }">
        <div class="skeleton-shimmer"></div>
      </div>
      <div v-for="(card, index) in cards" :key="card.id" class="glass-card" :class="[card.style, card.size, { 'card-loaded': loadedCards[index] }]" :style="{ transform: `translate3d(${positions[card.id].x}px, ${positions[card.id].y}px, 0) rotate(${card.rotate}deg)`, zIndex: zIndexMap[card.id], opacity: loadedCards[index] ? 1 : 0 }" @mousedown="startDrag($event, card.id)" @touchstart="startDragTouch($event, card.id)">
        <span class="card-label">{{ card.label }}</span>
        <div v-if="card.style === 'distort'" class="glass-filter"></div>
        <div class="glass-overlay"></div>
        <div v-if="card.style !== 'frosted'" class="glass-specular"></div>
        <div class="glass-content">
          <img v-if="card.lowQualityImage" :src="card.lowQualityImage" class="card-image low-res" draggable="false" aria-hidden="true" />
          <img v-if="card.image" :src="card.image" alt="Card image" class="card-image full-res" draggable="false" @load="onImageLoad(index)" :class="{ 'loaded': imageLoaded[index] }" />
          <span v-else class="placeholder-icon">🖼️</span>
          <span class="placeholder-text">{{ card.image ? '' : 'Replace with your image' }}</span>
        </div>
      </div>
    </div>

    <!-- ====== EXPLORE BUTTON SECTION ====== -->
    <div class="cta-section" :class="{ 'cta-visible': settled }">
      <div class="btn-wrap" @click="togglePopup">
        <button class="glass-btn"><span>✨ Explore</span></button>
      </div>
    </div>

    <!-- ====== POPUP ====== -->
    <div v-if="showPopup" class="popup-overlay" @click="closePopup">
      <div class="popup-box" @click.stop>
        <button class="popup-btn green" @click="goTo('products')"><span>🛍️ Products</span></button>
        <button class="popup-btn orange" @click="goTo('trekking')"><span>🥾 Trekking</span></button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, onUnmounted, nextTick } from 'vue'

const showPopup = ref(false)
const togglePopup = () => { showPopup.value = !showPopup.value }
const closePopup = () => { showPopup.value = false }
const goTo = (r) => { console.log(r); showPopup.value = false }

const settled = ref(false)
const loadedCards = ref([false, false, false, false, false])
const imageLoaded = ref([false, false, false, false, false])
const screenWidth = ref(window.innerWidth)

const IMAGE_1 = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face'
const IMAGE_2 = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face'
const IMAGE_3 = 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=400&h=400&fit=crop'
const IMAGE_4 = 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&h=400&fit=crop'
const IMAGE_5 = 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&h=400&fit=crop'

const LOW_QUALITY_1 = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=20&h=20&fit=crop&crop=face'
const LOW_QUALITY_2 = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=20&h=20&fit=crop&crop=face'
const LOW_QUALITY_3 = 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=20&h=20&fit=crop'
const LOW_QUALITY_4 = 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=20&h=20&fit=crop'
const LOW_QUALITY_5 = 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=20&h=20&fit=crop'

const cards = [
  { id: 'c1', style: 'distort',  size: 'lg', label: 'Liquid Distort', rotate: -6, image: IMAGE_1, lowQualityImage: LOW_QUALITY_1 },
  { id: 'c2', style: 'distort',  size: 'sm', label: 'Liquid Distort', rotate: 4, image: IMAGE_2, lowQualityImage: LOW_QUALITY_2 },
  { id: 'c3', style: 'specular', size: 'md', label: 'Specular Glass', rotate: -3, image: IMAGE_3, lowQualityImage: LOW_QUALITY_3 },
  { id: 'c4', style: 'specular', size: 'sm', label: 'Specular Glass', rotate: 7, image: IMAGE_4, lowQualityImage: LOW_QUALITY_4 },
  { id: 'c5', style: 'frosted',  size: 'md', label: 'Simple Frosted', rotate: -8, image: IMAGE_5, lowQualityImage: LOW_QUALITY_5 },
]

const onImageLoad = (index) => { imageLoaded.value[index] = true; loadedCards.value[index] = true }

const preloadImages = () => {
  const imageUrls = cards.map(c => c.image).filter(Boolean)
  let loaded = 0
  imageUrls.forEach(url => {
    const img = new Image()
    img.onload = () => { loaded++ }
    img.onerror = () => { loaded++ }
    img.src = url
  })
}

const getPosition = (index) => {
  const w = screenWidth.value
  const isMobile = w < 480
  const isTablet = w < 768
  const positions = [{ x: -220, y: -40 }, { x: -60, y: 60 }, { x: 60, y: -60 }, { x: 220, y: 30 }, { x: 10, y: 130 }]
  let scale = 1
  if (isMobile) scale = 0.35
  else if (isTablet) scale = 0.55
  return { x: positions[index].x * scale, y: positions[index].y * scale }
}

const positions = reactive({
  c1: { x: getPosition(0).x, y: getPosition(0).y },
  c2: { x: getPosition(1).x, y: getPosition(1).y },
  c3: { x: getPosition(2).x, y: getPosition(2).y },
  c4: { x: getPosition(3).x, y: getPosition(3).y },
  c5: { x: getPosition(4).x, y: getPosition(4).y }
})

const updatePositions = () => {
  screenWidth.value = window.innerWidth
  const keys = ['c1', 'c2', 'c3', 'c4', 'c5']
  keys.forEach((key, i) => {
    const pos = getPosition(i)
    positions[key].x = pos.x
    positions[key].y = pos.y
  })
}

let zCounter = 10
const zIndexMap = reactive({ c1: 1, c2: 2, c3: 3, c4: 4, c5: 5 })
const dragState = ref({ active: false, id: null, startX: 0, startY: 0, origX: 0, origY: 0 })

function bringToFront(id) { zCounter += 1; zIndexMap[id] = zCounter }
function startDrag(e, id) { e.preventDefault(); bringToFront(id); dragState.value = { active: true, id, startX: e.clientX, startY: e.clientY, origX: positions[id].x, origY: positions[id].y } }
function onMouseMove(e) { if (!dragState.value.active) return; const { id, startX, startY, origX, origY } = dragState.value; positions[id].x = origX + (e.clientX - startX); positions[id].y = origY + (e.clientY - startY) }
function onMouseUp() { dragState.value.active = false }
function startDragTouch(e, id) { e.preventDefault(); bringToFront(id); const touch = e.touches[0]; dragState.value = { active: true, id, startX: touch.clientX, startY: touch.clientY, origX: positions[id].x, origY: positions[id].y } }
function onTouchMove(e) { if (!dragState.value.active) return; e.preventDefault(); const touch = e.touches[0]; const { id, startX, startY, origX, origY } = dragState.value; positions[id].x = origX + (touch.clientX - startX); positions[id].y = origY + (touch.clientY - startY) }
function onTouchEnd() { dragState.value.active = false }

onMounted(() => {
  preloadImages()
  window.addEventListener('resize', updatePositions)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd)
  setTimeout(async () => {
    await nextTick()
    requestAnimationFrame(() => { settled.value = true })
    cards.forEach((_, i) => {
      setTimeout(() => { loadedCards.value[i] = true }, 4700 + i * 200)
    })
  }, 4500)
})

onUnmounted(() => {
  window.removeEventListener('resize', updatePositions)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
})
</script>

<style scoped>
/* ============================================================
   🔧  EASY CUSTOMIZATION
   ============================================================ */
.page {
  --glass-bg: rgba(5, 54, 8, 0.934);
  --glass-blur: 8px;
  --glass-border: rgba(6, 45, 6, 0.931);
  --glass-shadow: 0 4px 24px rgba(46, 125, 50, 0.55);
  --text-color: #ffffff;
  --overlay-bg: rgba(0,0,0,.35);
  --overlay-blur: 6px;
  --popup-bg: rgba(20, 20, 20, 0.75);
  --popup-blur: 14px;
  --popup-border: rgba(255,255,255,0.12);
  --popup-text: #ffffff;
  --green: rgba(46, 125, 50, 0.35);
  --green-hover: rgba(46, 125, 50, 0.6);
  --orange: rgba(255, 152, 0, 0.35);
  --orange-hover: rgba(255, 152, 0, 0.6);
  --anim-speed: .25s;
  --hover-scale: 1.04;
  --lg-bg: rgba(255,255,255,0.45);
  --lg-highlight: rgba(255,255,255,0.9);
  --lg-border: rgba(255,255,255,0.6);
  --premium-green: #2E7D32;
  position: relative;
  min-height: 100vh;
  background: linear-gradient(135deg, #0F2A1F, #2A5C3E);
  overflow: hidden;
  padding-bottom: 60px;
}

/* ============================================================
   🎨  HERO (fixed height - prevents scrolling)
   ============================================================ */
* { box-sizing: border-box; }
.reveal-bg { position: absolute; inset: 0; background: #fdfdfb; opacity: 0; z-index: 0; pointer-events: none; animation: revealBg 0.6s ease-out 4.5s forwards; }
@keyframes revealBg { to { opacity: 1; } }
.hero-wrapper {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  max-height: 100vh;
  padding: 20px;
  will-change: transform;
  transition: transform 1.1s cubic-bezier(0.25, 1, 0.35, 1);
  transform: translate3d(0,0,0);
}
.hero-wrapper.hero-settled {
  height: auto;
  max-height: none;
  min-height: 0;
  padding-top: 20px;
  transform: scale3d(0.7, 0.7, 1) translate3d(0, 0, 0);
  transform-origin: top center;
}
.hero { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px; }

/* ─── HERO TEXT ─── */
.brand { display: flex; font-family: 'Georgia', serif; font-size: 5rem; font-weight: 700; margin: 0; opacity: 0; flex-wrap: wrap; justify-content: center; animation: fadeIn 0.5s ease-out forwards; will-change: opacity, color; transition: color 0.8s cubic-bezier(0.25, 1, 0.35, 1); }
@keyframes fadeIn { to { opacity: 1; } }
.brand-dark .pahad-dark { color: var(--premium-green) !important; animation: none !important; }
.brand-dark .s-color-dark { color: var(--premium-green) !important; animation: none !important; opacity: 1 !important; }
.brand-dark .s-masked-dark { opacity: 0 !important; animation: none !important; }
.pahad-dark { color: var(--premium-green) !important; animation: none !important; }
.s-color-dark { color: var(--premium-green) !important; animation: none !important; opacity: 1 !important; }
.s-masked-dark { opacity: 0 !important; animation: none !important; }
.pahad { color: #F5EDE0; animation: colorPahad 3.6s steps(1, start) 0.4s forwards; will-change: color; transition: color 0.8s cubic-bezier(0.25, 1, 0.35, 1); }
@keyframes colorPahad { 0% { color: #00E5FF; } 33% { color: #33FF8C; } 66% { color: #FFC640; } 100% { color: #FF3D9A; } }
.s-wrap { position: relative; display: inline-grid; }
.s-color, .s-masked { grid-area: 1 / 1; }
.s-color { color: #F5EDE0; animation: colorS 3.6s steps(1, start) 0.4s forwards, fadeOutS 0.3s ease-in 3.2s forwards; will-change: color, opacity; transition: color 0.8s cubic-bezier(0.25, 1, 0.35, 1); }
@keyframes colorS { 0% { color: #00E5FF; } 33% { color: #33FF8C; } 66% { color: #B983FF; } 100% { color: #FF6B35; } }
@keyframes fadeOutS { to { opacity: 0; } }
.s-masked { opacity: 0; color: transparent; background-image: url('https://images.unsplash.com/photo-1732535725600-f805d8b33c9c?q=80&w=1470&auto=format&fit=crop'); background-size: 300%; background-position: 100% 50%; background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: fadeInS 0.5s ease-out 1.8s forwards, maskPan 1s linear 1.8s infinite; will-change: opacity, background-position; transition: opacity 0.8s cubic-bezier(0.25, 1, 0.35, 1); }
@keyframes fadeInS { to { opacity: 1; } }
@keyframes maskPan { 0% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
.tagline { font-family: 'Inter', sans-serif; font-size: 1.1rem; color: rgba(245,237,224,0.6); margin-top: 16px; letter-spacing: 6px; font-weight: 300; text-align: center; animation: slideUp 0.6s ease-out 0.4s both; will-change: opacity, transform, color; transition: color 0.8s cubic-bezier(0.25, 1, 0.35, 1); }
@keyframes slideUp { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
.tagline-dark { color: rgba(46, 125, 50, 0.7) !important; }

/* ============================================================
   📦  CARDS
   ============================================================ */
.card-field {
  position: relative;
  z-index: 1;
  width: 100%;
  min-height: 380px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translate3d(0, 30px, 0);
  transition: opacity 0.8s cubic-bezier(0.25, 1, 0.35, 1), transform 0.8s cubic-bezier(0.25, 1, 0.35, 1);
  pointer-events: none;
  will-change: opacity, transform;
  padding: 20px 10px;
}
.card-field.cards-visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
  pointer-events: auto;
}

.glass-card {
  position: absolute;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  border-radius: 1.6rem;
  overflow: hidden;
  box-shadow: 0 12px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
  transition: box-shadow 0.2s, opacity 0.5s cubic-bezier(0.25, 1, 0.35, 1);
  will-change: transform, opacity;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: translate3d(0,0,0);
  opacity: 0.01;
}
.glass-card.card-loaded { opacity: 1; }
.glass-card:active { cursor: grabbing; box-shadow: 0 18px 40px rgba(0,0,0,0.18); }

/* ─── CARD SIZES (change these) ─── */
.glass-card.sm { width: 200px; height: 400px; }  /* ← Your custom size */
.glass-card.md { width: 230px; height: 230px; }
.glass-card.lg { width: 280px; height: 280px; }

.glass-content {
  position: relative;
  z-index: 3;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  overflow: hidden;
  pointer-events: none;
}
.card-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
  transition: opacity 0.8s cubic-bezier(0.25, 1, 0.35, 1);
}
.low-res {
  opacity: 1;
  filter: blur(20px) saturate(0.3);
  transform: scale(1.05);
  transition: opacity 0.8s cubic-bezier(0.25, 1, 0.35, 1);
}
.full-res {
  opacity: 0;
  transition: opacity 0.8s cubic-bezier(0.25, 1, 0.35, 1);
}
.full-res.loaded { opacity: 1; }
.full-res.loaded + .low-res,
.full-res.loaded ~ .low-res { opacity: 0; }

.card-label {
  position: absolute;
  top: 10px;
  left: 12px;
  z-index: 4;
  font-family: 'Inter', sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #1a2a1a;
  background: rgba(255,255,255,0.6);
  padding: 3px 10px;
  border-radius: 40px;
  pointer-events: none;
}

.glass-filter {
  position: absolute;
  inset: 0;
  z-index: 0;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  filter: url(#lg-dist);
  isolation: isolate;
}
.glass-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: var(--lg-bg);
}
.glass-specular {
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: inherit;
  box-shadow: inset 1px 1px 0 var(--lg-highlight), inset 0 0 12px rgba(255,255,255,0.5);
}

.glass-card.frosted {
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.5);
}
.glass-card.specular { border: 1px solid var(--lg-border); }
.glass-card.distort { border: 1px solid var(--lg-border); }

.placeholder-icon { font-size: 2.2rem; opacity: 0.5; }
.placeholder-text {
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  color: rgba(26,42,26,0.5);
  text-align: center;
  padding: 0 16px;
}

.skeleton {
  background: rgba(200,200,200,0.15);
  border: 1px solid rgba(200,200,200,0.2);
  pointer-events: none;
}
.skeleton-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 1.6rem;
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* ============================================================
   🪟  EXPLORE BUTTON (40px height × 50px width + 40px margin)
   ============================================================ */
.cta-section {
  position: relative;
  z-index: 5;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 80px 40px 40px;
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.8s cubic-bezier(0.25, 1, 0.35, 1), transform 0.8s cubic-bezier(0.25, 1, 0.35, 1);
  pointer-events: none;
  will-change: opacity, transform;
}
.cta-section.cta-visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.btn-wrap {
  cursor: pointer;
  transition: transform var(--anim-speed) ease;
  will-change: transform;
}
.btn-wrap:hover { transform: scale(var(--hover-scale)); }
.btn-wrap:active { transform: scale(.96); }

.glass-btn {
  all: unset;
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 45px !important;
  height: 55px;
  min-width: 55px;
  border-radius: 40px;
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: #ffffff;
  margin-top: 40px;  
  text-shadow: 0 1px 3px rgba(0,0,0,.15);
  background: rgba(1, 54, 2, 0.885);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(93, 217, 99, 0.25);
  box-shadow: 0 4px 24px rgba(38, 151, 44, 0.488), inset 0 1px 0 rgba(255,255,255,.15);
  transition: all var(--anim-speed) ease;
  will-change: transform;
  letter-spacing: .3px;
}
.glass-btn:hover {
  background: rgba(32, 200, 37, 0.934);
  box-shadow: 0 6px 32px rgba(3, 33, 4, 0.2), inset 0 1px 0 rgba(255,255,255,.2);
  border-color: rgba(8, 40, 10, 0.891);
}
.glass-btn:active { transform: scale(.96); }
.glass-btn span { position: relative; z-index: 1; }

/* ============================================================
   🪟  POPUP
   ============================================================ */
.popup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.35);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn .3s ease;
  will-change: opacity;
}
@keyframes fadeIn {
  from { opacity: 0; backdrop-filter: blur(0px); }
  to { opacity: 1; backdrop-filter: blur(6px); }
}

.popup-box {
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: slideUp .35s cubic-bezier(.34, 1.56, .64, 1);
  will-change: transform, opacity;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(24px) scale(.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.popup-btn {
  all: unset;
  cursor: pointer;
  position: relative;
  display: block;
  padding: 44px 48px;
  border-radius: 60px;
  font-family: 'Inter', sans-serif;
  font-size: 1.2rem;
  font-weight: 600;
  color: #ffffff;
  text-align: center; 
  background: rgba(20, 20, 20, 0.75);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 8px 32px rgba(0,0,0,.2);
  transition: all var(--anim-speed) ease;
  min-width: 200px;
  will-change: transform;
  letter-spacing: .3px;
}
.popup-btn:hover {
  transform: scale(var(--hover-scale));
  box-shadow: 0 12px 48px rgba(0,0,0,.3);
}
.popup-btn:active { transform: scale(.96); }
.popup-btn span { position: relative; z-index: 1; }

.popup-btn.green {
  background: rgba(46, 125, 50, 0.35);
  border-color: rgba(46, 125, 50, 0.25);
}
.popup-btn.green:hover {
  background: rgba(46, 125, 50, 0.6);
  border-color: rgba(46, 125, 50, 0.4);
  box-shadow: 0 8px 40px rgba(46, 125, 50, 0.3);
}

.popup-btn.orange {
  background: rgba(255, 152, 0, 0.35);
  border-color: rgba(255, 152, 0, 0.25);
}
.popup-btn.orange:hover {
  background: rgba(255, 152, 0, 0.6);
  border-color: rgba(255, 152, 0, 0.4);
  box-shadow: 0 8px 40px rgba(255, 152, 0, 0.3);
}

/* ============================================================
   📱  RESPONSIVE
   ============================================================ */
@media (max-width: 1024px) {
  .glass-card.lg { width: 220px; height: 220px; }
  .glass-card.md { width: 190px; height: 190px; }
  .glass-card.sm { width: 160px; height: 320px; }  /* ← Smaller for tablet */
}

@media (max-width: 768px) {
  .brand { font-size: 4.2rem; }
  .tagline { font-size: 1.1rem; letter-spacing: 5px; margin-top: 14px; }
  .hero-wrapper.hero-settled { transform: scale3d(0.65, 0.65, 1) translate3d(0, 0, 0); padding-top: 18px; }
  .glass-card.lg { width: 160px; height: 160px; }
  .glass-card.md { width: 135px; height: 135px; }
  .glass-card.sm { width: 120px; height: 240px; }  /* ← Smaller for mobile */
  .card-field { min-height: 280px; padding: 10px; }
  .cta-section { padding: 30px 20px 20px; }
  .glass-btn { height: 36px; min-width: 44px; font-size: 0.7rem; padding: 6px 10px; }
  .popup-btn { padding: 14px 36px; font-size: 1rem; min-width: 160px; }
  .popup-box { gap: 12px; }
}

@media (max-width: 480px) {
  .brand { font-size: 3.4rem; }
  .tagline { font-size: 1rem; letter-spacing: 4px; margin-top: 14px; }
  .hero-wrapper.hero-settled { transform: scale3d(0.55, 0.55, 1) translate3d(0, 0, 0); padding-top: 16px; }
  .hero { padding: 8px; }
  .glass-card.lg { width: 120px; height: 120px; }
  .glass-card.md { width: 105px; height: 105px; }
  .glass-card.sm { width: 90px; height: 180px; }  /* ← Smaller for small mobile */
  .card-field { min-height: 200px; padding: 5px; }
  .card-label { font-size: 0.5rem; top: 6px; left: 8px; padding: 2px 8px; }
  .cta-section { padding: 24px 20px 16px; }
  .glass-btn { height: 60px; min-width: 40px; font-size: 0.65rem; padding: 15px 18px !important; border-radius: 30px; }
  .popup-btn { padding: 12px 28px; font-size: .9rem; min-width: 140px; }
  .popup-box { gap: 10px; }
}

@media (max-width: 380px) {
  .brand { font-size: 2.8rem; }
  .tagline { font-size: 0.85rem; letter-spacing: 3px; margin-top: 10px; }
  .hero-wrapper.hero-settled { transform: scale3d(0.5, 0.5, 1) translate3d(0, 0, 0); padding-top: 14px; }
  .glass-card.lg { width: 95px; height: 95px; }
  .glass-card.md { width: 85px; height: 85px; }
  .glass-card.sm { width: 75px; height: 150px; }
  .card-field { min-height: 160px; }
  .cta-section { padding: 16px 16px 12px; }
  .glass-btn { height: 28px; min-width: 36px; font-size: 0.6rem; padding: 4px 6px; border-radius: 24px; }
  .popup-btn { padding: 10px 20px; font-size: .8rem; min-width: 120px; }
}

@media (max-width: 768px) {
  .glass-card { cursor: default; }
  .glass-card:active { transform: scale(1.02); }
}
</style>