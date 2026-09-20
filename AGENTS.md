# Agentic Coding Guidelines (Plaet Server)

Plaet is a multi-tenant restaurant management SaaS. **The live backend is Supabase Edge Functions (Deno + TypeScript) on top of Postgres.** The Express + Prisma app under `src/` is the previous backend, kept for reference while the last pieces are ported; it is not deployed.

Read this file before touching anything, then the relevant section of `supabase/functions/_shared/`.

---

## 1. Where the code lives

| Path | What it is |
|------|-----------|
| `supabase/functions/<name>/index.ts` | One Edge Function per endpoint (58 of them) |
| `supabase/functions/_shared/` | Auth, tenancy, passwords, time zones, menu categories, daily menu, users |
| `supabase/migrations/` | Schema and Postgres functions, applied in order |
| `supabase/config.toml` | Every function needs an entry with `verify_jwt = false` |
| `scripts/sql-checks/` | Queries to verify migrations against a live database without writing |
| `scripts/menu/` | Menu load and daily stock scripts for Sazonarte |
| `src/`, `prisma/`, `docs/` | **Legacy Express backend.** Not deployed. Good for business rules, not for how things work today |

## 2. Commands

```bash
# Type-check every function (needs Deno; there is no package.json for the functions)
deno check supabase/functions/_shared/*.ts supabase/functions/*/index.ts

# Deploy: migrations FIRST, then functions. Functions call RPCs that migrations create.
supabase migration list --project-ref alkrxrcpdxecpzgykbrz
supabase db push        --project-ref alkrxrcpdxecpzgykbrz
supabase functions deploy --project-ref alkrxrcpdxecpzgykbrz
supabase functions logs <name> --project-ref alkrxrcpdxecpzgykbrz
```

There is no Docker in the usual dev environment, so migrations cannot be run locally. To verify SQL against production without writing anything, use the pattern in `scripts/sql-checks/04_verificacion.sql`: apply the migrations, exercise them, and end with `RAISE EXCEPTION` carrying the results, so the transaction rolls back and the numbers still show up.

The npm scripts (`npm run dev`, `test`, `prisma:*`) belong to the legacy Express app.

## 3. Writing an Edge Function

Every function follows the same shape. Copy a small one (`menu-items-get`) rather than starting blank.

```ts
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
  if (req.method !== "GET") return cors(error("Method not allowed", 405), req);

  const user = await getUserFromRequest(req);          // ALWAYS await: it verifies the signature
  if (!user) return cors(error("Unauthorized", 401), req);

  const scope = tenantScope(user);
  if (scope === false) return cors(error("Restaurant context required", 403, "TENANT_REQUIRED"), req);
  ...
});
```

Rules that are not optional:

- **`getUserFromRequest` is async and verifies the HS256 signature, the expiry and the `alg`.** Never decode a token by hand with `atob`. Refresh tokens are rejected as access tokens.
- **Every query is scoped**, with the three helpers in `_shared/auth.ts`:
  - `tenantScope(user)` → the restaurant id, `null` for a global SUPERADMIN, `false` for a caller with no tenant (reject).
  - `canAccessRestaurant(user, row.restaurant_id)` for reads and updates of a single row.
  - `writeRestaurantId(user, body.restaurantId)` for inserts.
- The gateway does not authenticate: `verify_jwt = false` everywhere, and the function does the work.
- Responses are `{ success, message, data, meta? }` and go through `deepToCamelCase`.
- Errors never leak internals: log with `console.error`, answer with a message and a code.
- `supabase-js` runs with the **service role**, so RLS does not protect anything. The code is the only tenant boundary.

## 4. Transactions live in Postgres

Anything that writes more than one row goes through an RPC, not a sequence of PostgREST calls:

| RPC | Migration | What it owns |
|-----|-----------|--------------|
| `create_order_tx(jsonb)` | 00005, 00008 | Locks the items in id order, validates stock, writes the order, its items, the stock movements and the payment |
| `register_payment_tx(jsonb)` | 00007 | Payments, including ticket book redemption, and marks the order paid |
| `close_cash_closure_tx` | 00005 | Locks the open register, totals payments and expenses, closes it |
| `sell_ticket_book_tx` | 00006 | The book plus the cash payment that funds the register |
| `deduct_stock` / `revert_stock` | 00005 | Move stock, log the `stock_adjustment`, flip `is_available` |
| `adjust_stock_tx` | 00009 | Manual stock correction, logged as MANUAL_ADD / MANUAL_REMOVE |
| `daily_stock_reset_tx` | 00009 | The morning load: sets each tracked item to the day's portions |
| `rotate_refresh_token_tx` | 00010 | Burns the presented refresh token, issues the new pair, and on reuse closes every session of that user. Returns a status instead of raising, because raising would roll back that very write |
| `blacklist_tokens_tx` | 00010 | Logout: burns the tokens handed back, or all of the user's |

