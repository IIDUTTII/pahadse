/**
 * db.js  —  Single source of truth for ALL Firebase operations.
 * ─────────────────────────────────────────────────────────────────────────────
 * Rules:
 *   • Vue files NEVER import from firebase directly — only from here.
 *   • Every read is cached in memory to avoid repeat Firestore charges.
 *   • Cache is busted only when a write happens that affects the cached data.
 *   • logProductView is debounced per-product-per-session so a refresh
 *     doesn't double-count and waste a write.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { db, auth } from '../firebase.js'
import {
  collection, getDocs, getDoc, query, where,
  doc, setDoc, updateDoc, deleteDoc, addDoc, increment, serverTimestamp, arrayUnion
} from 'firebase/firestore'
import { signOut, sendPasswordResetEmail } from 'firebase/auth'

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY CACHE LAYER
// ─────────────────────────────────────────────────────────────────────────────

let _activeProductsCache = null
const _productCache = new Map()
const _cartCache = new Map()
const _userRoleCache = new Map()
const _viewedThisSession = new Set()

function _bustProductListCache() {
  _activeProductsCache = null
}

export const updateUserDisplayName = async (uid, newName) => {
  await updateDoc(doc(db, "users", uid), { displayName: newName })
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS — READ
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchActiveProducts() {
  if (_activeProductsCache !== null) {
    return _activeProductsCache
  }
  const snap = await getDocs(query(collection(db, 'products'), where('isActive', '==', true)))
  _activeProductsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  _activeProductsCache.forEach(p => _productCache.set(p.id, p))
  return _activeProductsCache
}

export async function fetchAllProducts() {
  const snap = await getDocs(collection(db, 'products'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function fetchProductById(productId) {
  if (_productCache.has(productId)) {
    return _productCache.get(productId)
  }
  const snap = await getDoc(doc(db, 'products', productId))
  if (!snap.exists()) return null
  const product = { id: snap.id, ...snap.data() }
  _productCache.set(productId, product)
  return product
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS — WRITE  (admin only)
// ─────────────────────────────────────────────────────────────────────────────

export async function addProduct(payload) {
  const ref = await addDoc(collection(db, 'products'), {
    ...payload,
    createdAt: serverTimestamp(),
  })
  _bustProductListCache()
  return ref.id
}

export async function updateProduct(productId, payload) {
  await updateDoc(doc(db, 'products', productId), payload)
  if (_productCache.has(productId)) {
    _productCache.set(productId, { ..._productCache.get(productId), ...payload })
  }
  _bustProductListCache()
}

export async function toggleProductActive(productId, currentValue) {
  const newValue = !currentValue
  await updateDoc(doc(db, 'products', productId), { isActive: newValue })
  if (_productCache.has(productId)) {
    _productCache.set(productId, { ..._productCache.get(productId), isActive: newValue })
  }
  _bustProductListCache()
}

export async function deleteProduct(productId) {
  await deleteDoc(doc(db, 'products', productId))
  _productCache.delete(productId)
  _bustProductListCache()
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

export async function logProductView(productId) {
  if (_viewedThisSession.has(productId)) return
  _viewedThisSession.add(productId)

  try {
    await updateDoc(doc(db, 'products', productId), { viewCount: increment(1) })
    const userId = auth.currentUser?.uid ?? 'anonymous'
    await addDoc(collection(db, 'productViews'), {
      productId,
      userId,
      viewedAt: serverTimestamp(),
    })
  } catch (e) {
    console.warn('logProductView failed silently:', e.message)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CART
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCart() {
  const user = auth.currentUser
  if (!user) return []
  if (_cartCache.has(user.uid)) return _cartCache.get(user.uid).items ?? []
  
  const snap = await getDoc(doc(db, 'carts', user.uid))
  const data = snap.exists() ? snap.data() : { items: [] }
  _cartCache.set(user.uid, data)
  return data.items ?? []
}

export function bustCartCache() {
  const user = auth.currentUser
  if (user) _cartCache.delete(user.uid)
}

export async function isProductInCart(productId) {
  const items = await fetchCart()
  return items.some(i => i.productId === productId)
}

export async function addProductToCart(product, finalPrice) {
  const user = auth.currentUser
  if (!user) throw new Error('NOT_LOGGED_IN')

  const cartRef = doc(db, 'carts', user.uid)
  await setDoc(cartRef, {
    items: arrayUnion({
      productId : product.id,
      name      : product.name,
      price     : Number(finalPrice),
      emoji     : product.emoji || '📦',
      quantity  : 1,
    }),
  }, { merge: true })

  bustCartCache()
}

export async function saveCartItems(updatedItems) {
  const user = auth.currentUser
  if (!user) return
  const cartRef = doc(db, 'carts', user.uid)
  await setDoc(cartRef, { items: updatedItems }, { merge: true })
  bustCartCache()
}

// ─────────────────────────────────────────────────────────────────────────────
// USERS / AUTH
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchUserRole() {
  const user = auth.currentUser
  if (!user) return 'user'

  if (_userRoleCache.has(user.uid)) {
    return _userRoleCache.get(user.uid)
  }

  try {
    const snap = await getDoc(doc(db, 'users', user.uid))
    const role = snap.exists() ? (snap.data().role ?? 'user').trim().toLowerCase() : 'user'
    _userRoleCache.set(user.uid, role)
    return role
  } catch (e) {
    console.error('fetchUserRole error:', e)
    return 'user'
  }
}

export const fetchAllUsersFromDb = async () => {
  try {
    const snap = await getDocs(collection(db, 'users'))
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error("Critical failure during users mapping sync processing:", error)
    throw error
  }
}

export const updateUserRoleInDb = async (userId, newRole) => {
  try {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, { role: newRole })
  } catch (error) {
    console.error("Role elevation transaction aborted:", error)
    throw error
  }
}

export function getCurrentUser() {
  return auth.currentUser
}

export async function logoutUser() {
  _activeProductsCache = null
  _productCache.clear()
  _cartCache.clear()
  _userRoleCache.clear()
  _viewedThisSession.clear()
  await signOut(auth)
}

export const createUserDocument = async (userData) => {
  await setDoc(doc(db, 'users', userData.uid), { ...userData, createdAt: new Date() }, { merge: true })
}

export const dispatchPasswordResetToken = async (clientEmail) => {
  if (!clientEmail || !clientEmail.trim()) throw new Error('EMAIL_REQUIRED')
  try {
    await sendPasswordResetEmail(auth, clientEmail.trim())
  } catch (error) {
    console.error('Database Layer — Reset Link Transmission Failure:', error.code)
    throw error
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT REVIEWS
// ─────────────────────────────────────────────────────────────────────────────

export const fetchProductReviews = async (productId) => {
  if (!productId) return []
  try {
    const q = query(collection(db, 'reviews'), where('productId', '==', productId))
    const snap = await getDocs(q)
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error("Error pulling product reviews matrix:", error)
    return []
  }
}

export const addProductReview = async (productId, rating, comment) => {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('NOT_LOGGED_IN')
  
  try {
    await addDoc(collection(db, 'reviews'), {
      productId,
      userId: currentUser.uid,
      userName: currentUser.displayName || 'Verified Buyer',
      rating: Number(rating),
      comment: comment.trim(),
      createdAt: serverTimestamp()
    })
  } catch (error) {
    console.error("Failed submitting user review:", error)
    throw error
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEMANTIC URL SLUG RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

export const fetchProductBySlug = async (slug) => {
  if (!slug) return null
  try {
    if (_activeProductsCache) {
      const match = _activeProductsCache.find(p => p.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') === slug)
      if (match) return match
    }
    
    const q = query(collection(db, 'products'), where('isActive', '==', true))
    const snap = await getDocs(q)
    const allActive = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    
    const match = allActive.find(p => p.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') === slug)
    return match || null
  } catch (error) {
    console.error("Critical failure looking up slug reference:", error)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// USER ADDRESS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const addNewUserAddress = async (addressData) => {
  const user = auth.currentUser
  if (!user) throw new Error('NOT_LOGGED_IN')
  
  const userRef = doc(db, 'users', user.uid)
  const uniqueAddressPayload = {
    id: `addr_${Date.now()}`,
    ...addressData,
    isVerified: true
  }

  await setDoc(userRef, { addresses: arrayUnion(uniqueAddressPayload) }, { merge: true })
}

export const removeUserAddressFromDb = async (addressId) => {
  const user = auth.currentUser
  if (!user) throw new Error('NOT_LOGGED_IN')
  
  const userRef = doc(db, 'users', user.uid)
  try {
    const snap = await getDoc(userRef)
    if (snap.exists()) {
      const currentAddresses = snap.data().addresses || []
      const filteredAddresses = currentAddresses.filter(a => a.id !== addressId)
      await updateDoc(userRef, { addresses: filteredAddresses })
    }
  } catch (error) {
    console.error("Address deletion run aborted:", error)
    throw error
  }
}

export const modifyUserAddressInDb = async (addressId, updatedFields) => {
  const user = auth.currentUser
  if (!user) throw new Error('NOT_LOGGED_IN')
  
  const userRef = doc(db, 'users', user.uid)
  try {
    const snap = await getDoc(userRef)
    if (snap.exists()) {
      const addresses = snap.data().addresses || []
      const idx = addresses.findIndex(a => a.id === addressId)
      if (idx !== -1) {
        addresses[idx] = { ...addresses[idx], ...updatedFields }
        await updateDoc(userRef, { addresses })
      }
    }
  } catch (error) {
    console.error("Address mutation run aborted:", error)
    throw error
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// 🚀 ORDER MANIFEST CREATION (UPDATED WITH COUPON INCREMENT)
// ─────────────────────────────────────────────────────────────────────────────

export const createCustomerOrderDocument = async (orderPayload) => {
  const user = auth.currentUser
  if (!user) throw new Error('NOT_LOGGED_IN')

  try {
    const orderRef = await addDoc(collection(db, 'orders'), {
      ...orderPayload,
      userId: user.uid,
      shippingStatus: 'pending',
      trackingId: 'PENDING_DISPATCH',
      createdAt: serverTimestamp()
    })
    
    // Clear out user's cart bucket array immediately upon successful purchase
    await setDoc(doc(db, 'carts', user.uid), { items: [] }, { merge: true })

    // ✨ NEW: If a coupon was used, increment its global usage count in the database
    if (orderPayload.couponCode) {
      try {
        const couponRef = doc(db, 'coupons', orderPayload.couponCode.toUpperCase())
        await updateDoc(couponRef, { usageCount: increment(1) })
      } catch (couponErr) {
        console.warn('Database Layer — Failed to increment coupon usage count:', couponErr)
      }
    }
    
    return orderRef.id
  } catch (error) {
    console.error("Database Layer — Failed executing order document creation block:", error)
    throw error
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN COMMUNICATION & CONFIG LOGS (UPDATED WITH USAGE LIMITS)
// ─────────────────────────────────────────────────────────────────────────────

export const fetchCoupons = async () => {
  try {
    const snap = await getDocs(collection(db, 'coupons'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (error) {
    console.error('Database Layer — Failed pulling coupons matrix:', error)
    return []
  }
}

export const saveCoupons = async (couponList) => {
  try {
    for (const coupon of couponList) {
      if (!coupon.code) continue
      const docRef = doc(db, 'coupons', coupon.code.toUpperCase())
      await setDoc(docRef, {
        code: coupon.code.toUpperCase(),
        discount: Number(coupon.discount) || 0,
        type: coupon.type || 'percent',
        minOrderAmount: Number(coupon.minOrderAmount) || 0,
        minItems: Number(coupon.minItems) || 0,
        expiresAt: coupon.expiresAt || null,
        maxUses: Number(coupon.maxUses) || 0, // ✨ NEW: Stores the maximum usage limit
        usageCount: Number(coupon.usageCount) || 0, // ✨ NEW: Tracks how many times it was used
        active: coupon.active ?? true,
        updatedAt: serverTimestamp()
      }, { merge: true })
    }
  } catch (error) {
    console.error('Database Layer — Coupon serialization runtime error:', error)
    throw error
  }
}


export const setCodStatus = async (statusActive) => {
  try {
    const configRef = doc(db, 'systemConfig', 'gateways')
    await setDoc(configRef, { isCodActive: !!statusActive }, { merge: true })
  } catch (error) {
    console.error('Database Layer — Gateway toggling runtime error:', error)
    throw error
  }
}

export const sendOrderMessage = async (orderId, textVal, roleType) => {
  if (!orderId || !textVal.trim()) return
  try {
    const orderRef = doc(db, 'orders', orderId)
    const orderSnap = await getDoc(orderRef)
    
    let existingMessages = []
    if (orderSnap.exists()) {
      existingMessages = orderSnap.data().messages || []
    }

    const newMessagePayload = {
      senderId: roleType === 'admin' ? 'admin_node' : (auth.currentUser?.uid || 'anonymous'),
      senderName: roleType === 'admin' ? 'Administration' : (auth.currentUser?.displayName || 'Buyer'),
      senderRole: roleType,
      text: textVal.trim(),
      sentAt: Date.now()
    }

    await updateDoc(orderRef, {
      messages: [...existingMessages, newMessagePayload]
    })
  } catch (error) {
    console.error('Database Layer — Chat transmission exception dropped:', error)
    throw error
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER SUPPORT CHAT SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

/** Send a message to a specific user's support thread */
export const sendSupportMessage = async (targetUserId, textVal, roleType) => {
  if (!textVal.trim() || !targetUserId) return
  try {
    const chatRef = doc(db, 'supportChats', targetUserId)
    const newMessage = {
      text: textVal.trim(),
      role: roleType, // 'admin' or 'user'
      timestamp: Date.now()
    }
    // setDoc with merge creates the doc if it doesn't exist, or updates it if it does
    await setDoc(chatRef, {
      userName: auth.currentUser?.displayName || 'Pahari User',
      lastUpdated: serverTimestamp(),
      messages: arrayUnion(newMessage)
    }, { merge: true })
  } catch (error) {
    console.error("Support Chat Error:", error)
    throw error
  }
}