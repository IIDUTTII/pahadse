/**
 * db.js  —  Single source of truth for ALL Firebase operations.
 * ─────────────────────────────────────────────────────────────────────────────
 * Rules:
 *   • Vue files NEVER import from firebase directly — only from here.
 *   • Every read is cached in memory to avoid repeat Firestore charges.
 *   • Cache is busted only when a write happens that affects the cached data.
 *   • logProductView is debounced per-product-per-session so a refresh
 *     doesn't double-count and waste a write.
 *
 * TO SWAP TO SUPABASE LATER:
 *   1. Replace firebase imports with your supabase client.
 *   2. Re-implement each function — keep names + return shapes identical.
 *   3. Zero changes needed in any Vue file.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { db, auth } from '../firebase.js'
import {
  collection, getDocs, getDoc, query, where,
  doc, setDoc, updateDoc, deleteDoc, addDoc,
  arrayUnion, increment, serverTimestamp,arrayUnion,} from 'firebase/firestore'

import { signOut, sendPasswordResetEmail } from 'firebase/auth'



// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY CACHE LAYER
// Saves Firebase reads (= money) for data that rarely changes mid-session.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Product[] | null} */
let _activeProductsCache = null

/** @type {Map<string, Product>} — keyed by productId */
const _productCache = new Map()

/** @type {Map<string, object>} — keyed by userId */
const _cartCache = new Map()

/** @type {Map<string, string>} — keyed by userId, value = role string */
const _userRoleCache = new Map()

/** Set of productIds viewed this session — prevents double-counting views */
const _viewedThisSession = new Set()

/** Wipe the active-products list cache (call after any product write) */
function _bustProductListCache() {
  _activeProductsCache = null
}







