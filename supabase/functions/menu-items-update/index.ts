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
    const itemId = pathParts[pathParts.length - 1];

    if (!itemId || isNaN(parseInt(itemId))) {
      return cors(error("Invalid item ID", 400));
    }

    const input = await req.json();

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

    // Check for duplicate name if name is being changed
    if (input.name) {
      const { data: duplicate } = await supabase
        .from("menu_items")
        .select("id")
        .eq("name", input.name.trim())
        .neq("id", parseInt(itemId))
        .eq("deleted", false)
        .single();

      if (duplicate) {
        return cors(error("A menu item with this name already exists", 409, "DUPLICATE_NAME"));
      }
    }

    // Verify category if being changed
    if (input.categoryId) {
      const { data: category } = await supabase
        .from("menu_categories")
        .select("id")
        .eq("id", input.categoryId)
        .eq("deleted", false)
        .single();

      if (!category) {
        return cors(error("Category not found", 404, "CATEGORY_NOT_FOUND"));
      }
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.description !== undefined) updateData.description = input.description;
    if (input.price !== undefined) {
      if (input.price < 0) return cors(error("Price must be non-negative", 400));
      updateData.price = input.price;
    }
    if (input.categoryId !== undefined) updateData.category_id = input.categoryId;
    if (input.isAvailable !== undefined) updateData.is_available = input.isAvailable;
    if (input.imageUrl !== undefined) updateData.image_url = input.imageUrl;
    if (input.inventoryType !== undefined) updateData.inventory_type = input.inventoryType;
    if (input.stockQuantity !== undefined) updateData.stock_quantity = input.stockQuantity;
    if (input.lowStockAlert !== undefined) updateData.low_stock_alert = input.lowStockAlert;
    if (input.autoMarkUnavailable !== undefined) updateData.auto_mark_unavailable = input.autoMarkUnavailable;

    const { data: updatedItem, error: updateError } = await supabase
      .from("menu_items")
      .update(updateData)
      .eq("id", parseInt(itemId))
      .select(`
        id, name, description, price, is_available, image_url,
        inventory_type, stock_quantity, low_stock_alert, auto_mark_unavailable,
        created_at, updated_at, restaurant_id, category_id,
        category:menu_categories(id, name, description, "order")
      `)
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return cors(error("Failed to update menu item", 500));
    }

    return cors(json({
      success: true,
      message: "Menu item updated successfully",
      data: updatedItem,
    }));

  } catch (e) {
    console.error("MENU ITEM UPDATE ERROR:", e);
    return cors(error("Internal server error", 500));
  }
});
