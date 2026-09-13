import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest, cors, json, error } from "../_shared/auth.ts";

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
  restaurantId: string | null,
  data: { id?: string; name?: string; phone?: string; phone2?: string; address1?: string; address2?: string }
): Promise<string | null> {
  if (data.id) return data.id;
  if (!data.phone || !restaurantId) return null;

  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("deleted", false)
    .eq("restaurant_id", restaurantId)
    .or(`phone.eq.${data.phone},phone2.eq.${data.phone}`)
    .single();

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
    })
    .select("id")
    .single();

  return newCustomer?.id || null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  if (req.method !== "POST") return cors(error("Method not allowed", 405));

  const user = getUserFromRequest(req);
  if (!user) return cors(error("Unauthorized", 401));

  try {
    const input: CreateOrderInput = await req.json();

    if (!input.type || !input.items?.length) {
      return cors(error("Type and items are required", 400));
    }

    const supabase = getSupabase();

    // Get daily menu for pricing
    const orderDate = input.createdAt ? new Date(input.createdAt) : new Date();
    const dayStart = new Date(orderDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(orderDate);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: dailyMenu } = await supabase
      .from("daily_menus")
      .select("id, base_price, protein_category_id, soup_option1_id, soup_option2_id")
      .gte("created_at", dayStart.toISOString())
      .lte("created_at", dayEnd.toISOString())
      .eq("deleted", false)
      .single();

    const basePrice = dailyMenu ? Number(dailyMenu.base_price) || 3000 : 0;

    // Get menu items for validation and pricing
    const menuItemIds = input.items.filter(i => i.menuItemId).map(i => i.menuItemId!);
    const { data: menuItems } = await supabase
      .from("menu_items")
      .select("id, name, price, category_id, is_available, inventory_type, stock_quantity")
      .in("id", menuItemIds)
      .eq("deleted", false);

    const menuItemMap = new Map((menuItems || []).map(mi => [mi.id, mi]));

    // Check availability
    for (const item of input.items) {
      if (item.menuItemId) {
        const mi = menuItemMap.get(item.menuItemId);
        if (mi && !mi.is_available) {
          return cors(error(`Item ${mi.name} is not available`, 400, "ITEMS_NOT_AVAILABLE"));
        }
        if (mi && mi.inventory_type === "TRACKED" && (mi.stock_quantity || 0) < item.quantity) {
          return cors(error(`Insufficient stock for ${mi.name}`, 400, "INSUFFICIENT_STOCK"));
        }
      }
    }

    // Check for existing open order on same table
    let existingOrderId: string | null = null;
    if (input.type === "DINE_IN" && input.tableId && user.restaurantId) {
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("table_id", input.tableId)
        .eq("restaurant_id", user.restaurantId)
        .eq("status", "OPEN")
        .eq("deleted", false)
        .single();

      if (existingOrder) {
        existingOrderId = existingOrder.id;
      }
    }

    // Get or create customer
    const customerId = await getOrCreateCustomer(supabase, user.restaurantId, {
      id: input.customerId,
      name: input.customerName,
      phone: input.customerPhone,
      phone2: input.customerPhone2,
      address1: input.address1,
      address2: input.address2,
    });

    // Get active cash closure
    let cashClosureId: string | null = null;
    const isHistorical = input.createdAt && new Date(input.createdAt).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);

    if (isHistorical) {
      const { data: closure } = await supabase
        .from("cash_closures")
        .select("id")
        .lte("created_at", input.createdAt)
        .eq("status", "OPEN")
        .eq("deleted", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      cashClosureId = closure?.id || null;
    } else {
      const { data: closure } = await supabase
        .from("cash_closures")
        .select("id")
        .eq("status", "OPEN")
        .eq("deleted", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!closure) {
        return cors(error("No hay un turno de caja abierto. Por favor abre caja antes de crear pedidos.", 400, "CASH_CLOSURE_REQUIRED"));
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

    // Create order
    let orderId: string;

    if (existingOrderId) {
      // Add items to existing order
      for (let index = 0; index < input.items.length; index++) {
        const item = input.items[index];
        const mi = item.menuItemId ? menuItemMap.get(item.menuItemId) : null;
        const itemBasePrice = mi ? Number(mi.price) : Number(item.priceAtOrder || 0);
        const isMainProtein = index === mainProteinIndex;
        const finalPrice = (isHistorical || !dailyMenu)
          ? Number(item.priceAtOrder || itemBasePrice)
          : itemBasePrice + (isMainProtein ? basePrice : 0);

        await supabase.from("order_items").insert({
          order_id: existingOrderId,
          menu_item_id: item.menuItemId || null,
          quantity: item.quantity,
          price_at_order: finalPrice,
          notes: item.notes || null,
          status: input.itemStatus || (isMainProtein ? "PENDING" : "READY"),
          updated_at: new Date().toISOString(),
        });
      }

      // Update table status
      if (input.tableId) {
        await supabase.from("tables").update({ status: "OCCUPIED" }).eq("id", input.tableId);
      }

      // Recalculate total
      const { data: allItems } = await supabase
        .from("order_items")
        .select("price_at_order, quantity")
        .eq("order_id", existingOrderId);

      const newTotal = (allItems || []).reduce((sum, i) => sum + Number(i.price_at_order) * i.quantity, 0);
      await supabase.from("orders").update({ total_amount: newTotal }).eq("id", existingOrderId);

      orderId = existingOrderId;

    } else {
      // Create new order
      const { data: newOrder, error: createError } = await supabase
        .from("orders")
        .insert({
          waiter_id: user.id,
          table_id: input.tableId || null,
          customerId: customerId,
          status: input.status || "OPEN",
          type: input.type,
          total_amount: 0,
          notes: input.notes || null,
          whatsapp_order_id: input.whatsappOrderId || null,
          restaurant_id: user.restaurantId,
          cash_closure_id: cashClosureId,
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createError || !newOrder) {
        console.error("Create order error:", JSON.stringify(createError));
        return cors(error("Failed to create order", 500, createError?.message));
      }

      orderId = newOrder.id;

      // Create order items
      for (let index = 0; index < input.items.length; index++) {
        const item = input.items[index];
        const mi = item.menuItemId ? menuItemMap.get(item.menuItemId) : null;
        const itemBasePrice = mi ? Number(mi.price) : Number(item.priceAtOrder || 0);
        const isMainProtein = index === mainProteinIndex;
        const finalPrice = (isHistorical || !dailyMenu)
          ? Number(item.priceAtOrder || itemBasePrice)
          : itemBasePrice + (isMainProtein ? basePrice : 0);

        await supabase.from("order_items").insert({
          order_id: orderId,
          menu_item_id: item.menuItemId || null,
          quantity: item.quantity,
          price_at_order: finalPrice,
          notes: item.notes || null,
          status: input.itemStatus || (isMainProtein ? "PENDING" : "READY"),
          updated_at: new Date().toISOString(),
        });
      }

      // If PAID status, create payment record
      if (input.status === "PAID") {
        const totalAmount = input.items.reduce((sum, item) => {
          const mi = item.menuItemId ? menuItemMap.get(item.menuItemId) : null;
          const price = Number(mi?.price || item.priceAtOrder || 0);
          return sum + price * item.quantity;
        }, 0);

        await supabase.from("payments").insert({
          order_id: orderId,
          amount: totalAmount,
          method: "CASH",
          cash_closure_id: cashClosureId,
        });
      }

      // Update table status
      if (input.type === "DINE_IN" && input.tableId) {
        await supabase.from("tables").update({ status: "OCCUPIED" }).eq("id", input.tableId);
      }
    }

    // Stock deduction (skip for historical)
    if (!isHistorical) {
      for (const item of input.items) {
        if (item.menuItemId) {
          const mi = menuItemMap.get(item.menuItemId);
          if (mi && mi.inventory_type === "TRACKED") {
            await supabase.rpc("deduct_stock", {
              p_menu_item_id: item.menuItemId,
              p_quantity: item.quantity,
              p_order_id: orderId,
            });
          }
        }
      }
    }

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
      data: createdOrder,
    }), existingOrderId ? 200 : 201);

  } catch (e) {
    console.error("ORDER CREATE ERROR:", e);
    return cors(error("Internal server error", 500));
  }
});
