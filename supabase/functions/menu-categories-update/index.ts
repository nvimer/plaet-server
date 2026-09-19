import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, canAccessRestaurant, cors, json, error, deepToCamelCase } from "../_shared/auth.ts";
import { isMenuCategoryType, MENU_CATEGORY_TYPES } from "../_shared/menu-categories.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/** The id may come as ?id=, in the body, or as the last path segment. */
function getCategoryId(url: URL, body: Record<string, unknown>): number | null {
  const raw = url.searchParams.get("id") ?? body.id ?? url.pathname.split("/").pop();
  const id = parseInt(String(raw ?? ""));
  return Number.isInteger(id) ? id : null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "PATCH" && req.method !== "PUT") return cors(error("Method not allowed", 405), req);

  const user = await getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  try {
    const input = await req.json();
    const categoryId = getCategoryId(new URL(req.url), input);
    if (categoryId === null) return cors(error("Invalid category ID", 400), req);

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

    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) {
      const name = String(input.name).trim();
      if (!name) return cors(error("Name cannot be empty", 400), req);

      const { data: duplicate } = await supabase
        .from("menu_categories")
        .select("id")
        .eq("restaurant_id", existing.restaurant_id)
        .eq("name", name)
        .neq("id", categoryId)
        .eq("deleted", false)
        .limit(1)
        .maybeSingle();

      if (duplicate) {
        return cors(error("A category with this name already exists", 409, "DUPLICATE_NAME"), req);
      }
      updateData.name = name;
    }

    if (input.type !== undefined) {
      if (!isMenuCategoryType(input.type)) {
        return cors(error(`Invalid type. Must be one of: ${MENU_CATEGORY_TYPES.join(", ")}`, 400), req);
      }
      updateData.type = input.type;
    }

    if (input.description !== undefined) updateData.description = input.description;
    if (input.order !== undefined) {
      const order = Number(input.order);
      if (!Number.isFinite(order)) return cors(error("Order must be a number", 400), req);
      updateData.order = order;
    }

    if (Object.keys(updateData).length === 0) {
      return cors(error("No fields to update", 400), req);
    }

    const { data: category, error: updateError } = await supabase
      .from("menu_categories")
      .update(updateData)
      .eq("id", categoryId)
      .select(`id, name, description, "order", type, restaurant_id, deleted`)
      .single();

    if (updateError) {
      console.error("Update error:", JSON.stringify(updateError));
      if (updateError.code === "23505") {
        const duplicateRole = String(updateError.message || "").includes("restaurant_id_type");
        return duplicateRole
          ? cors(error(`This restaurant already has a ${input.type} category`, 409, "DUPLICATE_TYPE"), req)
          : cors(error("A category with this name already exists", 409, "DUPLICATE_NAME"), req);
      }
      return cors(error("Failed to update category", 500), req);
    }

    return cors(json({
      success: true,
      message: "Category updated successfully",
      data: deepToCamelCase(category),
    }), req);

  } catch (e) {
    console.error("CATEGORY UPDATE ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
