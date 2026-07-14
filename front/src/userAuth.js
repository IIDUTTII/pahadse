import { ref } from 'vue'
import { auth, db } from './firebase.js'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

export const currentUser = ref(null)
export const isAdmin = ref(false)
export const isSuperAdmin = ref(false)
export const authReady = ref(false)

export const authPromise = new Promise((resolve) => {
  onAuthStateChanged(auth, async (user) => {
    currentUser.value = user

    if (user) {
      // 👇 ADD THESE 2 LINES
      const token = await user.getIdToken(true)
      console.log("FIREBASE ID TOKEN:", token)

      const snap = await getDoc(doc(db, 'users', user.uid))
      console.log('ROLE =>', snap.data()?.role)

      const userRole = snap.data()?.role
      isAdmin.value = userRole === 'admin'
      isSuperAdmin.value = userRole === 'superadmin'
    } else {
      isAdmin.value = false
      isSuperAdmin.value = false
    }

    authReady.value = true
    resolve()
  })
})