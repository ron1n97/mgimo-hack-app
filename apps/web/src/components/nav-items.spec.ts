import assert from "node:assert/strict";
import { isNavItemActive, navItemsForRole } from "./nav-items.ts";

assert.equal(navItemsForRole("student").length, 6);
assert.equal(navItemsForRole(null).length, 6);
assert.deepEqual(
  navItemsForRole("student").map((i) => i.href),
  ["/today", "/schedule", "/grades", "/requests", "/clubs", "/notifications"],
);
assert.deepEqual(
  navItemsForRole("teacher").map((i) => i.href),
  ["/teacher", "/today", "/notifications", "/profile"],
);
assert.deepEqual(
  navItemsForRole("staff").map((i) => i.href),
  ["/staff", "/staff/requests", "/staff/students", "/staff/clubs", "/profile"],
);
assert.deepEqual(
  navItemsForRole("admin").map((i) => i.href),
  ["/staff", "/admin", "/staff/requests", "/staff/clubs", "/profile"],
);
assert.equal(isNavItemActive("/grades", "/grades"), true);
assert.equal(isNavItemActive("/grades/extra", "/grades"), true);
assert.equal(isNavItemActive("/today", "/grades"), false);
assert.equal(isNavItemActive("/staff", "/staff"), true);
assert.equal(isNavItemActive("/staff/requests", "/staff"), false);

console.log("nav-items.spec.ts: ok");
