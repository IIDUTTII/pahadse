<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { auth } from '../firebase.js'
import { onAuthStateChanged } from 'firebase/auth'
import { isAdmin, isSuperAdmin } from '../userAuth.js'

defineOptions({ name: 'NavBar' })

const currentUser = ref(null)
const userInitials = ref('')
let unsubscribeAuth = null

// --- Navbar hide/show on scroll ---
const showNavbar = ref(true)
let lastScrollY = 0

const handleScroll = () => {
  const currentScrollY = window.scrollY
  if (currentScrollY > lastScrollY && currentScrollY > 50) {
    // Scrolling down & past 50px → hide
    showNavbar.value = false
  } else {
    // Scrolling up → show
    showNavbar.value = true
  }
  lastScrollY = currentScrollY
}
// ---------------------------------

onMounted(() => {
  // Auth listener
  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    currentUser.value = user
    if (user?.displayName) {
      const parts = user.displayName.trim().split(' ')
      userInitials.value = parts.map(p => p[0]).join('').toUpperCase().slice(0, 2)
    } else if (user?.email) {
      userInitials.value = user.email[0].toUpperCase()
    }
  })

  // Scroll listener
  window.addEventListener('scroll', handleScroll)
})

import { watch } from 'vue'

watch([isAdmin, isSuperAdmin], () => {
  console.log('Admin:', isAdmin.value)
  console.log('SuperAdmin:', isSuperAdmin.value)
})

onUnmounted(() => {
  if (unsubscribeAuth) unsubscribeAuth()
  window.removeEventListener('scroll', handleScroll)
})

const mobileMenuOpen = ref(false)
function toggleMobileMenu() { mobileMenuOpen.value = !mobileMenuOpen.value }
function closeMobileMenu() { mobileMenuOpen.value = false }
</script>

<template>
  <header
    class="topbar"
    :class="{ 'topbar-hidden': !showNavbar }"
  >
    <div class="tb-left">
      <router-link to="/" class="logo-link">
        <img src="../assets/logo.png" alt="PahadSe" class="logo-img" />
        <span class="logo-text">PahadSe</span>
      </router-link>
    </div>

    <nav class="tb-center desktop-nav">
      <router-link to="/">Home</router-link>
      <router-link v-if="isAdmin || isSuperAdmin" to="/admin">Admin</router-link>
      <router-link v-if="currentUser" to="/cart">Cart</router-link>
      <router-link v-if="currentUser" to="/user">Profile</router-link>
      <router-link to="/terms">Terms</router-link>
      <router-link to="/about">About</router-link>
      <router-link to="/contact">Contact</router-link>
    </nav>

    <div class="tb-right">
      <template v-if="!currentUser">
        <router-link to="/login" class="btn-outline">Login</router-link>
        <router-link to="/register" class="btn-fill desktop-only">Register</router-link>
      </template>
      <template v-else>
        <router-link to="/user" class="user-chip">
          <div class="avatar">
            <img v-if="currentUser.photoURL" :src="currentUser.photoURL" class="avatar-img" />
            <span v-else class="avatar-initials">{{ userInitials }}</span>
          </div>
          <span class="user-name desktop-only">{{ currentUser.displayName || currentUser.email }}</span>
        </router-link>
      </template>
      <button class="hamburger mobile-only" @click="toggleMobileMenu" :class="{ open: mobileMenuOpen }">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>

  <transition name="menu-slide">
    <div v-if="mobileMenuOpen" class="mobile-menu" @click="closeMobileMenu">
      <router-link to="/">🏠 Home</router-link>
      <router-link v-if="isAdmin || isSuperAdmin" to="/admin">⚙️ Admin</router-link>
      <router-link to="/terms">🛍️ Terms</router-link>
      <router-link to="/user">📖 Profile</router-link>
      <router-link to="/about">📚 About</router-link>
      <router-link to="/contact">📞 Contact</router-link>
      <template v-if="!currentUser">
        <div class="menu-divider"></div>
        <router-link to="/login">Login</router-link>
        <router-link to="/register">Register</router-link>
      </template>
    </div>
  </transition>
  <div v-if="mobileMenuOpen" class="menu-overlay" @click="closeMobileMenu"></div>

  <nav class="mobile-bottom-nav">
    <router-link to="/" class="mob-item"><span>🏠</span><span>Home</span></router-link>
    <router-link to="/terms" class="mob-item"><span>🛍️</span><span>Terms</span></router-link>
    <router-link to="/cart" class="mob-item"><span>🛒</span><span>Cart</span></router-link>
    <router-link to="/user" class="mob-item"><span>👤</span><span>Profile</span></router-link>
  </nav>
