// Verify Razorpay Payment Edge Function (Deno/TypeScript)
// Purpose: Verifies a payment with Razorpay (checks signature, status, etc.).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://ticket-swapper7.vercel.app',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    // Parse request body
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature, 
      ticketId 
    } = await req.json();

    // Validate required fields
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !ticketId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: razorpay_payment_id, razorpay_order_id, razorpay_signature, ticketId' 
        }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'https://ticket-swapper7.vercel.app',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          } 
        }
      );
    }

    // Get Razorpay credentials from environment
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!razorpayKeySecret) {
      return new Response(
        JSON.stringify({ 
          error: 'Razorpay credentials not configured' 
        }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'https://ticket-swapper7.vercel.app',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          } 
        }
      );
    }

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const crypto = await import('https://deno.land/std@0.177.0/crypto/mod.ts');
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const key = encoder.encode(razorpayKeySecret);
    
    // Create HMAC-SHA256 signature
    const hmacKey = await crypto.hmac.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.hmac.subtle.sign('HMAC', hmacKey, data);
    const generatedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Compare signatures
    if (generatedSignature !== razorpay_signature) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid payment signature' 
        }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'https://ticket-swapper7.vercel.app',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          } 
        }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Supabase configuration missing' 
        }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'https://ticket-swapper7.vercel.app',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ 
          error: 'Ticket not found' 
        }),
        { 
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'https://ticket-swapper7.vercel.app',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          } 
        }
      );
    }

    // Calculate amounts
    const commissionRate = 0.05;
    const sellingPrice = ticket.selling_price;
    const platformCommission = Math.round(sellingPrice * commissionRate);
    const sellerAmount = sellingPrice - platformCommission;

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        ticket_id: ticketId,
        buyer_id: ticket.buyer_id || null, // Will be updated when buyer is known
        seller_id: ticket.seller_id,
        amount: sellingPrice,
        platform_fee: platformCommission,
        status: 'completed',
        payment_method: 'razorpay',
        razorpay_order_id: razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id,
        escrow_status: 'held',
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create transaction record' 
        }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'https://ticket-swapper7.vercel.app',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          } 
        }
      );
    }

    // Update ticket status
    const { error: ticketUpdateError } = await supabase
      .from('tickets')
      .update({ 
        status: 'sold',
        buyer_id: ticket.buyer_id || null,
        sold_at: new Date().toISOString()
      })
      .eq('id', ticketId);

    if (ticketUpdateError) {
      console.error('Ticket update error:', ticketUpdateError);
    }

    // Create seller payout record
    const { error: payoutError } = await supabase
      .from('seller_payouts')
      .insert({
        transaction_id: transaction.id,
        seller_id: ticket.seller_id,
        amount: sellerAmount,
        status: 'pending',
        payment_method: 'upi',
        created_at: new Date().toISOString()
      });

    if (payoutError) {
      console.error('Payout creation error:', payoutError);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified successfully',
        transaction: {
          id: transaction.id,
          amount: sellingPrice,
          platformCommission: platformCommission,
          sellerAmount: sellerAmount,
          status: 'completed'
        },
        ticket: {
          id: ticketId,
          status: 'sold'
        }
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://ticket-swapper7.vercel.app',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        } 
      }
    );

  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error while verifying payment' 
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://ticket-swapper7.vercel.app',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        } 
      }
    );
  }
});
