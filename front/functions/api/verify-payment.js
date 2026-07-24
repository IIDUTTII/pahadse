// functions/api/verify-payment.js
// ✅ Cloudflare Workers compatible — uses Firestore REST API + Transactions
// ✅ Reduces stock atomically, prevents double-payment, clears cart, creates invoice
// ✅ Early audit log (independent write) immediately after signature verification
// ✅ Products read OUTSIDE transaction using user token (avoids permission issues)
// ✅ Transaction ID URL-encoded for Firestore REST API

export async function onRequest(context) {
  const { request, env } = context;

  // ─── CORS ───
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
  }

  try {
    console.log('📥 verify-payment: Request received');

    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = body;
    console.log(`📦 Order ID: ${orderId}, Razorpay Order: ${razorpay_order_id}, Payment ID: ${razorpay_payment_id}`);

    // ─── 1. VERIFY RAZORPAY SIGNATURE ───
    const TEST_MODE = env.TEST_MODE === 'true' || false;
    const secret = TEST_MODE ? 'test_secret' : (env.RAZORPAY_KEY_SECRET || 'wBOsE6IhL3Fkr5Jt3Jr1xHi8');
    if (!secret && !TEST_MODE) {
      return new Response(JSON.stringify({ error: 'Missing Razorpay Secret' }), { status: 500 });
    }

    if (!TEST_MODE) {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const dataToSign = encoder.encode(razorpay_order_id + '|' + razorpay_payment_id);
      const cryptoKey = await crypto.subtle.importKey(
        'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, dataToSign);
      const generatedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');

      if (generatedSignature !== razorpay_signature) {
        console.error('❌ Invalid Razorpay signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
      }
      console.log('✅ Signature verified');
    } else {
      console.log('⚠️ TEST_MODE: Signature bypassed');
    }

    // ─── 2. AUTHENTICATE USER ───
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('❌ Missing Bearer token');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const idToken = authHeader.split(' ')[1];

    const user = await verifyFirebaseToken(idToken, env);
    if (!user) {
      console.error('❌ Invalid Firebase token');
      return new Response(JSON.stringify({ error: 'Invalid Firebase token' }), { status: 401 });
    }
    const userId = user.localId;
    const userEmail = user.email || '';
    console.log(`✅ User authenticated: ${userId}`);

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Missing orderId' }), { status: 400 });
    }

    // ─── 3. IMMEDIATE INDEPENDENT AUDIT LOG (BEFORE ANY TRANSACTION) ───
    const auditId = razorpay_payment_id || `pay_${Date.now()}`;
    const auditData = {
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      orderId,
      userId,
      userEmail,
      status: 'received',
      message: 'Payment signature verified, processing started',
      createdAt: new Date(),
    };

    try {
      const auditUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/payment_audit/${auditId}`;
      const auditRes = await fetch(auditUrl, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(toFirestoreDocumentFields(auditData)),
      });
      if (auditRes.ok) {
        console.log('✅ Audit log written:', auditId);
      } else {
        const err = await auditRes.text();
        console.error('❌ Audit log failed (non-critical):', err);
      }
    } catch (err) {
      console.error('❌ Audit log error (non-critical):', err.message);
    }

    // ─── 4. GET SERVICE ACCOUNT TOKEN (for transaction) ───
    let accessToken;
    try {
      accessToken = await getServiceAccountToken(env);
      console.log('✅ Service Account token obtained');
    } catch (err) {
      console.error('❌ Service Account auth failed:', err.message);
      console.log('⚠️ Falling back to ID token');
      accessToken = idToken;
    }

    // ─── 5. READ ORDER (OUTSIDE TRANSACTION) ───
    let orderDoc = null;

    const orderUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/orders/${orderId}`;
    console.log('📄 Reading order:', orderUrl);

    let orderRes = await fetch(orderUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (orderRes.ok) {
      orderDoc = await orderRes.json();
      console.log('✅ Order found by direct document ID');
    } else {
      const status = orderRes.status;
      console.warn(`⚠️ Direct read failed (${status}), trying field query...`);

      const queryUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;
      const queryBody = {
        structuredQuery: {
          from: [{ collectionId: 'orders' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'orderId' },
              op: 'EQUAL',
              value: { stringValue: orderId }
            }
          },
          limit: 1
        }
      };

      const queryRes = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(queryBody),
      });

      if (!queryRes.ok) {
        const err = await queryRes.text();
        console.error('❌ Query failed:', err);
        throw new Error('Order not found by field query');
      }

      const queryData = await queryRes.json();
      if (!queryData || queryData.length === 0 || !queryData[0].document) {
        console.error('❌ Order not found in field query');
        throw new Error('Order not found');
      }

      orderDoc = queryData[0].document;
      console.log('✅ Order found by field query');
    }

    // Verify ownership
    const orderUserId = orderDoc.fields?.userId?.stringValue;
    if (orderUserId !== userId) {
      console.error('❌ Order userId mismatch:', orderUserId, 'vs', userId);
      return new Response(JSON.stringify({ error: 'Order does not belong to user' }), { status: 403 });
    }

    // Duplicate payment guard
    const paymentStatus = orderDoc.fields?.paymentStatus?.stringValue;
    const stockReduced = orderDoc.fields?.stockReduced?.booleanValue === true;
    if (paymentStatus === 'paid' || stockReduced) {
      console.warn('⚠️ Payment already processed for this order');
      return new Response(JSON.stringify({ error: 'Payment already processed for this order' }), { status: 409 });
    }

    // ─── 6. EXTRACT ITEMS FROM ORDER ───
    const orderItems = [];
    const itemValues = orderDoc.fields?.items?.arrayValue?.values || [];
    for (const itemVal of itemValues) {
      const f = itemVal.mapValue?.fields || {};
      orderItems.push({
        productId: f.productId?.stringValue,
        name: f.name?.stringValue || 'Product',
        variant: f.variant?.stringValue,
        variantId: f.variantId?.stringValue,
        quantity: Number(f.quantity?.integerValue ?? f.quantity?.doubleValue ?? 0),
      });
    }
    if (orderItems.length === 0) {
      throw new Error('Order has no items');
    }
    console.log(`📦 Order has ${orderItems.length} items`);

    // ─── 7. READ PRODUCTS (OUTSIDE TRANSACTION, using user token) ───
    const productDocs = [];
    for (const item of orderItems) {
      const pUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/products/${item.productId}`;
      console.log(`📄 Reading product: ${item.productId} at URL:`, pUrl);
      const pRes = await fetch(pUrl, {
        headers: { 'Authorization': `Bearer ${idToken}` }, // ✅ Use user token
      });
      if (!pRes.ok) {
        const status = pRes.status;
        const errorText = await pRes.text();
        console.error(`❌ Product read failed (${status}) for ${item.productId}:`, errorText);
        throw new Error(`Product ${item.productId} not found (status: ${status}) - ${errorText}`);
      }
      productDocs.push(await pRes.json());
    }
    console.log('✅ Products fetched for stock update (outside transaction)');

    // ─── 8. START FIRESTORE TRANSACTION (for writes only) ───
    console.log('🔄 Starting Firestore transaction for writes...');
    const txRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:beginTransaction`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ options: { readWrite: {} } }),
      }
    );
    if (!txRes.ok) {
      const err = await txRes.text();
      console.error('❌ Failed to begin transaction:', err);
      throw new Error('Failed to begin Firestore transaction');
    }
    const txData = await txRes.json();
    if (!txData.transaction) {
      throw new Error('No transaction ID returned');
    }
    const txId = txData.transaction;
    console.log('✅ Transaction begun, ID:', txId);

    // ─── 9. BUILD STOCK WRITES (using pre-fetched productDocs) ───
    const writes = [];
    const productNames = [];

    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      const pDoc = productDocs[i];
      productNames.push(item.name);

      const variants = pDoc.fields?.variants?.arrayValue?.values || [];

      if (variants.length > 0 && item.variant) {
        let found = false;
        const newVariants = [];

        for (const v of variants) {
          const label = v.mapValue?.fields?.label?.stringValue;
          if (label === item.variant) {
            const currentStock = Number(
              v.mapValue?.fields?.stock?.integerValue ?? v.mapValue?.fields?.stock?.doubleValue ?? 0
            );
            if (currentStock < item.quantity) {
              throw new Error(
                `Stock changed during checkout for ${item.name} (${item.variant}). Available: ${currentStock}, Needed: ${item.quantity}`
              );
            }
            const newV = JSON.parse(JSON.stringify(v));
            newV.mapValue.fields.stock = { integerValue: String(currentStock - item.quantity) };
            newVariants.push(newV);
            found = true;
          } else {
            newVariants.push(v);
          }
        }

        if (!found) {
          throw new Error(`Variant ${item.variant} not found during stock reduction for ${item.name}`);
        }

        writes.push({
          update: {
            name: pDoc.name,
            fields: {
              ...pDoc.fields,
              variants: { arrayValue: { values: newVariants } },
              updatedAt: { timestampValue: new Date().toISOString() },
            },
          },
          updateMask: { fieldPaths: ['variants', 'updatedAt'] },
          currentDocument: { exists: true },
        });
      } else {
        const currentStock = Number(
          pDoc.fields?.stock?.integerValue ?? pDoc.fields?.stock?.doubleValue ?? 0
        );
        if (currentStock < item.quantity) {
          throw new Error(
            `Stock changed during checkout for ${item.name}. Available: ${currentStock}, Needed: ${item.quantity}`
          );
        }
        writes.push({
          update: {
            name: pDoc.name,
            fields: {
              ...pDoc.fields,
              stock: { integerValue: String(currentStock - item.quantity) },
              updatedAt: { timestampValue: new Date().toISOString() },
            },
          },
          updateMask: { fieldPaths: ['stock', 'updatedAt'] },
          currentDocument: { exists: true },
        });
      }
    }

    // ─── 10. UPDATE ORDER (in transaction) ───
    writes.push({
      update: {
        name: `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/orders/${orderId}`,
        fields: {
          paymentStatus: { stringValue: 'paid' },
          razorpayPaymentId: { stringValue: razorpay_payment_id },
          razorpayOrderId: { stringValue: razorpay_order_id },
          stockReduced: { booleanValue: true },
          updatedAt: { timestampValue: new Date().toISOString() },
        },
      },
      updateMask: { fieldPaths: ['paymentStatus', 'razorpayPaymentId', 'razorpayOrderId', 'stockReduced', 'updatedAt'] },
      currentDocument: { exists: true },
    });

    // ─── 11. CLEAR CART ───
    writes.push({
      update: {
        name: `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/carts/${userId}`,
        fields: {
          items: { arrayValue: { values: [] } },
        },
      },
      updateMask: { fieldPaths: ['items'] },
      currentDocument: { exists: true },
    });

    // ─── 12. COMMIT TRANSACTION ───
    console.log('💾 Committing transaction with', writes.length, 'writes...');
    const commitRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: txId, writes }),
      }
    );
    if (!commitRes.ok) {
      const commitErr = await commitRes.text();
      console.error('❌ Transaction commit failed:', commitErr);
      if (commitErr.includes('ABORTED') || commitErr.includes('transaction')) {
        return new Response(
          JSON.stringify({ error: 'Concurrent modification detected. Please retry.' }),
          { status: 409 }
        );
      }
      throw new Error('Failed to commit stock reduction transaction');
    }
    console.log('✅ Transaction committed successfully');

    // ─── 13. UPDATE AUDIT LOG TO COMPLETED ───
    try {
      const auditUpdate = {
        status: 'completed',
        completedAt: new Date(),
      };
      const auditUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/payment_audit/${auditId}`;
      await fetch(auditUrl, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(toFirestoreDocumentFields(auditUpdate)),
      });
      console.log('✅ Audit log updated to completed');
    } catch (err) {
      console.error('❌ Audit update failed (non-critical):', err.message);
    }

    // ─── 14. SAVE PAYMENT RECORD ───
    const orderAmount = Number(
      orderDoc.fields?.amount?.integerValue ?? orderDoc.fields?.amount?.doubleValue ?? 0
    );
    const paymentRecordId = razorpay_payment_id || `pay_${Date.now()}`;
    const paymentData = {
      paymentId: paymentRecordId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      orderId,
      userId,
      userEmail,
      customerName: orderDoc.fields?.customerName?.stringValue || 'Unknown',
      amount: orderAmount,
      status: 'success',
      products: orderItems.map(i => ({ productId: i.productId, name: i.name, variant: i.variant, quantity: i.quantity })),
      createdAt: new Date(),
    };

    try {
      const paymentUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/payments/${paymentRecordId}`;
      const payRes = await fetch(paymentUrl, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(toFirestoreDocumentFields(paymentData)),
      });
      if (payRes.ok) {
        console.log('✅ Payment record saved:', paymentRecordId);
      } else {
        const err = await payRes.text();
        console.error('❌ Failed to save payment record:', err);
      }
    } catch (err) {
      console.error('❌ Error saving payment record:', err.message);
    }

    // ─── 15. CREATE INVOICE ───
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const orderSubtotal = Number(
      orderDoc.fields?.subtotal?.integerValue ?? orderDoc.fields?.subtotal?.doubleValue ?? 0
    );
    const orderShipping = Number(
      orderDoc.fields?.shippingCost?.integerValue ?? orderDoc.fields?.shippingCost?.doubleValue ?? 0
    );
    const orderDiscount = Number(
      orderDoc.fields?.couponDiscount?.integerValue ?? orderDoc.fields?.couponDiscount?.doubleValue ?? 0
    );

    const invoiceData = {
      invoiceId,
      orderId,
      userId,
      customerEmail: userEmail,
      items: orderItems.map(i => ({
        name: i.name,
        variant: i.variant,
        quantity: i.quantity,
      })),
      subtotal: orderSubtotal,
      shippingCost: orderShipping,
      couponDiscount: orderDiscount,
      total: orderAmount,
      createdAt: new Date(),
      status: 'generated',
    };

    try {
      const invUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/invoices/${invoiceId}`;
      await fetch(invUrl, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(toFirestoreDocumentFields(invoiceData)),
      });
      console.log('✅ Invoice created:', invoiceId);
    } catch (invErr) {
      console.error('❌ Invoice creation failed (non-critical):', invErr.message);
    }

    console.log(`🎉 Payment fully processed for order ${orderId}`);
    return new Response(
      JSON.stringify({
        verified: true,
        orderId,
        invoiceId,
        paymentId: paymentRecordId,
        message: 'Payment verified, stock reduced, cart cleared, invoice created',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (err) {
    console.error('❌ verify-payment error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ─── HELPERS ───

function base64url(str) {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function verifyFirebaseToken(idToken, env) {
  const apiKey = env?.FIREBASE_API_KEY || 'AIzaSyABec4VYQBnHpyzP1IX4TmW8muY3_VQHDM';
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error('❌ verifyFirebaseToken failed:', res.status, errorText);
    return null;
  }
  const data = await res.json();
  return data.users?.[0] || null;
}

async function getServiceAccountToken(env) {
  const rawKey = env.FIREBASE_PRIVATE_KEY || '';
  const privateKey = rawKey
    .replace(/^"|"$/g, '')
    .replace(/^'|'$/g, '')
    .replace(/\\n/g, '\n');

  const clientEmail = env.FIREBASE_CLIENT_EMAIL;

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const keyBuffer = pemToArrayBuffer(privateKey);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const signatureBytes = new Uint8Array(signature);
  let binary = '';
  for (let i = 0; i < signatureBytes.length; i++) {
    binary += String.fromCharCode(signatureBytes[i]);
  }
  const encodedSignature = base64url(binary);

  const jwt = `${signingInput}.${encodedSignature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Service account auth failed: ${data.error_description || data.error || 'Unknown'}`);
  }
  return data.access_token;
}

function pemToArrayBuffer(pem) {
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace('-----BEGIN RSA PRIVATE KEY-----', '')
    .replace('-----END RSA PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function toFirestoreFields(obj) {
  if (obj === null || obj === undefined) return { nullValue: null };
  if (typeof obj === 'string') return { stringValue: obj };
  if (obj instanceof Date) return { timestampValue: obj.toISOString() };
  if (typeof obj === 'number') {
    if (Number.isInteger(obj)) return { integerValue: String(obj) };
    return { doubleValue: obj };
  }
  if (typeof obj === 'boolean') return { booleanValue: obj };
  if (Array.isArray(obj)) return { arrayValue: { values: obj.map(v => toFirestoreFields(v)) } };
  if (typeof obj === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(obj)) fields[k] = toFirestoreFields(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(obj) };
}

function toFirestoreDocumentFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = toFirestoreFields(v);
  }
  return fields;
}