They are `SECURITY DEFINER`, only `service_role` may execute them, and **the caller is responsible for the tenant checks before calling**. They raise errors as `CODE: message`; the Edge Function maps the code to an HTTP status (see `orders-create`).

When a function's body changes, replace it from a new migration with `CREATE OR REPLACE`; never edit an applied migration.

## 5. Business rules worth knowing

- **A lunch (corrientazo) is one order item**, the protein, priced `daily_menus.base_price + protein price`. The soup, principio, rice and drink are included and are not sent as items. The prices on those products are for selling them on their own.
- **Substitutions are free** (`is_substitution`, `price_at_order = 0`, `replaces_category_type`) and never apply to the protein, which sets the price. Paid additions use `is_extra`.
- **Ticket books:** money enters when the book is sold. Redeeming a lunch moves no cash, sits in the `TICKET_BOOK` bucket, and never counts towards the drawer. One lunch is one portion, one redemption per customer per day, several portions allowed in that one redemption.
- **The register:** each method is totalled on its own, delivery cash and nequi are shown apart, and the expected balance is `opening + cash − expenses`. Delivery cash is already inside the cash total; do not add it twice.
- **Categories carry a role** (`menu_categories.type`: SOUP, RICE, PRINCIPLE, PROTEIN, DRINK, EXTRA, SALAD, DESSERT, OTHER). The daily menu must resolve its slots by this type. Matching by name is what it used to do and it broke whenever a restaurant renamed a category. One category per role per restaurant, enforced by a partial unique index.
- **Days belong to the restaurant's time zone** (`_shared/time.ts`, default `America/Bogota`). The server runs in UTC, so `setHours(0,0,0,0)` is always wrong.
- **Enums are narrower than they look.** `OrderStatus` is OPEN, SENT_TO_CASHIER, PAID, CANCELLED. IN_KITCHEN, READY and DELIVERED belong to `OrderItemStatus`. `PaymentMethod` is CASH, NEQUI, TICKET_BOOK only.
- **Columns are not uniformly snake_case:** `orders."customerId"`, `daily_menus."isActive"`, `ticket_books."customerId"`, `daily_ticket_book_codes."customerId"` and `profiles."birthDate"` are quoted camelCase, inherited from Prisma. `menu_categories` has no `created_at` / `updated_at`.

## 6. Multi-tenancy

`restaurantId` travels in the JWT payload and is the tenant boundary. A SUPERADMIN may have no restaurant, and then sees everything; any other role without a restaurant is rejected. RLS policies exist in migration `00002` but do not apply, because the functions use the service role.

## 7. Git workflow

Branch per task → PR → `develop` → PR → `main`. Commits are prefixed (`feat:`, `fix:`, `chore:`) and **signed with an SSH key that asks for a passphrase**, so an agent cannot commit: leave the work staged and the message in `.git/<NAME>_COMMIT_MSG`, and let Nicolas run `git commit -F`.

Branches chain off each other when the work builds on itself; the last one carries the whole chain, so one PR is enough.

## 8. Language

Code, comments, commits and documentation in **English**. Conversation with Nicolas in **Spanish**, using "tú", never voseo. User-facing strings in the product are Spanish.

## 9. What is still missing

- `JWT_SECRET` is in the history of a public repo and has not been rotated.
- No per-role permissions inside a restaurant: a WAITER can close the register. `role_permissions` exists and is unused.
- Auth is still incomplete: `auth-forgot-password`, `auth-reset-password`, `auth-verify-email` and `auth-resend-verification` are called by the client and do not exist.
- Blacklisted access tokens are not checked on every request (that would be a database round trip per call), so logout takes effect for refreshes immediately and for the access token within its 30 minutes.
- Profile photo upload needs Supabase Storage.
- Analytics: menu engineering, predictions and heatmap are still on the legacy API.
- 58 functions is a lot of cold starts and duplicated boilerplate; grouping them by domain behind a router is the next architectural step, and it changes every client URL.
- Moving to Supabase Auth with a custom claims hook would remove the hand-rolled JWT and hashing, and would make the RLS policies real.
- `roles-list` has a pre-existing type error; input validation is hand-written (no Zod); `esm.sh` imports are not version-pinned; there are no tests for the functions.
