import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, writeRestaurantId, cors, json, error, deepToCamelCase } from "../_shared/auth.ts";
import { getRestaurantTimeZone, localDay, localDayRange } from "../_shared/time.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

interface OrderItem {
  menuItemId?: number;
  quantity: number;
  notes?: string;
  priceAtOrder?: number;
  status?: string;
  isSubstitution?: boolean;
  originalItemId?: number;
  isExtra?: boolean;
}

interface CreateOrderInput {
  restaurantId?: string;
  tableId?: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerPhone2?: string;
  address1?: string;
  address2?: string;
  type: string;
  items: OrderItem[];
  notes?: string;
  whatsappOrderId?: string;
  createdAt?: string;
  status?: string;
  itemStatus?: string;
}

async function getOrCreateCustomer(
  supabase: ReturnType<typeof getSupabase>,
  restaurantId: string,
  data: { id?: string; name?: string; phone?: string; phone2?: string; address1?: string; address2?: string }
): Promise<string | null | false> {
  if (data.id) {
    const { data: owned } = await supabase
      .from("customers")
      .select("id")
      .eq("id", data.id)
      .eq("restaurant_id", restaurantId)
      .eq("deleted", false)
      .maybeSingle();
    return owned ? owned.id : false;
  }
  if (!data.phone) return null;

  // Quoted so commas or parentheses in the phone can't inject extra PostgREST filters.
  const phone = `"${data.phone.replace(/["\\]/g, "")}"`;
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("deleted", false)
    .eq("restaurant_id", restaurantId)
    .or(`phone.eq.${phone},phone2.eq.${phone}`)
    .limit(1)
    .maybeSingle();

  if (existing) {
    await supabase.from("customers").update({
      phone2: data.phone2 || undefined,
      address1: data.address1 || undefined,
      address2: data.address2 || undefined,
    }).eq("id", existing.id);
    return existing.id;
  }

  const nameParts = (data.name || "Cliente").trim().split(" ");
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Sazonarte";

  const { data: newCustomer } = await supabase
    .from("customers")
    .insert({
      restaurant_id: restaurantId,
      first_name: firstName,
      last_name: lastName,
      phone: data.phone,
      phone2: data.phone2,
      address1: data.address1,
      address2: data.address2,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  return newCustomer?.id || null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "POST") return cors(error("Method not allowed", 405), req);

  const user = await getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401), req);

  try {
    const input: CreateOrderInput = await req.json();

    if (!input.type || !input.items?.length) {
      return cors(error("Type and items are required", 400), req);
    }

    const restaurantId = writeRestaurantId(user, input.restaurantId);
    if (!restaurantId) return cors(error("Restaurant context required", 400, "TENANT_REQUIRED"), req);

    const supabase = getSupabase();
    const timeZone = await getRestaurantTimeZone(supabase, restaurantId);

    // Get daily menu for pricing (restaurant's local day, not the server's UTC day)
    const orderDate = input.createdAt ? new Date(input.createdAt) : new Date();
    const day = localDayRange(orderDate, timeZone);

    const { data: dailyMenu } = await supabase
      .from("daily_menus")
      .select("id, base_price, protein_category_id")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", day.start)
      .lte("created_at", day.end)
      .eq("deleted", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const basePrice = dailyMenu ? Number(dailyMenu.base_price) || 3000 : 0;

    // Get menu items for validation and pricing
    const menuItemIds = [...new Set(input.items.filter(i => i.menuItemId).map(i => i.menuItemId!))];
    const { data: menuItems } = await supabase
      .from("menu_items")
      .select("id, name, price, category_id, is_available, inventory_type, stock_quantity")
      .in("id", menuItemIds)
      .eq("restaurant_id", restaurantId)
      .eq("deleted", false);

    const menuItemMap = new Map((menuItems || []).map(mi => [mi.id, mi]));

    if (menuItemMap.size !== menuItemIds.length) {
      return cors(error("One or more menu items were not found", 400, "ITEMS_NOT_FOUND"), req);
    }

    // Check availability
    for (const item of input.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return cors(error("Item quantity must be a positive integer", 400), req);
      }
      if (item.menuItemId) {
        const mi = menuItemMap.get(item.menuItemId)!;
        if (!mi.is_available) {
          return cors(error(`Item ${mi.name} is not available`, 400, "ITEMS_NOT_AVAILABLE"), req);
        }
        if (mi.inventory_type === "TRACKED" && (mi.stock_quantity || 0) < item.quantity) {
          return cors(error(`Insufficient stock for ${mi.name}`, 400, "INSUFFICIENT_STOCK"), req);
        }
      }
    }

    if (input.tableId) {
      const { data: table } = await supabase
        .from("tables")
        .select("id")
        .eq("id", input.tableId)
        .eq("restaurant_id", restaurantId)
        .eq("deleted", false)
        .maybeSingle();
      if (!table) return cors(error("Table not found", 404, "TABLE_NOT_FOUND"), req);
    }

    // Check for existing open order on same table
    let existingOrderId: string | null = null;
    if (input.type === "DINE_IN" && input.tableId) {
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("table_id", input.tableId)
        .eq("restaurant_id", restaurantId)
        .eq("status", "OPEN")
        .eq("deleted", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingOrder) {
        existingOrderId = existingOrder.id;
      }
    }

    // Get or create customer
    const customerId = await getOrCreateCustomer(supabase, restaurantId, {
      id: input.customerId,
      name: input.customerName,
      phone: input.customerPhone,
      phone2: input.customerPhone2,
      address1: input.address1,
      address2: input.address2,
    });
    if (customerId === false) return cors(error("Customer not found", 404, "CUSTOMER_NOT_FOUND"), req);

    // Get active cash closure
    let cashClosureId: string | null = null;
    const isHistorical = !!input.createdAt && localDay(orderDate, timeZone) < localDay(new Date(), timeZone);

    if (isHistorical) {
      const { data: closure } = await supabase
        .from("cash_closures")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .lte("created_at", input.createdAt)
        .eq("status", "OPEN")
        .eq("deleted", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      cashClosureId = closure?.id || null;
    } else {
      const { data: closure } = await supabase
        .from("cash_closures")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("status", "OPEN")
        .eq("deleted", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!closure) {
        return cors(error("No hay un turno de caja abierto. Por favor abre caja antes de crear pedidos.", 400, "CASH_CLOSURE_REQUIRED"), req);
      }
      cashClosureId = closure.id;
    }

    // Calculate prices with daily menu logic
    const proteinCategoryId = dailyMenu?.protein_category_id;
    const proteinItems = input.items
      .map((item, index) => ({
        index,
        price: Number(menuItemMap.get(item.menuItemId!)?.price || item.priceAtOrder || 0),
        categoryId: menuItemMap.get(item.menuItemId!)?.category_id,
      }))
      .filter(item => proteinCategoryId && item.categoryId === proteinCategoryId)
      .sort((a, b) => b.price - a.price);

    const mainProteinIndex = proteinItems[0]?.index;
    const itemRows = input.items.map((item, index) => {
      const mi = item.menuItemId ? menuItemMap.get(item.menuItemId) : null;
      const itemBasePrice = mi ? Number(mi.price) : Number(item.priceAtOrder || 0);
      const isMainProtein = index === mainProteinIndex;
      const finalPrice = (isHistorical || !dailyMenu)
        ? Number(item.priceAtOrder || itemBasePrice)
        : itemBasePrice + (isMainProtein ? basePrice : 0);

      return {
        menu_item_id: item.menuItemId || null,
        quantity: item.quantity,
        price: finalPrice,
        notes: item.notes || null,
        status: input.itemStatus || (isMainProtein ? "PENDING" : "READY"),
      };
    });

    // One transaction: locks the stock, writes the order, its items, the stock
    // movements and the payment, or rolls all of it back.
    const { data: createdId, error: txError } = await supabase.rpc("create_order_tx", {
      p_payload: {
        restaurant_id: restaurantId,
        waiter_id: user.id,
        table_id: input.tableId || null,
        customer_id: customerId || null,
        cash_closure_id: cashClosureId,
        status: input.status || "OPEN",
        type: input.type,
        notes: input.notes || null,
        whatsapp_order_id: input.whatsappOrderId || null,
        created_at: input.createdAt || null,
        existing_order_id: existingOrderId,
        skip_stock: isHistorical,
        occupy_table: existingOrderId !== null || input.type === "DINE_IN",
        items: itemRows,
      },
    });

    if (txError) {
      const message = String(txError.message || "");
      const code = message.split(":")[0].trim();
      const known: Record<string, number> = {
        INSUFFICIENT_STOCK: 400,
        ITEMS_NOT_AVAILABLE: 400,
        ITEM_NOT_FOUND: 400,
        NO_ITEMS: 400,
        TENANT_REQUIRED: 400,
        ORDER_NOT_FOUND: 404,
      };
      if (known[code]) {
        return cors(error(message.slice(code.length + 1).trim() || code, known[code], code), req);
      }
      console.error("CREATE ORDER TX ERROR:", JSON.stringify(txError));
      return cors(error("Failed to create order", 500), req);
    }

    const orderId = createdId as string;

    // Fetch created order with relations
    const { data: createdOrder } = await supabase
      .from("orders")
      .select(`
        id, waiter_id, table_id, "customerId", status, type, total_amount,
        notes, whatsapp_order_id, created_at, updated_at, restaurant_id,
        items:order_items(
          id, menu_item_id, quantity, price_at_order, notes, status, created_at,
          menu_item:menu_items(id, name, price, category_id)
        ),
        table:tables(id, number, status),
        customer:customers(id, first_name, last_name, phone)
      `)
      .eq("id", orderId)
      .single();

    return cors(json({
      success: true,
      message: `Order with ID ${orderId} created successfully`,
      data: deepToCamelCase(createdOrder),
    }, existingOrderId ? 200 : 201), req);

  } catch (e) {
    console.error("ORDER CREATE ERROR:", e);
    return cors(error("Internal server error", 500), req);
  }
});
