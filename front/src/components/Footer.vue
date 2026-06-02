<script setup>
const year = new Date().getFullYear()
defineOptions({ name: 'Footer' })
</script>

<template>
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <img src="../assets/logo.png" alt="PahadSe" class="foot-logo" />
        <span class="foot-name">PahadSe</span>
        <p class="foot-tagline">Pure Himalayan goodness,<br>no preservatives, handmade with love.</p>
      </div>

      <div class="footer-col">
        <div class="col-title">Shop</div>
        <router-link to="/products">All Products</router-link>
        <router-link to="/products?cat=Ghee+%26+Oils">Ghee & Oils</router-link>
        <router-link to="/products?cat=Juices">Juices</router-link>
        <router-link to="/products?cat=Spices+%26+Herbs">Spices & Herbs</router-link>
        <router-link to="/products?cat=Sweets">Sweets</router-link>
      </div>

      <div class="footer-col">
        <div class="col-title">Company</div>
        <router-link to="/about">About Us</router-link>
        <router-link to="/contact">Contact</router-link>
        <router-link to="/privacy">Privacy Policy</router-link>
        <router-link to="/terms">Terms of Use</router-link>
        <router-link to="/return">Return & Refund Policy</router-link>
      </div>

      <div class="footer-col">
        <div class="col-title">Account</div>
        <router-link to="/login">Login</router-link>
        <router-link to="/register">Register</router-link>
        <router-link to="/user">My Profile</router-link>
        <router-link to="/orders">My Orders</router-link>
      </div>
    </div>

    <div class="footer-bottom">
      <span>© {{ year }} PahadSe. All rights reserved.</span>
      <span class="made-with">🏔️ Made with care in Himachal Pradesh</span>
    </div>
  </footer>
</template>

<style scoped>
/* 🌿 PREMIUM GREEN/DARK FOOTER */
.footer {
  background: #0F2A1F;
  color: #D9E0D4;
  font-family: 'DM Sans', system-ui, sans-serif;
  margin-top: 60px;
  padding-bottom: 20px;
}

.footer-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 28px 32px;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 40px;
}

.footer-brand {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.foot-logo {
  width: 38px;
  height: 38px;
  object-fit: contain;
  filter: brightness(1.1);
}
.foot-name {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  font-weight: 700;
  color: #C9A96E;
}
.foot-tagline {
  font-size: 13px;
  color: rgba(217, 224, 212, 0.55);
  line-height: 1.5;
  margin: 0;
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.col-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: #9CAF88;
  margin-bottom: 4px;
}
.footer-col a {
  text-decoration: none;
  color: rgba(217, 224, 212, 0.55);
  font-size: 13px;
  transition: color 0.2s;
}
.footer-col a:hover {
  color: #C9A96E;
}

.footer-bottom {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px 28px 0;
  border-top: 1px solid rgba(156, 175, 136, 0.25);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(217, 224, 212, 0.4);
  flex-wrap: wrap;
  gap: 8px;
}
.made-with {
  color: rgba(217, 224, 212, 0.42);
  font-style: italic;
}

@media (max-width: 900px) {
  .footer-inner {
    grid-template-columns: 1fr 1fr;
    gap: 28px;
  }
}
@media (max-width: 500px) {
  .footer-inner {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 36px 20px 24px;
  }
  .footer-bottom {
    flex-direction: column;
    text-align: center;
  }
}
@media (max-width: 767px) {
  .footer {
    padding-bottom: 80px;
  }
}
</style>