</template>

<style scoped>
/* ========== YOUR ORIGINAL STYLES (exactly as you had them) ========== */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600;700;800&display=swap');

:root {
  --premium-green: #0F2A1F;
  --pure-white: #FFFFFF;
  --warm-bg: #FAFAF5;
}

.topbar {
  position: fixed;
  top: 1.5%;
  left: 0;
  right: 0;
  z-index: 200;
  height: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  background: transparent;
  pointer-events: none;
  transition: transform 0.35s ease;
}
.topbar > * { pointer-events: all; }
.topbar-hidden { transform: translateY(-150%); }

.tb-left { display: flex; align-items: center; padding-left: 20px; }
.logo-link { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.logo-img { width: 62px; height: 62px; object-fit: contain; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.1)); }
.logo-text { 
  font-family: 'Playfair Display', serif; 
  font-size: 24px; 
  font-weight: 800;
  color: #0F2A1F !important; 
  white-space: nowrap; 
}

.desktop-nav {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(16px);
  border: 1px solid rgba(15, 42, 31, 0.15); 
  box-shadow: 0 6px 18px rgba(15, 42, 31, 0.08);
  border-radius: 999px; 
  padding: 10px 18px;
}
.desktop-nav a {
  text-decoration: none; color: #475569; font-size: 15px; font-weight: 500;
  padding: 7.5px 18px; 
  border-radius: 999px;
  transition: all 0.2s ease; white-space: nowrap;
}
.desktop-nav a:hover,
.desktop-nav a.router-link-active,
.desktop-nav a.router-link-exact-active { 
  background-color: #0F2A1F !important; 
  color: #FFFFFF !important; 
  font-weight: 600 !important;
  box-shadow: 0 2px 8px rgba(15, 42, 31, 0.25) !important;
  transform: translateY(-1px);
}
@media (max-width: 900px) { .desktop-nav { display: none; } }

.tb-right {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(16px);
  border: 1px solid rgba(15, 42, 31, 0.15);
  box-shadow: 0 6px 18px rgba(15, 42, 31, 0.08);
  border-radius: 999px; 
  padding: 12.5px 16px; 
  margin-right: 20px;
}

