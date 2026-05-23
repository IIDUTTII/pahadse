<script setup>
import { ref } from 'vue'

defineOptions({
  name: 'NotFound'
})

// 🎮 Interactive Mountain Mini-Game
const score = ref(0)
const jarPosition = ref({ top: '65%', left: '50%' })

const catchJar = () => {
  score.value++
  
  // Randomly roll the Ghee Jar to a new spot on the trail
  const randomTop = Math.floor(Math.random() * 35) + 55 // 55% to 90%
  const randomLeft = Math.floor(Math.random() * 70) + 15 // 15% to 85%
  
  jarPosition.value = {
    top: `${randomTop}%`,
    left: `${randomLeft}%`
  }
}
</script>

<template>
  <div class="pahad-404-container">
    <!-- Mountain Peak Silhouettes -->
    <div class="mountain-silhouette"></div>
    <div class="mountain-fog"></div>

    <div class="content-card">
      <div class="location-tag">🏔️ Location: पहाड़ों में कहीं गुम!</div>
      
      <h1 class="error-title">404</h1>
      
      <h2 class="funny-alert">अरे भाई! गलत ट्रैकिंग रूट पर आ गए क्या? 🧭</h2>
      
      <p class="story-text">
        लगता है पहाड़ों की धुंध में रास्ता भटक गए हो! नेटवर्क भी गायब है और ऊपर से <strong>pahadSe</strong> का शुद्ध आर्गेनिक घी का डिब्बा पहाड़ी से नीचे लुढ़क रहा है! नीचे खाई में गिरने से पहले इसे पकड़ो!
      </p>

      <!-- 🎮 THE ROLLING GHEE JAR GAME TARGET -->
      <div 
        class="rolling-ghee-jar" 
        :style="{ top: jarPosition.top, left: jarPosition.left }"
        @mouseenter="catchJar"
        @click="catchJar"
      >
        🍯
        <span class="tooltip">पकड़ो मुझे!</span>
      </div>

      <!-- Score Tracker -->
      <div class="hill-score" v-if="score > 0">
        🏃‍♂️ खाई में गिरने से बचाए गए घी के डिब्बे: <strong>{{ score }}</strong>
      </div>

      <!-- Navigation Escape Routes -->
      <div class="trail-actions">
        <router-link to="/" class="basecamp-btn">
          🏕️ चलो वापस बेसकैंप (Home Page) चलते हैं
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 🌲 Himalayan Deep Evening Aesthetic */
.pahad-404-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(180deg, #1A2E26 0%, #0F1F19 100%); /* Deep Forest Green/Dark Grey */
  color: #F4F6F5;
  font-family: system-ui, -apple-system, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  z-index: 99999;
}

/* 🏔️ Layered Decorative Mountain Shapes */
.mountain-silhouette {
  position: absolute;
  bottom: 0;
  width: 120%;
  height: 40%;
  background: rgba(16, 185, 129, 0.05);
  clip-path: polygon(0% 100%, 20% 40%, 45% 75%, 70% 30%, 85% 60%, 100% 20%, 100% 100%);
  z-index: 1;
}

/* 🌫️ Moving Mountain Fog Effect */
.mountain-fog {
  position: absolute;
  bottom: -10%;
  width: 200%;
  height: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
  animation: fog-drift 15s linear infinite alternate;
  z-index: 2;
}

@keyframes fog-drift {
  0% { transform: translateX(-10%) translateY(0); }
  100% { transform: translateX(10%) translateY(10px); }
}

.content-card {
  position: relative;
  z-index: 3;
  text-align: center;
  padding: 30px;
  max-width: 550px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.3);
  margin: 15px;
}

.location-tag {
  font-size: 0.85rem;
  background: #E0F2FE;
  color: #0369A1;
  padding: 6px 14px;
  border-radius: 9999px;
  display: inline-block;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.error-title {
  font-size: 7rem;
  margin: 15px 0 0 0;
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, #10B981, #34D399); /* Vue / Organic Green gradient */
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -2px;
}

.funny-alert {
  font-size: 1.4rem;
  color: #FBBF24; /* Warm Gold */
  margin-top: 5px;
  margin-bottom: 15px;
}

.story-text {
  color: #9CA3AF;
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 30px;
}
.story-text strong {
  color: #10B981;
}

/* 🕹️ RUNAWAY GHEE JAR OBJECT */
.rolling-ghee-jar {
  position: absolute;
  font-size: 2.5rem;
  cursor: pointer;
  transform: translate(-50%, -50%);
  user-select: none;
  z-index: 10;
  transition: all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  filter: drop-shadow(0 4px 10px rgba(251, 191, 36, 0.4));
}
.rolling-ghee-jar:hover {
  transform: translate(-50%, -50%) scale(1.2) rotate(15deg);
}

.tooltip {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.7rem;
  background: #FBBF24;
  color: #000;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s;
}
.rolling-ghee-jar:hover .tooltip {
  opacity: 1;
}

.hill-score {
  font-size: 0.95rem;
  color: #34D399;
  margin-bottom: 25px;
}

/* 🏔️ NAVIGATION BUTTONS */
.trail-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.basecamp-btn {
  display: block;
  text-decoration: none;
  background: #10B981;
  color: #0F1F19;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: bold;
  border-radius: 8px;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}
.basecamp-btn:hover {
  background: #059669;
  transform: translateY(-1px);
}
</style>
