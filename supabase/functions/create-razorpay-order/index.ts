// Create Razorpay Order Edge Function (Deno/TypeScript)
// Purpose: Creates an order in Razorpay before collecting payment.

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://ticket-swapper7.vercel.app',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey, x-requested-with',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    // Parse request body
    const { ticketId, amount, sellerAmount, platformCommission } = await req.json();

    // Validate required fields
    if (!ticketId || !amount || !sellerAmount || !platformCommission) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: ticketId, amount, sellerAmount, platformCommission' 
        }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'https://ticket-swapper7.vercel.app',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey, x-requested-with',
          } 
        }
      );
    }

    // Get Razorpay credentials from environment
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(
        JSON.stringify({ 
          error: 'Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your Supabase Edge Function secrets.' 
        }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'https://ticket-swapper7.vercel.app',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey, x-requested-with',
          } 
        }
      );
    }

    // Create Razorpay order
    const orderData = {
      amount: Math.round(amount * 100), // Convert to paise (smallest currency unit)
      currency: 'INR',
      receipt: `ticket_${ticketId}_${Date.now()}`,
      notes: {
        ticketId: ticketId,
        sellerAmount: sellerAmount.toString(),
        platformCommission: platformCommission.toString()
      }
    };

    // Make API call to Razorpay
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Razorpay API error:', errorData);
      return new Response(
        JSON.stringify({ 
          error: `Failed to create Razorpay order: ${errorData.error?.description || 'Unknown error'}` 
        }),
        { 
          status: response.status,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'https://ticket-swapper7.vercel.app',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey, x-requested-with',
          } 
        }
      );
    }

    const orderResponse = await response.json();

    // Return order details for frontend
    return new Response(
      JSON.stringify({
        success: true,
        orderId: orderResponse.id,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        razorpayKeyId: razorpayKeyId,
        receipt: orderResponse.receipt,
        ticketId: ticketId,
        sellerAmount: sellerAmount,
        platformCommission: platformCommission
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://ticket-swapper7.vercel.app',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey, x-requested-with',
        } 
      }
    );

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error while creating payment order' 
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://ticket-swapper7.vercel.app',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey, x-requested-with',
        } 
      }
    );
  }
});
