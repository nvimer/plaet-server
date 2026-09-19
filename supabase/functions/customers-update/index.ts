import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, canAccessRestaurant, cors, json, error, deepToCamelCase } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "PATCH") return cors(error("Method not allowed", 405), req);

  const user = await getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const customerId = pathParts[pathParts.length - 1];

    if (!customerId) {
      return cors(error("Invalid customer ID", 400), req);
    }

    const input = await req.json();
    const supabase = getSupabase();

    // Verify customer exists
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id, restaurant_id")
      .eq("id", customerId)
      .eq("deleted", false)
      .single();

    if (!existingCustomer) {
      return cors(error("Customer not found", 404, "CUSTOMER_NOT_FOUND"), req);
    }

    if (!canAccessRestaurant(user, existingCustomer.restaurant_id)) {
      return cors(error("Forbidden", 403), req);
    }

    // Check for duplicate phone if phone is being changed
    if (input.phone) {
      const { data: duplicate } = await supabase
        .from("customers")
        .select("id")
        .eq("restaurant_id", existingCustomer.restaurant_id)
        .eq("phone", input.phone)
        .neq("id", customerId)
        .eq("deleted", false)
        .limit(1)
        .maybeSingle();

      if (duplicate) {
        return cors(error("A customer with this phone already exists", 409, "DUPLICATE_PHONE"), req);
      }
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.firstName !== undefined) updateData.first_name = input.firstName.trim();
    if (input.lastName !== undefined) updateData.last_name = input.lastName.trim();
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.phone2 !== undefined) updateData.phone2 = input.phone2;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.address1 !== undefined) updateData.address1 = input.address1;
    if (input.address2 !== undefined) updateData.address2 = input.address2;

    const { data: updatedCustomer, error: updateError } = await supabase
      .from("customers")
      .update(updateData)
      .eq("id", customerId)
      .select("id, first_name, last_name, phone, phone2, email, address1, address2, restaurant_id, updated_at")
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return cors(error("Failed to update customer", 500), req);
    }

    return cors(json({
      success: true,
      message: "Customer updated successfully",
      data: deepToCamelCase(updatedCustomer),
    }), req);

  } catch (e) {
    console.error("CUSTOMER UPDATE ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
