<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from './components/NavBar.vue'
import Footer from './components/Footer.vue'

const route = useRoute()

const hideNavFooter = computed(() => {
  return (
    route.name === "Landing" ||
    route.name === "Layout" ||
    route.path === "/"
  )
})
</script>

<template>
  <div id="app-wrapper">
    <NavBar v-if="!hideNavFooter" />
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <keep-alive include="Home,About,Contact,Admin,Login,Register,User,NavBar,Footer,Landing">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>
    <Footer v-if="!hideNavFooter" />
  </div>
</template>

<style>
/* ===== GLOBAL RESET + FONT BASELINE ===== */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root, html {
  font-size: 16px !important;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  background: #FFFFFF;
  min-height: 100vh;
  overflow-x: hidden;
  width: 100%;
  font-family: 'DM Sans', sans-serif;
  font-size: 1rem !important;
  margin: 0;  /* ← ADD THIS */
  padding: 0; /* ← ADD THIS */
}

#app {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
}

#app-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
}

.main-content {
  flex: 1;
  width: 100%;
}

img, picture, video, canvas, svg {
  max-width: 100%;
  display: block;
}

@media (max-width: 768px) and (min-width: 481px) {
  :root, html { font-size: 14px !important; }
}
@media (max-width: 480px) {
  :root, html { font-size: 12px !important; }
}
@media (min-width: 769px) {
  :root, html { font-size: 16px !important; }
}
</style>