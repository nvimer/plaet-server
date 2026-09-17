import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, cors, json, error, deepToCamelCase } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "POST") return cors(error("Method not allowed", 405), req);

  const user = await getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  try {
    const input = await req.json();

    if (!input.name || !input.price || !input.categoryId) {
      return cors(error("Name, price, and categoryId are required", 400), req);
    }

    if (input.price < 0) {
      return cors(error("Price must be non-negative", 400), req);
    }

    const supabase = getSupabase();

    // Verify category exists
    const { data: category } = await supabase
      .from("menu_categories")
      .select("id")
      .eq("id", input.categoryId)
      .eq("deleted", false)
      .single();

    if (!category) {
      return cors(error("Category not found", 404, "CATEGORY_NOT_FOUND"), req);
    }

    // Check for duplicate name
    const { data: existing } = await supabase
      .from("menu_items")
      .select("id")
      .eq("name", input.name.trim())
      .eq("deleted", false)
      .single();

    if (existing) {
      return cors(error("A menu item with this name already exists", 409, "DUPLICATE_NAME"), req);
    }

    const { data: newItem, error: createError } = await supabase
      .from("menu_items")
      .insert({
        name: input.name.trim(),
        description: input.description || null,
        price: input.price,
        category_id: input.categoryId,
        is_available: input.isAvailable ?? true,
        image_url: input.imageUrl || null,
        inventory_type: input.inventoryType || "UNTRACKED",
        stock_quantity: input.stockQuantity ?? 0,
        low_stock_alert: input.lowStockAlert ?? 10,
        auto_mark_unavailable: input.autoMarkUnavailable ?? false,
        restaurant_id: user.restaurantId,
        updated_at: new Date().toISOString(),
      })
      .select(`
        id, name, description, price, is_available, image_url,
        inventory_type, stock_quantity, low_stock_alert, auto_mark_unavailable,
        created_at, updated_at, restaurant_id, category_id,
        category:menu_categories(id, name, description, "order")
      `)
      .single();

    if (createError) {
      console.error("Create error:", createError);
      return cors(error("Failed to create menu item", 500), req);
    }

    return cors(json({
      success: true,
      message: "Menu item created successfully",
      data: deepToCamelCase(newItem),
    }, 201), req);

  } catch (e) {
    console.error("MENU ITEM CREATE ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
