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

/* ✅ STRONGER FIX: Force root font size at highest level */
:root, html {
  font-size: 16px !important;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

/* Ensure body inherits correctly */
body {
  background: #F5EFE0;
  min-height: 100vh;
  overflow-x: hidden;
  width: 100%;
  font-family: 'DM Sans', sans-serif;
  font-size: 1rem !important;
}

#app {
  min-height: 100vh;
  width: 100%;
}

/* Prevent any scaling issues on media */
img, picture, video, canvas, svg {
  max-width: 100%;
  display: block;
}

/* Tablet styles */
@media (max-width: 768px) and (min-width: 481px) {
  :root, html {
    font-size: 14px !important;
  }
}

/* Mobile styles */
@media (max-width: 480px) {
  :root, html {
    font-size: 12px !important;
  }
}

/* Desktop override for any window wider than 768px */
@media (min-width: 769px) {
  :root, html {
    font-size: 16px !important;
  }
}
</style>