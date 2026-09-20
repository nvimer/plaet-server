import { assertEquals } from "jsr:@std/assert@1";
import { cors, error, json } from "./auth.ts";

// cors() used to rebuild the response with `{ ...res, headers }`. A Response keeps its
// status on the prototype, so nothing was copied and every error left as a 200.

Deno.test("cors keeps the status of an error response", () => {
  for (const status of [400, 401, 403, 404, 405, 409, 500]) {
    assertEquals(cors(error("nope", status)).status, status);
  }
});

Deno.test("cors keeps the status of a success response", () => {
  assertEquals(cors(json({ ok: true })).status, 200);
  assertEquals(cors(json({ ok: true }, 201)).status, 201);
});

Deno.test("cors keeps the body and adds the CORS headers", async () => {
  const res = cors(error("Unauthorized", 401));
  assertEquals((await res.json()).message, "Unauthorized");
  assertEquals(res.headers.get("Access-Control-Allow-Credentials"), "true");
  assertEquals(res.headers.has("Access-Control-Allow-Origin"), true);
});

Deno.test("cors lets a preflight through with a null body", () => {
  const res = cors(new Response(null, { status: 204 }));
  assertEquals(res.status, 204);
  assertEquals(res.body, null);
});
