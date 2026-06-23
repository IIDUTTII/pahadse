export async function onRequest(context) {
  const { request, env } = context;

  // 1. Handle Browser "Preflight" Checks (The 405 Fix)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // 2. Reject anything that is not a POST request
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { 
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body = await request.json();
    const amountInINR = body.amount; 

    const keyId = env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return new Response(JSON.stringify({ error: "Missing Razorpay Keys on Server" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const authHeader = "Basic " + btoa(`${keyId}:${keySecret}`);

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Math.round(amountInINR * 100), // Ensures it's an integer
        currency: 'INR',
        receipt: 'receipt_' + Date.now(),
      })
    });

    const orderData = await razorpayResponse.json();

    if (orderData.error) {
      return new Response(JSON.stringify({ error: orderData.error.description }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify(orderData), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" 
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}