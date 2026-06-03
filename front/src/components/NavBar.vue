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
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600;700;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700;800&family=DM+Sans:wght@400;500;600;700;800&display=swap');

:root {
  /* ✨ Exact Premium Footer Colors */
  --premium-green: #0F2A1F;
  --pure-white: #FFFFFF;
  --warm-bg: #FAFAF5;
}

.topbar {
  position: fixed; top: 3.3%; left: 0; right: 0; z-index: 200;
  height: 5%; display: flex; align-items: center; justify-content: space-between;
  padding: 0 4px; background: transparent; pointer-events: none;
}
.topbar > * { pointer-events: all; }

.tb-left { display: flex; align-items: center; padding-left: 20px; }
.logo-link { display: flex; align-items: center; gap: 12px; text-decoration: none; }

/* 🚀 BIGGER LOGO FOR PC */
.logo-img { width: 66px; height: 66px; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.15)); }

.logo-text { 
  font-family: 'Playfair Display', serif; 
  font-size: 30px; 
  font-weight: 800; /* Playfair beautifully supports 800 and 900 */
  color: #0F2A1F !important; 
  white-space: nowrap; 
}

/* 🚀 NAV BAR BACKGROUND */
.desktop-nav {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(16px);
  border: 1px solid rgba(15, 42, 31, 0.15); 
  box-shadow: 0 10px 30px rgba(15, 42, 31, 0.12);
  border-radius: 999px; padding: 8px 16px;
}

/* 🚀 BIGGER NAV TEXT */
.desktop-nav a {
  text-decoration: none; color: #475569; font-size: 16px; font-weight: 600;
  padding: 10px 22px; border-radius: 999px;
  transition: all 0.3s ease; white-space: nowrap;
}

/* ✨ FORCED PREMIUM GREEN ON HOVER & CLICK (ACTIVE) */
.desktop-nav a:hover,
.desktop-nav a.router-link-active,
.desktop-nav a.router-link-exact-active { 
  background-color: #0F2A1F !important; 
  color: #FFFFFF !important; 
  font-weight: 700 !important;
  box-shadow: 0 4px 12px rgba(15, 42, 31, 0.35) !important;
  transform: translateY(-2px);
}

@media (max-width: 900px) { .desktop-nav { display: none; } }

.tb-right {
  display: flex; align-items: center; gap: 12px;
  background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(16px);
  border: 1px solid rgba(15, 42, 31, 0.15);
  box-shadow: 0 10px 30px rgba(15, 42, 31, 0.12);
  border-radius: 999px; padding: 8px 16px; margin-right: 20px;
}

