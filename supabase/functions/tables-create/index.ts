import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request): Promise<Response> => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    let token = "";
    if (authHeader?.startsWith("Bearer ")) token = authHeader.substring(7);
    if (!token) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const payload = JSON.parse(atob(token.split(".")[1]));
    const body = await req.json();
    const { number, location, status } = body;
    const restaurantId = payload.restaurantId || body.restaurantId;

    if (!number) {
      return new Response(JSON.stringify({ success: false, message: "Table number is required" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    if (!restaurantId) {
      return new Response(JSON.stringify({ success: false, message: "Restaurant context required" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ success: false, message: "Server configuration error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const now = new Date().toISOString();

    const { data: table, error: insertError } = await supabase
      .from("tables")
      .insert({
        number: String(number),
        location: location || null,
        status: status || "AVAILABLE",
        restaurant_id: restaurantId,
        created_at: now,
        updated_at: now,
      })
      .select("id, number, location, status, restaurant_id, created_at, updated_at")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      if (insertError.code === "23505") {
        return new Response(JSON.stringify({ success: false, message: "Table number already exists" }), { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      return new Response(JSON.stringify({ success: false, message: insertError.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Table created successfully",
      data: {
        id: table.id,
        number: table.number,
        location: table.location,
        status: table.status,
        restaurantId: table.restaurant_id,
        createdAt: table.created_at,
        updatedAt: table.updated_at,
      },
    }), { status: 201, headers: { "Content-Type": "application/json", ...corsHeaders } });

  } catch (e) {
    console.error("TABLES CREATE ERROR:", e);
    return new Response(JSON.stringify({ success: false, message: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
