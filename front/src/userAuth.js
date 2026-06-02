import { ref } from 'vue'
import { auth, db } from './firebase.js'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

export const currentUser = ref(null)
export const isAdmin     = ref(false)
export const isSuperAdmin = ref(false) // 👈 1. ADDED SUPERADMIN STATE EXTENSION
export const authReady   = ref(false)

// Sirf ek baar chalta hai — app start pe
export const authPromise = new Promise((resolve) => {
  onAuthStateChanged(auth, async (user) => {
    currentUser.value = user
    if (user) {
      const snap = await getDoc(doc(db, 'users', user.uid))
      const userRole = snap.data()?.role // Extract the role string once
      
      // 👈 2. ASSIGN VALUES BASED ON TRUE ROLE STRING
      isAdmin.value      = userRole === 'admin'
      isSuperAdmin.value = userRole === 'superadmin' 
    } else {
      isAdmin.value      = false
      isSuperAdmin.value = false // Reset state cleanly on user sign-out
    }
    authReady.value = true
    resolve()
  })
})
