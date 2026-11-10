import assert from "node:assert/strict";
import { isNavItemActive, navItemsForRole } from "./nav-items.ts";

assert.equal(navItemsForRole("student").length, 4);
assert.equal(navItemsForRole(null).length, 4);
assert.deepEqual(
  navItemsForRole("student").map((i) => i.href),
  ["/today", "/schedule", "/clubs", "/profile"],
);
assert.deepEqual(
  navItemsForRole("teacher").map((i) => i.href),
  ["/teacher", "/today", "/notifications", "/profile"],
);
assert.deepEqual(
  navItemsForRole("staff").map((i) => i.href),
  ["/staff/requests", "/today", "/notifications", "/profile"],
);
assert.deepEqual(
  navItemsForRole("admin").map((i) => i.href),
  ["/staff/requests", "/admin", "/notifications", "/profile"],
);
assert.equal(isNavItemActive("/grades", "/grades"), true);
assert.equal(isNavItemActive("/grades/extra", "/grades"), true);
assert.equal(isNavItemActive("/today", "/grades"), false);

console.log("nav-items.spec.ts: ok");
