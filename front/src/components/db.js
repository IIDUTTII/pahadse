/**
 * productService.js
 * ─────────────────────────────────────────────────────────────────
 * ALL database calls for products & cart live here.
 * Home.vue (and any other component) just imports these functions.
 *
 * HOW TO SWAP TO SUPABASE LATER:
 *   1. Replace the firebase imports below with your supabase client.
 *   2. Re-implement each function using supabase syntax.
 *   3. Keep function names & return shapes identical → zero changes in Vue files.
 * ─────────────────────────────────────────────────────────────────
 */

import { db, auth }                          from '../firebase.js'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { doc, setDoc, arrayUnion }           from 'firebase/firestore'


// ── TYPES (JSDoc for IDE autocomplete) ────────────────────────────
/**
 * @typedef {Object} Product
 * @property {string}  id
 * @property {string}  name
 * @property {string}  description
 * @property {number}  price
 * @property {string}  [emoji]
 * @property {string}  [weight]
 * @property {string}  [category]
 * @property {number}  [stock]
 * @property {number}  [reviewCount]
 * @property {number}  [ratingAverage]
 * @property {{ isDiscounted: boolean, percent: number }} [discount]
 */

/**
 * @typedef {Object} CartItem
 * @property {string} productId
 * @property {string} name
 * @property {number} price
 * @property {string} emoji
 * @property {number} quantity
 */


// ── PRODUCTS ──────────────────────────────────────────────────────

/**
 * Fetch all active products from the database.
 * @returns {Promise<Product[]>}
 */
export async function fetchActiveProducts() {
  const snap = await getDocs(
    query(collection(db, 'products'), where('isActive', '==', true))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}


// ── CART ──────────────────────────────────────────────────────────

/**
 * Add a single product to the current user's cart.
 * Throws if the user is not logged in.
 *
 * @param {Product} product
 * @param {number}  finalPrice   - already-discounted price to store
 * @returns {Promise<void>}
 */
export async function addProductToCart(product, finalPrice) {
  const user = auth.currentUser
  if (!user) throw new Error('NOT_LOGGED_IN')

  const cartRef = doc(db, 'carts', user.uid)

  /** @type {CartItem} */
  const item = {
    productId : product.id,
    name      : product.name,
    price     : Number(finalPrice),
    emoji     : product.emoji || '📦',
    quantity  : 1,
  }

  await setDoc(cartRef, { items: arrayUnion(item) }, { merge: true })
}


// ── AUTH HELPERS (thin wrappers so Vue files don't touch firebase) ─

/**
 * Returns the currently signed-in Firebase user, or null.
 * @returns {import('firebase/auth').User | null}
 */
export function getCurrentUser() {
  return auth.currentUser
}