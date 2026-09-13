import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, cors, json, error } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  if (req.method !== "POST") return cors(error("Method not allowed", 405));

  const user = getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401));

  try {
    const input = await req.json();

    if (!input.firstName || !input.lastName || !input.phone) {
      return cors(error("First name, last name, and phone are required", 400));
    }

    const supabase = getSupabase();

    // Check for duplicate phone
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", input.phone)
      .eq("deleted", false)
      .single();

    if (existing) {
      return cors(error("A customer with this phone already exists", 409, "DUPLICATE_PHONE"));
    }

    const { data: newCustomer, error: createError } = await supabase
      .from("customers")
      .insert({
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        phone: input.phone,
        phone2: input.phone2 || null,
        email: input.email || null,
        address1: input.address1 || null,
        address2: input.address2 || null,
        restaurant_id: user.restaurantId,
        updated_at: new Date().toISOString(),
      })
      .select("id, first_name, last_name, phone, phone2, email, address1, address2, restaurant_id, created_at")
      .single();

    if (createError) {
      console.error("Create error:", createError);
      return cors(error("Failed to create customer", 500));
    }

    return cors(json({
      success: true,
      message: "Customer created successfully",
      data: newCustomer,
    }), 201);

  } catch (e) {
    console.error("CUSTOMER CREATE ERROR:", e);
    return cors(error("Internal server error", 500));
  }
});