/* 🚀 BIGGER LOGIN/REGISTER BUTTONS FOR PC */
.btn-outline {
  border: 2px solid #0F2A1F !important; background: transparent; color: #0F2A1F !important;
  padding: 12px 26px; border-radius: 999px; font-size: 16px; font-weight: 800;
  cursor: pointer; text-decoration: none; transition: all .3s ease; white-space: nowrap;
}
.btn-outline:hover { background: #0F2A1F !important; color: #FFFFFF !important; box-shadow: 0 4px 10px rgba(15, 42, 31, 0.3); transform: translateY(-1px); }

.btn-fill {
  background: #0F2A1F !important; color: #FFFFFF !important; 
  padding: 12px 26px; border-radius: 999px; border: 2px solid #0F2A1F !important;
  font-size: 16px; font-weight: 800; text-decoration: none;
  cursor: pointer; transition: all .3s ease; white-space: nowrap;
  box-shadow: 0 4px 12px rgba(15, 42, 31, 0.3);
}
.btn-fill:hover { background: #0b1f17 !important; border-color: #0b1f17 !important; transform: translateY(-1px); }

/* User Profile Chip */
.user-chip       { display: flex; align-items: center; gap: 10px; text-decoration: none; color: #0F2A1F; font-size: 16px; font-weight: 700; padding: 4px 12px 4px 4px; border-radius: 999px; transition: background 0.2s; }
.user-chip:hover { background: rgba(15, 42, 31, 0.05); }
.avatar          { width: 40px; height: 40px; border-radius: 50%; background: #D6D8C8; border: 2px solid #0F2A1F; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-img      { width: 100%; height: 100%; object-fit: cover; }
.avatar-initials { font-size: 15px; font-weight: 800; color: #0F2A1F; }
.user-name       { white-space: nowrap; max-width: 120px; overflow: hidden; text-overflow: ellipsis; }

/* Hamburger Menu */
.hamburger {
  width: 38px; height: 38px; border-radius: 8px;
  border: 2px solid #0F2A1F; background: transparent; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px;
  padding: 6px; transition: background .2s;
}
.hamburger span { display: block; width: 100%; height: 2px; background: #0F2A1F; border-radius: 2px; transition: transform .25s, opacity .25s; transform-origin: center; }
.hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.hamburger.open span:nth-child(2) { opacity: 0; }
.hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
.hamburger:hover { background: rgba(15, 42, 31, 0.05); }

.desktop-only { display: inline; }
.mobile-only  { display: none;   }

/* Responsive Scaling for Mobile */
@media (max-width: 900px) {
  .desktop-only { display: none; }
  .mobile-only  { display: flex; }
  
  .logo-img  { width: 48px; height: 48px; }
  .logo-text { font-size: 24px !important;   /* keep existing size */
    font-weight: 900 !important;
    letter-spacing: -0.3px;}
  .tb-right { margin-right: 4px; padding: 4px 10px; gap: 6px; }
  .btn-outline { padding: 8px 16px; font-size: 14px; border-width: 1.5px !important; }
  .hamburger { width: 34px; height: 34px; border-width: 1.5px; }
}
@media (max-width: 500px) { .tb-left { padding-left: 2%; padding-top: 2%; } }
@media (max-width: 400px) { .logo-text { font-size: 20px !important; } }

/* Mobile Menu Panel */
.mobile-menu {
  position: fixed; top: 76px; right: 16px; width: 230px;
  background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(16px);
  border: 1px solid #0F2A1F; border-radius: 16px;
  box-shadow: 0 16px 40px rgba(15, 42, 31, 0.2);
  z-index: 300; overflow: hidden; padding: 10px 0;
}
.mobile-menu a {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px; text-decoration: none;
  color: #0F2A1F; font-size: 15px; font-weight: 600; transition: background .15s;
}
.mobile-menu a:hover { background: rgba(15, 42, 31, 0.08); }
.mobile-menu a.router-link-active,
.mobile-menu a.router-link-exact-active { color: #FFFFFF !important; font-weight: 800; background: #0F2A1F !important; }
.menu-divider { height: 1px; background: rgba(15, 42, 31, 0.15); margin: 8px 0; }
.menu-overlay { position: fixed; inset: 0; z-index: 290; background: rgba(0,0,0,0.25); backdrop-filter: blur(2px); }

.menu-slide-enter-active, .menu-slide-leave-active { transition: opacity .2s, transform .2s; }
.menu-slide-enter-from, .menu-slide-leave-to       { opacity: 0; transform: translateY(-10px) scale(.97); }

/* Mobile Bottom Nav */
.mobile-bottom-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(14px); border-top: 1px solid rgba(15, 42, 31, 0.15); padding: 10px 0; justify-content: space-around; z-index: 200; box-shadow: 0 -4px 20px rgba(15, 42, 31, 0.08); }
@media (max-width: 900px) { .mobile-bottom-nav { display: flex; } }
.mob-item { display: flex; flex-direction: column; align-items: center; gap: 4px; text-decoration: none; color: #64748b; font-size: 11px; padding: 4px 14px; border-radius: 10px; transition: color .2s; font-weight: 600; }
.mob-item span:first-child { font-size: 22px; }
.mob-item.router-link-active,
.mob-item.router-link-exact-active { color: #0F2A1F !important; font-weight: 800; }
</style>