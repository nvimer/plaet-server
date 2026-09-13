import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, cors, json, error } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  if (req.method !== "PATCH") return cors(error("Method not allowed", 405));

  const user = getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401));

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const tableId = pathParts[pathParts.length - 1];

    if (!tableId || isNaN(parseInt(tableId))) {
      return cors(error("Invalid table ID", 400));
    }

    const input = await req.json();
    const supabase = getSupabase();

    // Verify table exists
    const { data: existingTable } = await supabase
      .from("tables")
      .select("id, restaurant_id")
      .eq("id", parseInt(tableId))
      .eq("deleted", false)
      .single();

    if (!existingTable) {
      return cors(error("Table not found", 404, "TABLE_NOT_FOUND"));
    }

    if (user.restaurantId && existingTable.restaurant_id !== user.restaurantId) {
      return cors(error("Forbidden", 403));
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.status !== undefined) updateData.status = input.status;
    if (input.location !== undefined) updateData.location = input.location;

    const { data: updatedTable, error: updateError } = await supabase
      .from("tables")
      .update(updateData)
      .eq("id", parseInt(tableId))
      .select("id, number, status, location, restaurant_id, updated_at")
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return cors(error("Failed to update table", 500));
    }

    return cors(json({
      success: true,
      message: "Table updated successfully",
      data: updatedTable,
    }));

  } catch (e) {
    console.error("TABLE UPDATE ERROR:", e);
    return cors(error("Internal server error", 500));
  }
});
