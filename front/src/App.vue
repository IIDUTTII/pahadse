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
/* Global reset — sirf ek jagah */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #app {
  background: #F5EFE0;
  min-height: 100vh;
  overflow-x: hidden;
  width: 100%;
  font-family: 'DM Sans', sans-serif;
}
</style>