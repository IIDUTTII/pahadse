<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { auth }           from '../firebase.js'
import { onAuthStateChanged } from 'firebase/auth'
import { isAdmin, isSuperAdmin } from '../userAuth.js'

defineOptions({ name: 'NavBar' })

const currentUser  = ref(null)
const userInitials = ref('')
let unsubscribeAuth = null

onMounted(() => {
  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    currentUser.value = user
    if (user?.displayName) {
      const parts = user.displayName.trim().split(' ')
      userInitials.value = parts.map(p => p[0]).join('').toUpperCase().slice(0, 2)
    } else if (user?.email) {
      userInitials.value = user.email[0].toUpperCase()
    }
  })
})
onUnmounted(() => { if (unsubscribeAuth) unsubscribeAuth() })

const mobileMenuOpen = ref(false)
function toggleMobileMenu() { mobileMenuOpen.value = !mobileMenuOpen.value }
function closeMobileMenu()  { mobileMenuOpen.value = false }
</script>

<template>
  <header class="topbar">
    <div class="tb-left">
      <router-link to="/" class="logo-link">
        <img src="../assets/logo.png" alt="PahadSe" class="logo-img" />
        <span class="logo-text">PahadSe</span>
      </router-link>
    </div>

    <nav class="tb-center desktop-nav">
      <router-link to="/">Home</router-link>
      <router-link v-if="isAdmin || isSuperAdmin" to="/admin">Admin</router-link>
      <router-link to="/cart">Cart</router-link>
      <router-link to="/user">Profile</router-link>
      <router-link to="/policies">Policies</router-link>
      <router-link to="/contact">Contact</router-link>
    </nav>

    <div class="tb-right">
      <template v-if="!currentUser">
        <router-link to="/login"    class="btn-outline">Login</router-link>
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
      <router-link to="/policies">🛍️ Policies</router-link>
      <router-link to="/user">📖 Profile</router-link>
      <router-link to="/contact">📞 Contact</router-link>
      <template v-if="!currentUser">
        <div class="menu-divider"></div>
        <router-link to="/login">Login</router-link>
        <router-link to="/register">Register</router-link>
      </template>
    </div>
  </transition>
  <div v-if="mobileMenuOpen" class="menu-overlay" @click="closeMobileMenu"></div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500&display=swap');

:root {
  --cream:    #F5EDE0;
  --warm:     #D6D8C8;
  --gold:     #7A8C5A;
  --brown:    #147b27;
  --brown-dk: #147b27;
  --muted:    #7A826A;
  --white:    #FAFAF5;
}

.topbar {
  position: fixed; top: 3.3%; left: 0; right: 0; z-index: 200;
  height: 5%; display: flex; align-items: center; justify-content: space-between;
  padding: 0 4px; background: transparent; pointer-events: none;
}
.topbar > * { pointer-events: all; }

.tb-left   { display: flex; align-items: center; padding-left: 16px; }
.logo-link { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.logo-img  { width: 52px; height: 52px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.12)); }
.logo-text { font-family: 'Cormorant Garamond', serif; font-size: 21px; font-weight: 700; color: #2C3520; white-space: nowrap; }

.desktop-nav {
  display: flex; align-items: center; gap: 2px;
  background: rgba(255,253,247,0.92); backdrop-filter: blur(16px);
  border: 1px solid rgba(122,140,90,0.20);
  box-shadow: 0 8px 28px rgba(44,53,32,0.10);
  border-radius: 999px; padding: 6px 12px;
}
.desktop-nav a {
  text-decoration: none; color: #7A826A; font-size: 13px; font-weight: 500;
  padding: 6px 14px; border-radius: 999px;
  transition: background .2s, color .2s; white-space: nowrap;
}
.desktop-nav a:hover              { background: #147b27; color: #3D4A2E; }
.desktop-nav a.router-link-active { background: #147b27; color: #F5EDE0; }
@media (max-width: 700px) { .desktop-nav { display: none; } }

.tb-right {
  display: flex; align-items: center; gap: 8px;
  background: rgba(255,253,247,0.92); backdrop-filter: blur(16px);
  border: 1px solid rgba(122,140,90,0.20);
  box-shadow: 0 8px 28px rgba(44,53,32,0.10);
  border-radius: 999px; padding: 6px 12px;
}
.btn-outline {
  border: 1.5px solid #7A8C5A; background: transparent; color: #7A8C5A;
  padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 500;
  cursor: pointer; text-decoration: none; transition: all .2s; white-space: nowrap;
}
.btn-outline:hover { background: #7A8C5A; color: #FAFAF5; }
.btn-fill {
  background: #2C3520; color: #F5EDE0; padding: 6px 16px; border-radius: 999px;
  font-size: 13px; font-weight: 500; text-decoration: none; border: none;
  cursor: pointer; transition: background .2s; white-space: nowrap;
}
.btn-fill:hover { background: #3D4A2E; }

.user-chip       { display: flex; align-items: center; gap: 8px; text-decoration: none; color: #2C3520; font-size: 13px; font-weight: 500; }
.avatar          { width: 32px; height: 32px; border-radius: 50%; background: #D6D8C8; border: 2px solid #7A8C5A; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-img      { width: 100%; height: 100%; object-fit: cover; }
.avatar-initials { font-size: 13px; font-weight: 700; color: #3D4A2E; }
.user-name       { white-space: nowrap; max-width: 100px; overflow: hidden; text-overflow: ellipsis; }

.hamburger {
  width: 32px; height: 36px; border-radius: 8px;
  border: 1.5px solid #D6D8C8; background: transparent; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  padding: 6px; transition: background .2s;
}
.hamburger span { display: block; width: 100%; height: 2px; background: #7A826A; border-radius: 2px; transition: transform .25s, opacity .25s; transform-origin: center; }
.hamburger.open span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
.hamburger.open span:nth-child(2) { opacity: 0; }
.hamburger.open span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }
.hamburger:hover { background: #D6D8C8; }

.desktop-only { display: inline; }
.mobile-only  { display: none;   }

@media (max-width: 700px) {
  .desktop-only { display: none; }
  .mobile-only  { display: flex; }
  .tb-right { margin-right: 3px; padding: 3px 9px; gap: 4px; }
}
@media (max-width: 500px) { .tb-left { padding-left: 1%; padding-top: 3%; } }
@media (max-width: 400px) { .logo-text { font-size: 17px; } }

.mobile-menu {
  position: fixed; top: 68px; right: 16px; width: 220px;
  background: rgba(255,253,247,0.97); backdrop-filter: blur(16px);
  border: 1px solid #D6D8C8; border-radius: 16px;
  box-shadow: 0 16px 40px rgba(44,53,32,0.16);
  z-index: 300; overflow: hidden; padding: 8px 0;
}
.mobile-menu a {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 18px; text-decoration: none;
  color: #2C3520; font-size: 14px; font-weight: 500; transition: background .15s;
}
.mobile-menu a:hover              { background: #D6D8C8; }
.mobile-menu a.router-link-active { color: #3D4A2E; font-weight: 700; }
.menu-divider { height: 1px; background: #D6D8C8; margin: 6px 0; }
.menu-overlay { position: fixed; inset: 0; z-index: 290; background: rgba(0,0,0,0.15); }

.menu-slide-enter-active, .menu-slide-leave-active { transition: opacity .2s, transform .2s; }
.menu-slide-enter-from, .menu-slide-leave-to       { opacity: 0; transform: translateY(-10px) scale(.97); }
</style>