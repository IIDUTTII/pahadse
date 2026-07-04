import { createRouter, createWebHistory } from 'vue-router'
import { isAdmin, isSuperAdmin, authPromise } from '../userAuth.js'

import Landing     from '../components/landing.vue'
import Home          from '../components/home.vue'
import Admin         from '../components/admin/dashboard.vue'
import Login         from '../components/login.vue'
import Register      from '../components/register.vue'
import User          from '../components/user.vue'
import NotFoundView  from '../components/NotFoundView.vue'
import Privacy        from '../components/PolicyView.vue'
import Cart          from '../components/cartview.vue'
import ProductDetail from '../components/ProductDetail.vue'   
import ProductForm from '../components/productedit.vue'
import checkout from '../components/checkout.vue'
import Terms from '../components/terms.vue'
import Return  from '../components/return-refund.vue'  
import Contact from '../components/contact.vue'
import About from '../components/about.vue'
import orders from '../components/orders.vue'
import layout from '../components/layout.vue'


const routes = [
  { path: '/',                       component:   Landing,meta: { title: 'PahadSe' }          },
  { path: '/products',              component:   Home,meta: { title: 'Home | PahadSe' }          },
  { path: '/login',                  component: Login,meta: { title: 'Login | PahadSe' }         },
  { path: '/register',               component: Register,meta: { title: 'Register | PahadSe' }      },
  { path: '/user',                   component: User,meta: { title: 'User | PahadSe' }          },
  { path: '/privacy',               component: Privacy,meta: { title: 'Privacy | PahadSe' }       },
  { path: '/cart',                   component: Cart,meta: { title: 'Cart | PahadSe' }          },
  { path: '/product/:id',            component: ProductDetail,meta: { title: 'Product | PahadSe' } },  // 👈 new
  { path: '/admin', component: Admin, meta: { title: 'Admin | PahadSe', requiresAdmin: true } },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFoundView },
  { path: '/admin/product/:id', component: ProductForm, meta: { title: 'Edit Product | PahadSe', requiresAdmin: true } },
  { path: '/checkout', component: checkout,meta: { title: 'Checkout | PahadSe' } },
  { path: '/terms', component: Terms,meta: { title: 'Terms | PahadSe' } },
  { path: '/return', component: Return,meta: { title: 'Return & Refund | PahadSe' } },
  { path: '/contact', component: Contact,meta: { title: 'Contact | PahadSe' } },
  { path: '/about', component: About,meta: { title: 'About | PahadSe' } },
  { path: '/orders', component: orders,meta: { title: 'Orders | PahadSe' } },
  { path: '/layout', component: layout,meta: { title: 'Layout | PahadSe' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // If coming back via back/forward, restore position
    if (savedPosition) {
      return savedPosition
    }
    // If there's a hash (e.g., /page#section), scroll to it
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth', top: 70 }
    }
    // Default: scroll to top
    return { top: 0, left: 0, behavior: 'smooth' }
  }
})

// ── Fixed: return value instead of next() — removes the deprecated warning
router.beforeEach(async (to, from) => {
  await authPromise   // wait for auth to be ready (only blocks on first load)

  if (to.meta.requiresAdmin) {
    if (isAdmin.value || isSuperAdmin.value) {
      return true          // ✅ allow
    } else {
      alert('app admin nahi ho')  // 🚫 block
      return '/'           // ✅ redirect — replaces next('/')
    }
  }

  return true              // ✅ allow all other routes — replaces next()
})

export default router