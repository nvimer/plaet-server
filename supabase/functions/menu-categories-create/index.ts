import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, writeRestaurantId, cors, json, error, deepToCamelCase } from "../_shared/auth.ts";
import { isMenuCategoryType, MENU_CATEGORY_TYPES } from "../_shared/menu-categories.ts";

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

    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (!name) return cors(error("Name is required", 400), req);

    const type = input.type ?? "OTHER";
    if (!isMenuCategoryType(type)) {
      return cors(error(`Invalid type. Must be one of: ${MENU_CATEGORY_TYPES.join(", ")}`, 400), req);
    }

    const restaurantId = writeRestaurantId(user, input.restaurantId);
    if (!restaurantId) return cors(error("Restaurant context required", 400, "TENANT_REQUIRED"), req);

    const supabase = getSupabase();

    const { data: duplicate } = await supabase
      .from("menu_categories")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("name", name)
      .eq("deleted", false)
      .limit(1)
      .maybeSingle();

    if (duplicate) {
      return cors(error("A category with this name already exists", 409, "DUPLICATE_NAME"), req);
    }

    // Append to the end of the menu when no position is given.
    let order = Number(input.order);
    if (!Number.isFinite(order)) {
      const { data: last } = await supabase
        .from("menu_categories")
        .select("order")
        .eq("restaurant_id", restaurantId)
        .eq("deleted", false)
        .order("order", { ascending: false })
        .limit(1)
        .maybeSingle();
      order = (Number(last?.order) || 0) + 1;
    }

    const { data: category, error: createError } = await supabase
      .from("menu_categories")
      .insert({
        name,
        description: input.description || null,
        order,
        type,
        restaurant_id: restaurantId,
      })
      .select(`id, name, description, "order", type, restaurant_id, deleted`)
      .single();

    if (createError) {
      console.error("Create error:", JSON.stringify(createError));
      if (createError.code === "23505") {
        const duplicateRole = String(createError.message || "").includes("restaurant_id_type");
        return duplicateRole
          ? cors(error(`This restaurant already has a ${type} category`, 409, "DUPLICATE_TYPE"), req)
          : cors(error("A category with this name already exists", 409, "DUPLICATE_NAME"), req);
      }
      return cors(error("Failed to create category", 500), req);
    }

    return cors(json({
      success: true,
      message: "Category created successfully",
      data: deepToCamelCase({ ...category, items: [] }),
    }, 201), req);

  } catch (e) {
    console.error("CATEGORY CREATE ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
