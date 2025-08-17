// Send Email Edge Function (Deno/TypeScript)
// Purpose: Sends transactional emails (verification, notifications, receipts).

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  try {
    // Parse request body
    const { to, subject, body } = await req.json();

    // Get Brevo API key from environment variable
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) {
      throw new Error("Missing BREVO_API_KEY environment variable");
    }

    // Send email via Brevo API
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        sender: { name: "TicketSwapper", email: "no-reply@ticketswapper.com" },
        to: [{ email: to }],
        subject,
        htmlContent: `<html><body>${body.replace(/\n/g, "<br>")}</body></html>`
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    return new Response(
      JSON.stringify({ message: "Email sent via Brevo" }),
      {
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    // Log the error for debugging
    console.error("send-email error:", error);

    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
