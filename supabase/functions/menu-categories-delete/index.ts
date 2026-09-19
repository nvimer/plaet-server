import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, canAccessRestaurant, cors, json, error } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "DELETE") return cors(error("Method not allowed", 405), req);

  const user = await getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  try {
    const url = new URL(req.url);
    const raw = url.searchParams.get("id") ?? url.pathname.split("/").pop();
    const categoryId = parseInt(String(raw ?? ""));
    if (!Number.isInteger(categoryId)) return cors(error("Invalid category ID", 400), req);

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from("menu_categories")
      .select("id, restaurant_id")
      .eq("id", categoryId)
      .eq("deleted", false)
      .maybeSingle();

    if (!existing || !canAccessRestaurant(user, existing.restaurant_id)) {
      return cors(error("Category not found", 404, "CATEGORY_NOT_FOUND"), req);
    }

    // menu_items.category_id is required, so items would be left pointing at a deleted category.
    const { count } = await supabase
      .from("menu_items")
      .select("id", { count: "exact", head: true })
      .eq("category_id", categoryId)
      .eq("deleted", false);

    if (count) {
      return cors(error(`Cannot delete a category with ${count} active item(s)`, 409, "CATEGORY_HAS_ITEMS"), req);
    }

    const { error: deleteError } = await supabase
      .from("menu_categories")
      .update({ deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", categoryId);

    if (deleteError) {
      console.error("Delete error:", JSON.stringify(deleteError));
      return cors(error("Failed to delete category", 500), req);
    }

    return cors(json({
      success: true,
      message: "Category deleted successfully",
      data: null,
    }), req);

  } catch (e) {
    console.error("CATEGORY DELETE ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
