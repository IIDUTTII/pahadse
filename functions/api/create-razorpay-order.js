// functions/api/create-razorpay-order.js

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. Frontend se bheja gaya data (Amount in INR) read karo
    const body = await request.json();
    const amountInINR = body.amount; 

    // 2. Cloudflare Dashboard se Secret Keys lo
    const keyId = env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return new Response(JSON.stringify({ error: "Missing Razorpay Keys in Environment" }), { status: 500 });
    }

    // 3. Keys ko Base64 mein encode karo (Razorpay API ki requirement)
    const authHeader = "Basic " + btoa(`${keyId}:${keySecret}`);

    // 4. Razorpay Server ko order create karne ki request bhejo
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amountInINR * 100, // Razorpay 'paise' mein amount leta hai, isliye * 100
        currency: 'INR',
        receipt: 'receipt_' + Date.now(),
      })
    });

    const orderData = await razorpayResponse.json();

    // 5. Agar Razorpay se error aaye
    if (orderData.error) {
      return new Response(JSON.stringify({ error: orderData.error.description }), { status: 400 });
    }

    // 6. Success! Order ID frontend ko wapas bhejo
    return new Response(JSON.stringify(orderData), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}