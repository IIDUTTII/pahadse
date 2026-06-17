/**
 * db.js  —  Single source of truth for ALL Firebase operations.
 * ─────────────────────────────────────────────────────────────────────────────
 * Rules:
 * • Vue files NEVER import from firebase directly — only from here.
 * • Every read is cached in memory to avoid repeat Firestore charges.
 * • Cache is busted only when a write happens that affects the cached data.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { db, auth } from '../firebase.js'
import {
  collection, getDocs, getDoc, query, where, onSnapshot,
  doc, setDoc, updateDoc, deleteDoc, addDoc, increment, serverTimestamp, arrayUnion,
  limit, orderBy
} from 'firebase/firestore'
import { signOut, sendPasswordResetEmail } from 'firebase/auth'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject,listAll } from 'firebase/storage'
import imageCompression from 'browser-image-compression'
import { storage } from '../firebase.js'

// In-Memory Cache Layer
let _activeProductsCache = null
const _productCache = new Map()
const _cartCache = new Map()
const _userRoleCache = new Map()
const _viewedThisSession = new Set()

function _bustProductListCache() {
  _activeProductsCache = null
}


export function subscribeToAuditLogsPaginated(limitCount, cb) {
  const q = query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc'), limit(limitCount));
  return onSnapshot(q, cb);
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
// 🖼️ IMAGE PROCESSING, UPLOAD & STORAGE ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export const uploadProductImage = async (file, folderId) => {
  const options = {
    maxSizeMB: 0.3, // 300kb max for high-speed e-commerce
    maxWidthOrHeight: 1200,
    useWebWorker: true
  }
  const compressedFile = await imageCompression(file, options)
  const fileExt = file.name.split('.').pop()
  const filePath = `products/${folderId}/${Date.now()}_${Math.floor(Math.random()*1000)}.${fileExt}`
  
  const imageRef = storageRef(storage, filePath)
  await uploadBytes(imageRef, compressedFile)
  return await getDownloadURL(imageRef)
}

// 1. Get all images from a product's storage folder
export async function fetchAllProductImages(productId) {
  if (!productId) return []
  try {
    const folderRef = storageRef(storage, `products/${productId}`)
    const result = await listAll(folderRef)
    
    // Get download URLs for all files in the folder
    const urls = await Promise.all(
      result.items.map(async (itemRef) => {
        return await getDownloadURL(itemRef)
      })
    )
    return urls
  } catch (e) {
    if (e.code === 'storage/object-not-found' || e.code === 'storage/project-not-found') {
      return []
    }
    throw e
  }
}

// 2. Delete image from Storage (already provided, ensure it's exported)
export const deleteProductImage = async (fileUrl) => {
  if (!fileUrl || !fileUrl.includes('firebasestorage.googleapis.com')) return
  try {
    const fileRef = storageRef(storage, fileUrl)
    await deleteObject(fileRef)
  } catch (e) {
    throw e
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 👤 AUTHENTICATION & USER MANAGEMENT
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
    const actorRole = await fetchUserRole()

    if (newRole === 'superadmin' && actorRole !== 'superadmin') {
      throw new Error('ONLY_SUPERADMIN_CAN_ASSIGN_SUPERADMIN')
    }

    const userRef = doc(db, 'users', userId)
    const oldSnap = await getDoc(userRef)
    const oldData = oldSnap.exists() ? oldSnap.data() : null

    await updateDoc(userRef, { role: newRole })

    await createAuditLog('ROLE_CHANGE', 'user', userId, oldData, { role: newRole })
  } catch (error) {
    console.error("Role elevation transaction aborted:", error)
    throw error
  }
}

export const updateUserDisplayName = async (uid, newName) => {
  await updateDoc(doc(db, "users", uid), { displayName: newName })
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
// 📦 PRODUCTS INVENTORY & PAGINATION
// ─────────────────────────────────────────────────────────────────────────────

export function subscribeToProducts(cb) {
  return onSnapshot(collection(db, 'products'), cb)
}

export function subscribeToProductsPaginated(limitCount, cb) {
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(limitCount))
  return onSnapshot(q, cb)
}

export async function fetchActiveProducts() {
  const q = query(collection(db, 'products'), where('isActive', '==', true))
  const snap = await getDocs(q)
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  
  // ✨ Sort by Admin Priority Order (1 comes first, if no priority, goes to bottom)
  products.sort((a, b) => {
    const orderA = a.priorityOrder || 9999
    const orderB = b.priorityOrder || 9999
    return orderA - orderB
  })
  
  return products
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

export async function addProduct(payload) {
  const ref = await addDoc(collection(db, 'products'), {
    ...payload,
    createdAt: serverTimestamp(),
  })

  await createAuditLog('CREATE_PRODUCT', 'product', ref.id, null, payload)

  _bustProductListCache()
  return ref.id
}

export async function updateProduct(productId, payload) {
  const oldSnap = await getDoc(doc(db, 'products', productId))
  const oldData = oldSnap.exists() ? oldSnap.data() : null

  await updateDoc(doc(db, 'products', productId), payload)

  await createAuditLog('UPDATE_PRODUCT', 'product', productId, oldData, payload)

  if (_productCache.has(productId)) {
    _productCache.set(productId, { ..._productCache.get(productId), ...payload })
  }
  _bustProductListCache()
}

export async function toggleProductActive(productId, currentValue) {
  const newValue = !currentValue
  const oldSnap = await getDoc(doc(db, 'products', productId))
  const oldData = oldSnap.exists() ? oldSnap.data() : null

  await updateDoc(doc(db, 'products', productId), { isActive: newValue })

  await createAuditLog('TOGGLE_PRODUCT_ACTIVE', 'product', productId, oldData, { isActive: newValue })

  if (_productCache.has(productId)) {
    _productCache.set(productId, { ..._productCache.get(productId), isActive: newValue })
  }
  _bustProductListCache()
}

export async function deleteProduct(productId) {
  const oldSnap = await getDoc(doc(db, 'products', productId))
  const oldData = oldSnap.exists() ? oldSnap.data() : null

  await deleteDoc(doc(db, 'products', productId))

  await createAuditLog('DELETE_PRODUCT', 'product', productId, oldData, null)

  _productCache.delete(productId)
  _bustProductListCache()
}

// ─────────────────────────────────────────────────────────────────────────────
// 🛒 CART & CHECKOUT SYSTEMS
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// 🛒 CART & CHECKOUT SYSTEMS
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

// ✨ STRICT CHECK: Matches exactly Product ID + Variant
export async function isVariantInCart(productId, variantLabel) {
  const items = await fetchCart()
  const checkLabel = variantLabel || 'Standard'
  return items.some(i => {
     const existingVar = i.variant || i.weight || 'Standard';
     return i.productId === productId && existingVar === checkLabel;
  })
}

// ✨ FIX: Never merges different variants. Each gets a unique row.
export async function addProductToCart(product, finalPrice, selectedVariant = null, quantity = 1) {
  const user = auth.currentUser
  if (!user) throw new Error('NOT_LOGGED_IN')

  const slug = product.name ? product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : 'product'
  const primaryImg = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : null
  
  const variantLabel = selectedVariant ? selectedVariant.label : (product.weight || 'Standard')
  // Creates a strictly unique ID for the cart row
  const cartItemId = `${product.id}_${variantLabel.replace(/[^a-zA-Z0-9]/g, '')}`

  const cartRef = doc(db, 'carts', user.uid)
  const snap = await getDoc(cartRef)
  const data = snap.exists() ? snap.data() : { items: [] }
  const items = data.items || []

  // Check if EXACT variant is already in cart
  const existingIdx = items.findIndex(i => {
     const existingVar = i.variant || i.weight || 'Standard';
     return i.productId === product.id && existingVar === variantLabel;
  })

  if (existingIdx > -1) {
     // If same variant exists, just increase quantity
     items[existingIdx].quantity += quantity
     await setDoc(cartRef, { items }, { merge: true })
  } else {
     // If it's a NEW variant, create a totally separate row!
     items.push({
       cartItemId: cartItemId,
       productId : product.id,
       name      : product.name,
       variant   : variantLabel,
       price     : Number(finalPrice),
       emoji     : product.emoji || '📦',
       imageUrl  : primaryImg,
       slug      : slug,
       quantity  : quantity,
     })
     await setDoc(cartRef, { items }, { merge: true })
  }

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
// ⭐ PRODUCT REVIEWS (UPDATED LOGIC)
// ─────────────────────────────────────────────────────────────────────────────

export const canUserReviewProduct = async (productId) => {
  const user = auth.currentUser;
  if (!user) return false;
  
  try {
    // Check all orders of this user that are marked as 'delivered'
    const q = query(
      collection(db, 'orders'), 
      where('userId', '==', user.uid), 
      where('shippingStatus', '==', 'delivered')
    );
    const snap = await getDocs(q);
    
    // Check if the specific productId exists in any of those delivered orders
    for (const d of snap.docs) {
      const order = d.data();
      if (order.items && order.items.some(item => item.productId === productId)) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Verification error:", error);
    return false;
  }
}



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
// 🛒 ORDERS FULFILLMENT & TRACKING
// ─────────────────────────────────────────────────────────────────────────────

export function subscribeToOrders(cb) {
  return onSnapshot(collection(db, 'orders'), cb)
}

export function subscribeToOrdersPaginated(limitCount, cb) {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(limitCount))
  return onSnapshot(q, cb)
}

export async function fetchOrderById(orderId) {
  const snap = await getDoc(doc(db, 'orders', orderId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function updateOrderStatus(orderId, updates = {}) {
  if (!orderId) throw new Error('ORDER_ID_REQUIRED')
  await updateDoc(doc(db, 'orders', orderId), updates)
}

export async function confirmOrderInDb(orderId) {
  const ref = doc(db, 'orders', orderId)
  const oldSnap = await getDoc(ref)
  const oldData = oldSnap.exists() ? oldSnap.data() : null
  await updateDoc(ref, { shippingStatus: 'confirmed' })

  await createAuditLog('CONFIRM_ORDER', 'order', orderId, oldData, { shippingStatus: 'confirmed' })
}

export async function rejectOrderInDb(orderId, adminComment) {
  const ref = doc(db, 'orders', orderId)
  const oldSnap = await getDoc(ref)
  const oldData = oldSnap.exists() ? oldSnap.data() : null
  const newData = { shippingStatus: 'rejected', adminComment: adminComment.trim() }
  await updateDoc(ref, newData)

  await createAuditLog('REJECT_ORDER', 'order', orderId, oldData, newData)
}

export async function shipOrderInDb(orderId, trackingId) {
  const ref = doc(db, 'orders', orderId)
  const oldSnap = await getDoc(ref)
  const oldData = oldSnap.exists() ? oldSnap.data() : null
  const newData = { shippingStatus: 'shipped', trackingId: trackingId.trim() }
  await updateDoc(ref, newData)

  await createAuditLog('SHIP_ORDER', 'order', orderId, oldData, newData)
}

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

    await createAuditLog('CREATE_ORDER', 'order', orderRef.id, null, orderPayload)

    await setDoc(doc(db, 'carts', user.uid), { items: [] }, { merge: true })

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
// 💬 CUSTOMER SUPPORT & CONTACT INQUIRIES
// ─────────────────────────────────────────────────────────────────────────────

export function subscribeToSupportChats(cb) {
  return onSnapshot(collection(db, 'supportChats'), cb)
}

export async function sendAdminSupportReply(targetUserId, textVal) {
  return sendSupportMessage(targetUserId, textVal, 'admin')
}

export const sendOrderMessage = async (orderId, textVal, roleType) => {
  if (!orderId || !textVal.trim()) return
  try {
    const orderRef = doc(db, 'orders', orderId)
    const orderSnap = await getDoc(orderRef)
    
    let existingMessages = []
    if (orderSnap.exists()) existingMessages = orderSnap.data().messages || []

    const newMessagePayload = {
      senderId: roleType === 'admin' ? 'admin_node' : (auth.currentUser?.uid || 'anonymous'),
      senderName: roleType === 'admin' ? 'Administration' : (auth.currentUser?.displayName || 'Buyer'),
      senderRole: roleType,
      text: textVal.trim(),
      sentAt: Date.now()
    }

    await updateDoc(orderRef, { messages: [...existingMessages, newMessagePayload] })
  } catch (error) {
    console.error('Database Layer — Chat transmission exception dropped:', error)
    throw error
  }
}

export const sendSupportMessage = async (targetUserId, textVal, roleType) => {
  if (!textVal.trim() || !targetUserId) return
  try {
    const chatRef = doc(db, 'supportChats', targetUserId)
    const newMessage = { text: textVal.trim(), role: roleType, timestamp: Date.now() }
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

export async function createContactQuery(payload) {
  const ref = await addDoc(collection(db, 'contact_queries'), {
    ...payload,
    status: 'pending',
    createdAt: serverTimestamp(),
  })

  await createAuditLog('CREATE_CONTACT_QUERY', 'contact_query', ref.id, null, payload)
  return ref.id
}

export async function fetchContactQueries() {
  try {
    const snap = await getDocs(collection(db, 'contact_queries'))
    const rows = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    rows.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    return rows
  } catch (error) {
    console.error('fetchContactQueries failed:', error)
    return []
  }
}

export async function updateContactQueryStatus(queryId, status) {
  const ref = doc(db, 'contact_queries', queryId)
  const oldSnap = await getDoc(ref)
  const oldData = oldSnap.exists() ? oldSnap.data() : null
  await updateDoc(ref, { status })

  await createAuditLog('UPDATE_CONTACT_QUERY_STATUS', 'contact_query', queryId, oldData, { status })
}

export async function deleteContactQuery(queryId) {
  const ref = doc(db, 'contact_queries', queryId)
  const oldSnap = await getDoc(ref)
  const oldData = oldSnap.exists() ? oldSnap.data() : null
  await deleteDoc(ref)

  await createAuditLog('DELETE_CONTACT_QUERY', 'contact_query', queryId, oldData, null)
}

// ─────────────────────────────────────────────────────────────────────────────
// ⭐ PRODUCT REVIEWS
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

// Add this under addProductReview in db.js
export const deleteProductReview = async (reviewId) => {
  try {
    await deleteDoc(doc(db, 'reviews', reviewId))
  } catch (error) {
    console.error("Error deleting review:", error)
    throw error
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ⚙️ SYSTEM CONFIGURATION, SHIPPING & LOGISTICS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchGatewayConfig() {
  const snap = await getDoc(doc(db, 'systemConfig', 'gateways'))
  return snap.exists() ? snap.data() : { isCodActive: true }
}

export const setCodStatus = async (statusActive) => {
  try {
    const configRef = doc(db, 'systemConfig', 'gateways')
    const oldSnap = await getDoc(configRef)
    const oldData = oldSnap.exists() ? oldSnap.data() : null
    const newData = { isCodActive: !!statusActive }

    await setDoc(configRef, newData, { merge: true })

    await createAuditLog('TOGGLE_COD', 'system_config', 'gateways', oldData, newData)
  } catch (error) {
    console.error('Database Layer — Gateway toggling runtime error:', error)
    throw error
  }
}

export async function fetchShippingConfig() {
  try {
    const snap = await getDoc(doc(db, 'systemConfig', 'shipping'))
    return snap.exists() ? snap.data() : { fee: 60, freeThreshold: 499, isFreeShippingActive: true }
  } catch (e) {
    console.warn("Failed to fetch shipping config:", e.message)
    return { fee: 60, freeThreshold: 499, isFreeShippingActive: true }
  }
}

export async function updateShippingConfig(configPayload) {
  try {
    const ref = doc(db, 'systemConfig', 'shipping')
    const oldSnap = await getDoc(ref)
    const oldData = oldSnap.exists() ? oldSnap.data() : null

    await setDoc(ref, configPayload, { merge: true })

    await createAuditLog('UPDATE_SHIPPING_CONFIG', 'systemConfig', 'shipping', oldData, configPayload)
  } catch (e) {
    console.error("Shipping config update failed:", e.message)
    throw e
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🎟️ COUPONS MANAGEMENT
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
      const code = coupon.code.toUpperCase()
      const docRef = doc(db, 'coupons', code)
      const oldSnap = await getDoc(docRef)
      const oldData = oldSnap.exists() ? oldSnap.data() : null

      const payload = {
        code,
        discount: Number(coupon.discount) || 0,
        type: coupon.type || 'percent',
        minOrderAmount: Number(coupon.minOrderAmount) || 0,
        minItems: Number(coupon.minItems) || 0,
        expiresAt: coupon.expiresAt || null,
        maxUses: Number(coupon.maxUses) || 0,
        usageCount: Number(coupon.usageCount) || 0,
        active: coupon.active ?? true,
        updatedAt: serverTimestamp()
      }

      await setDoc(docRef, payload, { merge: true })

      await createAuditLog(oldData ? 'UPDATE_COUPON' : 'CREATE_COUPON', 'coupon', code, oldData, payload)
    }
  } catch (error) {
    console.error('Database Layer — Coupon serialization runtime error:', error)
    throw error
  }
}

export const deleteCouponFromDb = async (couponCode) => {
  if (!couponCode) return
  try {
    const code = couponCode.toUpperCase()
    const docRef = doc(db, 'coupons', code)
    const oldSnap = await getDoc(docRef)
    const oldData = oldSnap.exists() ? oldSnap.data() : null

    await deleteDoc(docRef)

    await createAuditLog('DELETE_COUPON', 'coupon', code, oldData, null)
  } catch (error) {
    console.error('Database Layer — Failed to delete coupon document:', error)
    throw error
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 📜 AUDIT LOGGING
// ─────────────────────────────────────────────────────────────────────────────

export async function createAuditLog(action, entityType, entityId, oldData = null, newData = null) {
  try {
    const currentUser = auth.currentUser
    let role = 'unknown'

    if (currentUser) {
      const snap = await getDoc(doc(db, 'users', currentUser.uid))
      role = snap.exists() ? (snap.data().role || 'user') : 'user'
    }

    await addDoc(collection(db, 'audit_logs'), {
      action, entityType, entityId, oldData, newData,
      performedByUid: currentUser?.uid || null,
      performedByEmail: currentUser?.email || null,
      performedByRole: role,
      createdAt: serverTimestamp(),
    })
  } catch (e) {
    console.error('createAuditLog failed:', e)
  }
}

export async function fetchAuditLogs() {
  try {
    const snap = await getDocs(collection(db, 'audit_logs'))
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    rows.sort((a, b) => {
      const at = a.createdAt?.seconds || a.createdAt?.toMillis?.() || 0
      const bt = b.createdAt?.seconds || b.createdAt?.toMillis?.() || 0
      return bt - at
    })
    return rows
  } catch (e) {
    console.error('fetchAuditLogs failed:', e)
    return []
  }
}

// Legacy passthrough event log (Deprecated but kept for backwards compatibility)
export async function logAudit(action, details = {}) {
  const user = auth.currentUser
  await addDoc(collection(db, 'audit_logs'), {
    action, details,
    performedByUid: user?.uid || null,
    performedByEmail: user?.email || null,
    createdAt: serverTimestamp()
  })
}