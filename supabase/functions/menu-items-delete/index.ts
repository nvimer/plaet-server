import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, cors, json, error } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  if (req.method !== "DELETE") return cors(error("Method not allowed", 405));

  const user = getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401));

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const itemId = pathParts[pathParts.length - 1];

    if (!itemId || isNaN(parseInt(itemId))) {
      return cors(error("Invalid item ID", 400));
    }

    const supabase = getSupabase();

    // Verify item exists
    const { data: existingItem } = await supabase
      .from("menu_items")
      .select("id, restaurant_id")
      .eq("id", parseInt(itemId))
      .eq("deleted", false)
      .single();

    if (!existingItem) {
      return cors(error("Menu item not found", 404, "ITEM_NOT_FOUND"));
    }

    if (user.restaurantId && existingItem.restaurant_id !== user.restaurantId) {
      return cors(error("Forbidden", 403));
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from("menu_items")
      .update({
        deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", parseInt(itemId));

    if (deleteError) {
      console.error("Delete error:", deleteError);
      return cors(error("Failed to delete menu item", 500));
    }

    return cors(json({
      success: true,
      message: "Menu item deleted successfully",
    }));

  } catch (e) {
    console.error("MENU ITEM DELETE ERROR:", e);
    return cors(error("Internal server error", 500));
  }
});