export const updateUserDisplayName = async (uid, newName) => {
  await updateDoc(
    doc(db, "users", uid),
    {
      displayName: newName
    }
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS — READ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all active products (Home page grid).
 * Result is cached for the session; subsequent calls return instantly.
 * @returns {Promise<Product[]>}
 */
export async function fetchActiveProducts() {
  if (_activeProductsCache !== null) {
    return _activeProductsCache
  }
  const snap = await getDocs(
    query(collection(db, 'products'), where('isActive', '==', true))
  )
  _activeProductsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  // Also populate per-product cache while we have the data — free bonus reads
  _activeProductsCache.forEach(p => _productCache.set(p.id, p))
  return _activeProductsCache
}

/**
 * Fetch ALL products (admin dashboard — includes inactive).
 * NOT cached because the dashboard needs live data via onSnapshot anyway.
 * @returns {Promise<Product[]>}
 */
export async function fetchAllProducts() {
  const snap = await getDocs(collection(db, 'products'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Fetch a single product by Firestore document ID.
 * Checks per-product cache first; only hits Firestore on a cold load.
 * @param {string} productId
 * @returns {Promise<Product | null>}
 */
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

/**
 * Add a brand-new product document to Firestore.
 * Busts the active-products cache so the home page re-fetches.
 * @param {object} payload  — matches the Himalayan product schema
 * @returns {Promise<string>}  — the new document ID
 */
export async function addProduct(payload) {
  const ref = await addDoc(collection(db, 'products'), {
    ...payload,
    createdAt: serverTimestamp(),
  })
  _bustProductListCache()
  return ref.id
}

/**
 * Update an existing product document.
 * Also updates the per-product cache immediately so reads stay consistent.
 * @param {string} productId
 * @param {object} payload  — partial update (only changed fields)
 * @returns {Promise<void>}
 */
export async function updateProduct(productId, payload) {
  await updateDoc(doc(db, 'products', productId), payload)
  // Merge into per-product cache
  if (_productCache.has(productId)) {
    _productCache.set(productId, { ..._productCache.get(productId), ...payload })
  }
  _bustProductListCache()
}

/**
 * Toggle the isActive (live/offline) flag for a product.
 * Used by the admin dashboard Live Status toggle.
 * @param {string}  productId
 * @param {boolean} currentValue  — pass the current value; we flip it
 * @returns {Promise<void>}
 */
export async function toggleProductActive(productId, currentValue) {
  const newValue = !currentValue
  await updateDoc(doc(db, 'products', productId), { isActive: newValue })
  if (_productCache.has(productId)) {
    _productCache.set(productId, { ..._productCache.get(productId), isActive: newValue })
  }
  _bustProductListCache()
}

/**
 * Permanently delete a product document.
 * @param {string} productId
 * @returns {Promise<void>}
 */
export async function deleteProduct(productId) {
  await deleteDoc(doc(db, 'products', productId))
  _productCache.delete(productId)
  _bustProductListCache()
}


// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log a product page view — debounced per session per product.
 * Fire-and-forget: do NOT await this in the caller.
 * @param {string} productId
 */
export async function logProductView(productId) {
  // If already logged this product this session, skip the write entirely
  if (_viewedThisSession.has(productId)) return
  _viewedThisSession.add(productId)

  try {
    await updateDoc(doc(db, 'products', productId), {
      viewCount: increment(1),
    })
    const userId = auth.currentUser?.uid ?? 'anonymous'
    await setDoc(doc(collection(db, 'productViews')), {
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

/**
 * Fetch the current user's cart document once.
 * Returns a cached copy on repeat calls within the same session.
 * The live onSnapshot in cartview.vue keeps the UI in sync — this is
 * only for cheap "is item in cart?" checks from home/detail pages.
 *
 * @returns {Promise<CartItem[]>}
 */
export async function fetchCart() {
  const user = auth.currentUser
  if (!user) return []

  if (_cartCache.has(user.uid)) {
    return _cartCache.get(user.uid).items ?? []
  }

  const snap = await getDoc(doc(db, 'carts', user.uid))
  const data = snap.exists() ? snap.data() : { items: [] }
  _cartCache.set(user.uid, data)
  return data.items ?? []
}

/**
 * Invalidate the in-memory cart cache for the current user.
 * Call this after any cart write so the next fetchCart() re-reads Firestore.
 */
export function bustCartCache() {
  const user = auth.currentUser
  if (user) _cartCache.delete(user.uid)
}

/**
 * Check if a specific productId is already in the user's cart.
 * Uses the cache — no extra Firestore read if cart was already fetched.
 * @param {string} productId
 * @returns {Promise<boolean>}
 */
export async function isProductInCart(productId) {
  const items = await fetchCart()
  return items.some(i => i.productId === productId)
}

/**
 * Add a product to the current user's cart.
 * Throws 'NOT_LOGGED_IN' if the user is not authenticated.
 * @param {Product} product
 * @param {number}  finalPrice  — discounted or regular price
 * @returns {Promise<void>}
 */
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

/**
 * Replace the entire items array in the user's cart.
 * Used by cartview for quantity changes and removals.
 * @param {CartItem[]} updatedItems
 * @returns {Promise<void>}
 */
export async function saveCartItems(updatedItems) {
  const user = auth.currentUser
  if (!user) return
  const cartRef = doc(db, 'carts', user.uid)
  await setDoc(cartRef, { items: updatedItems }, { merge: true })
  bustCartCache()
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


// ─────────────────────────────────────────────────────────────────────────────
// USERS / AUTH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the current user's role from Firestore.
 * Result is cached so only one read happens per session.
 * @returns {Promise<'superadmin' | 'admin' | 'user'>}
 */
export async function fetchUserRole() {
  const user = auth.currentUser
  if (!user) return 'user'

  if (_userRoleCache.has(user.uid)) {
    return _userRoleCache.get(user.uid)
  }

  try {
    const snap = await getDoc(doc(db, 'users', user.uid))
    const role = snap.exists()
      ? (snap.data().role ?? 'user').trim().toLowerCase()
      : 'user'
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
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error("Critical failure during users mapping sync processing:", error)
    throw error
  }
}



/** @returns {import('firebase/auth').User | null} */
export function getCurrentUser() {
  return auth.currentUser
}

/**
 * Sign the current user out and clear all session caches.
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  _activeProductsCache = null
  _productCache.clear()
  _cartCache.clear()
  _userRoleCache.clear()
  _viewedThisSession.clear()
  await signOut(auth)
}


// ─────────────────────────────────────────────────────────────────────────────
// product reviews — READ & WRITE
// ─────────────────────────────────────────────────────────────────────────────



/**
 * Fetches all matching review snapshots for a specific product item
 * @param {string} productId 
 * @returns {Promise<Array>} List of review data blueprints
 */
export const fetchProductReviews = async (productId) => {
  if (!productId) return []
  try {
    const q = query(collection(db, 'reviews'), where('productId', '==', productId))
    const snap = await getDocs(q)
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error("Error pulling product reviews matrix:", error)
    return []
  }
}

/**
 * Submits a new customer review snapshot to Firestore
 * @param {string} productId 
 * @param {number} rating 
 * @param {string} comment 
 */
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
// USER DOCUMENT CREATION
// Called from userAuth.js after a new user registers or logs in with Google.
// Creates/updates a Firestore document for the user with their basic info.
// This is separate from the auth state and allows us to store additional
// profile info (like role) and query users by email if needed.
// ─────────────────────────────────────────────────────────────────────────────

export const createUserDocument = async (userData) => {

  await setDoc(
    doc(db, 'users', userData.uid),
    {
      ...userData,
      createdAt: new Date()
    },
    { merge: true }
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD RESET
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dispatches a single-use cryptographic password reset token link to a user's email address.
 * @param {string} clientEmail - The target email address provided by the user.
 * @returns {Promise<void>} Resolves when the email has been successfully transmitted.
 */
export const dispatchPasswordResetToken = async (clientEmail) => {
  if (!clientEmail || !clientEmail.trim()) {
    throw new Error('EMAIL_REQUIRED')
  }
  try {
    // Core database layer handshake execution node
    await sendPasswordResetEmail(auth, clientEmail.trim())
  } catch (error) {
    console.error('Database Layer — Reset Link Transmission Failure:', error.code)
    throw error
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// SEMANTIC URL SLUG RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────



/**
 * Resolves a semantic URL name slug back to its live Firestore product document.
 * @param {string} slug - The lowercase text string from the URL router parameters.
 * @returns {Promise<object|null>} Matches data payload or returns null.
 */
export const fetchProductBySlug = async (slug) => {
  if (!slug) return null
  try {
    // 1. Check our active local memory caches first to save read costs
    if (_activeProductsCache) {
      const match = _activeProductsCache.find(p => p.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') === slug)
      if (match) return match
    }
    
    // 2. Fallback to cold database query execution track if cache missed
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



import { arrayUnion } from 'firebase/firestore' // Ensure arrayUnion is in your firestore imports at the top

/**
 * Appends a new delivery address structure to the authenticated user's account array block.
 * @param {object} addressData - Validated address input containing label, phone, street, pincode.
 */
export const addNewUserAddress = async (addressData) => {
  const user = auth.currentUser
  if (!user) throw new Error('NOT_LOGGED_IN')
  
  const userRef = doc(db, 'users', user.uid)
  const uniqueAddressPayload = {
    id: `addr_${Date.now()}`,
    ...addressData,
    isVerified: true
  }

  // Atomically pushes map item into the users directory array structure
  await setDoc(userRef, {
    addresses: arrayUnion(uniqueAddressPayload)
  }, { merge: true })
}

/**
 * Commits a brand-new finalized product order batch manifest down to Firestore.
 * @param {object} orderPayload - The complete order details including items, address, and amount.
 * @returns {Promise<string>} The newly generated Firestore Document tracking ID string.
 */
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
    
    // Clear out user's cart bucket array immediately upon successful purchase path handoff
    await setDoc(doc(db, 'carts', user.uid), { items: [] }, { merge: true })
    
    return orderRef.id
  } catch (error) {
    console.error("Failed executing order transaction registry block:", error)
    throw error
  }
}