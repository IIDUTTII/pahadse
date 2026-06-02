import { createRouter, createWebHistory } from 'vue-router'
import { isAdmin, isSuperAdmin, authPromise } from '../userAuth.js'

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

const routes = [
  { path: '/',                       component: Home          },
  { path: '/login',                  component: Login         },
  { path: '/register',               component: Register      },
  { path: '/user',                   component: User          },
  { path: '/privacy',               component: Privacy       },
  { path: '/cart',                   component: Cart          },
  { path: '/product/:id',            component: ProductDetail },  // 👈 new
  { path: '/admin', component: Admin, meta: { requiresAdmin: true } },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFoundView },
  { path: '/admin/product/:id', component: ProductForm, meta: { requiresAdmin: true } },
  { path: '/checkout', component: checkout },
  { path: '/terms', component: Terms },
  { path: '/return', component: Return },
  { path: '/contact', component: Contact },
  { path: '/about', component: About }

]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// ── Fixed: return value instead of next() — removes the deprecated warning
router.beforeEach(async (to, from) => {
  await authPromise   // wait for auth to be ready (only blocks on first load)

  if (to.meta.requiresAdmin) {
    if (isAdmin.value || isSuperAdmin.value) {
      return true          // ✅ allow
    } else {
      alert('maderchod tu admin nahi hai')
      return '/'           // ✅ redirect — replaces next('/')
    }
  }

  return true              // ✅ allow all other routes — replaces next()
})

export default router