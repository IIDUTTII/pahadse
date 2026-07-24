// functions/lib/orderCalculator.js

/**
 * Calculate order totals from items and coupon
 * SINGLE source of truth for ALL price calculations
 * Used by: calculate-order.js, create-order.js
 */
export async function calculateOrder(items, userId, idToken, env, couponCode = null) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Items array is required and cannot be empty');
  }

  let subtotal = 0;
  const orderItems = [];
  const stockUpdates = [];

  for (const item of items) {
    if (!item.productId || typeof item.quantity !== 'number' || item.quantity < 1) {
      throw new Error('Each item must have a productId and quantity >= 1');
    }

    const projectId = env?.FIREBASE_PROJECT_ID || 'pahadse-13309';
    // Fetch product from Firestore REST API
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products/${item.productId}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${idToken}` }
    });

    if (!res.ok) {
      if (res.status === 404) throw new Error(`Product "${item.productId}" not found`);
      throw new Error(`Failed to fetch product ${item.productId}: HTTP ${res.status}`);
    }

    const doc = await res.json();
    const fields = doc.fields || {};
    const productName = fields.name?.stringValue || 'Unknown Product';

    // 1. Check product-level active flag (default true if missing)
    const isProductActive = fields.active?.booleanValue !== false;
    if (!isProductActive) {
      throw new Error(`Product "${productName}" is currently unavailable`);
    }

   const variants = fields.variants?.arrayValue?.values || [];
    let price = 0;
    let stock = 0;
    let variantLabel = item.variant || 'Standard';
    let variantId = item.variantId || null;

    if (variants.length === 0) {
      throw new Error(`Product "${productName}" has no variants defined. Please define at least one variant.`);
    }

    // Match both newer variantId-backed rows and legacy label-only variants.
    let variant = null;
    const requestedVariantLabel = item.variant || item.weight || null;

    if (requestedVariantLabel) {
      variant = variants.find(v => v.mapValue?.fields?.label?.stringValue === requestedVariantLabel);
    }

    if (!variant && variantId) {
      variant = variants.find(v => v.mapValue?.fields?.variantId?.stringValue === variantId);
    }

    if (!variant && variantId) {
      variant = variants.find(v => v.mapValue?.fields?.label?.stringValue === variantId);
    }

    if (!variant) {
      throw new Error(
        `Variant "${requestedVariantLabel || variantId}" not found for product "${productName}"`
      );
    }

    const vFields = variant.mapValue.fields;

    // Check variant is active (default true if missing)
    const isVariantActive = vFields.active?.booleanValue !== false;
    if (!isVariantActive) {
      throw new Error(`Variant "${vFields.label?.stringValue || requestedVariantLabel}" for product "${productName}" is currently unavailable`);
    }

    price = Number(vFields.price?.integerValue ?? vFields.price?.doubleValue ?? 0);
    stock = Number(vFields.stock?.integerValue ?? vFields.stock?.doubleValue ?? 0);
    variantLabel = vFields.label?.stringValue || item.variant || 'Standard';
    variantId = vFields.variantId?.stringValue || variantLabel;

    if (stock < item.quantity) {
      throw new Error(
        `Insufficient stock for ${productName} (${variantLabel}). Available: ${stock}, Requested: ${item.quantity}`
      );
    }

    const itemTotal = price * item.quantity;
    subtotal += itemTotal;

    orderItems.push({
      productId: item.productId,
      name: productName,
      variant: variantLabel,
      variantId: variantId,
      price,
      quantity: item.quantity,
      subtotal: itemTotal,
      imageUrl: fields.imageUrls?.arrayValue?.values?.[0]?.stringValue || null,
      isReturnable: fields.isReturnable?.booleanValue !== false,
    });

    stockUpdates.push({
      productId: item.productId,
      variantId: variantId,
      variantLabel: variantLabel,
      quantity: item.quantity,
      currentStock: stock
    });
  }

  // 3. Fetch shipping config from Firestore
  let shippingCost = 0;
  try {
    const projectId = env?.FIREBASE_PROJECT_ID || 'pahadse-13309';
    const shipUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/systemConfig/shipping`;
    const shipRes = await fetch(shipUrl, { headers: { 'Authorization': `Bearer ${idToken}` } });
    if (shipRes.ok) {
      const shipDoc = await shipRes.json();
      const s = shipDoc.fields || {};
      const fee = Number(s.fee?.integerValue ?? s.fee?.doubleValue ?? 60);
      const freeThreshold = Number(s.freeThreshold?.integerValue ?? s.freeThreshold?.doubleValue ?? 499);
      const isFreeShippingActive = s.isFreeShippingActive?.booleanValue !== false;

      if (!isFreeShippingActive || subtotal < freeThreshold) {
        shippingCost = fee;
      }
    }
  } catch (e) {
    shippingCost = 60; // safe fallback
  }

  // 4. Coupon validation (TODO: expand based on your coupon schema)
  let discount = 0;
  if (couponCode) {
    // Example: fetch coupon from Firestore and validate
    // const coupon = await fetchCoupon(couponCode, idToken, env);
    // if (!coupon || !coupon.isActive || coupon.expiresAt < Date.now()) throw new Error('Invalid coupon');
    // discount = Math.min(coupon.value || 0, subtotal);
    discount = 0; // placeholder until you implement coupon rules
  }

  const total = subtotal - discount + shippingCost;
  if (total < 0) throw new Error('Order total cannot be negative');

  return {
    items: orderItems,
    subtotal,
    discount,
    shipping: shippingCost,
    total,
    couponApplied: couponCode || null,
    stockUpdates,
  };
}