.btn-outline {
  border: 1.8px solid #0F2A1F !important; background: transparent; color: #0F2A1F !important;
  padding: 8px 20px; border-radius: 999px; font-size: 14px; font-weight: 700;
  cursor: pointer; text-decoration: none; transition: all .2s ease; white-space: nowrap;
}
.btn-outline:hover { background: #0F2A1F !important; color: #FFFFFF !important; box-shadow: 0 2px 6px rgba(15, 42, 31, 0.2); transform: translateY(-1px); }

.btn-fill {
  background: #0F2A1F !important; color: #FFFFFF !important; 
  padding: 8px 20px; border-radius: 999px; border: 1.8px solid #0F2A1F !important;
  font-size: 14px; font-weight: 700; text-decoration: none;
  cursor: pointer; transition: all .2s ease; white-space: nowrap;
  box-shadow: 0 2px 6px rgba(15, 42, 31, 0.2);
}
.btn-fill:hover { background: #0b1f17 !important; border-color: #0b1f17 !important; transform: translateY(-1px); }

.user-chip { display: flex; align-items: center; gap: 8px; text-decoration: none; color: #0F2A1F; font-size: 15px; font-weight: 600; padding: 3px 10px 3px 3px; border-radius: 999px; transition: background 0.2s; }
.user-chip:hover { background: rgba(15, 42, 31, 0.05); }
.avatar { width: 36px; height: 36px; border-radius: 50%; background: #D6D8C8; border: 2px solid #0F2A1F; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-initials { font-size: 14px; font-weight: 800; color: #0F2A1F; }
.user-name { white-space: nowrap; max-width: 110px; overflow: hidden; text-overflow: ellipsis; font-size: 14px; }

.hamburger {
  width: 34px; height: 34px; border-radius: 8px;
  border: 1.8px solid #0F2A1F; background: transparent; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  padding: 5px; transition: background .2s;
}
.hamburger span { display: block; width: 18px; height: 2px; background: #0F2A1F; border-radius: 2px; transition: transform .2s, opacity .2s; transform-origin: center; }
.hamburger.open span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
.hamburger.open span:nth-child(2) { opacity: 0; }
.hamburger.open span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }
.hamburger:hover { background: rgba(15, 42, 31, 0.05); }

.desktop-only { display: inline; }
.mobile-only { display: none; }

@media (max-width: 900px) {
  .desktop-only { display: none; }
  .mobile-only { display: flex; }
  .logo-img { width: 50px; height: 50px; }
  .logo-text { font-size: 20px !important; font-weight: 800 !important; letter-spacing: -0.2px; }
  .tb-right { margin-right: 6px; padding: 7px 9px; gap: 4px; }
  .btn-outline { padding: 4px 12px; font-size: 12px; border-width: 2.0px !important; }
  .btn-fill { padding: 4px 12px; font-size: 12px; border-width: 1.2px !important; }
  .hamburger { width: 28px; height: 28px; border-width: 1.2px; }
  .avatar { width: 32px; height: 32px; }
  .avatar-initials { font-size: 12px; }
  .user-name { display: none; }
}
@media (max-width: 500px) { .tb-left { padding-left: 3%; padding-top: 1%; } }
@media (max-width: 400px) { .logo-text { font-size: 18px !important; } }

.mobile-menu {
  position: fixed; top: 68px; right: 12px; width: 210px;
  background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(16px);
  border: 1px solid #0F2A1F; border-radius: 14px;
  box-shadow: 0 12px 28px rgba(15, 42, 31, 0.15);
  z-index: 300; overflow: hidden; padding: 8px 0;
}
.mobile-menu a {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; text-decoration: none;
  color: #0F2A1F; font-size: 13px; font-weight: 500; transition: background .15s;
}
.mobile-menu a:hover { background: rgba(15, 42, 31, 0.08); }
.mobile-menu a.router-link-active,
.mobile-menu a.router-link-exact-active { color: #FFFFFF !important; font-weight: 700; background: #0F2A1F !important; }
.menu-divider { height: 1px; background: rgba(15, 42, 31, 0.12); margin: 6px 0; }
.menu-overlay { position: fixed; inset: 0; z-index: 290; background: rgba(0,0,0,0.2); backdrop-filter: blur(2px); }

.menu-slide-enter-active, .menu-slide-leave-active { transition: opacity .2s, transform .2s; }
.menu-slide-enter-from, .menu-slide-leave-to { opacity: 0; transform: translateY(-8px) scale(.96); }

.mobile-bottom-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255, 255, 255, 0.96); backdrop-filter: blur(12px); border-top: 1px solid rgba(15, 42, 31, 0.12); padding: 8px 0; justify-content: space-around; z-index: 200; box-shadow: 0 -2px 12px rgba(15, 42, 31, 0.05); }
@media (max-width: 900px) { .mobile-bottom-nav { display: flex; } }
.mob-item { display: flex; flex-direction: column; align-items: center; gap: 2px; text-decoration: none; color: #64748b; font-size: 10px; padding: 4px 12px; border-radius: 8px; transition: color .2s; font-weight: 600; }
.mob-item span:first-child { font-size: 20px; }
.mob-item.router-link-active,
.mob-item.router-link-exact-active { color: #0F2A1F !important; font-weight: 700; }
</style>