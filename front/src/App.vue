<script setup>
import NavBar from './components/NavBar.vue'
import Footer from './components/Footer.vue'
</script>

<template>
  <NavBar />

  <router-view v-slot="{ Component }">
    <keep-alive include="Home,About,Contact,Admin,Login,Register,User,NavBar,Footer">
      <component :is="Component" />
    </keep-alive>
  </router-view>

  <Footer />
</template>

<style>
/* ===== GLOBAL RESET + FONT BASELINE ===== */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ✅ CRITICAL FIX: Force consistent root font size */
html {
  font-size: 16px !important;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body, #app {
  background: #F5EFE0;
  min-height: 100vh;
  overflow-x: hidden;
  width: 100%;
  font-family: 'DM Sans', sans-serif;
  font-size: 16px;
}

/* Prevent any scaling issues */
img, picture, video, canvas, svg {
  max-width: 100%;
  display: block;
}

/* Responsive font scaling (optional, keeps mobile readable) */
@media (max-width: 768px) {
  html {
    font-size: 14px !important;
  }
}

@media (max-width: 480px) {
  html {
    font-size: 12px !important;
  }
}
</style>