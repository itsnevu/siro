import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerHooks } from "node:module";

// App code uses bundler-style extensionless imports ("./store"); resolve them to .ts for Node.
registerHooks({
  resolve(specifier, context, next) {
    try { return next(specifier, context); }
    catch (e) { if (e.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".")) return next(specifier + ".ts", context); throw e; }
  },
});

const dir = mkdtempSync(join(tmpdir(), "siro-roles-"));
process.env.SIRO_DATA_DIR = dir;
const A = "0x" + "a1".repeat(20), B = "0x" + "b2".repeat(20), C = "0x" + "c3".repeat(20), ADMIN = "0x" + "d4".repeat(20);
process.env.SIRO_ADMIN_ADDRESSES = ADMIN;
const { roleOf, requireRole, linkWallet, accountOf, walletsOf, audit, auditLog } = await import("../../src/lib/server/roles.ts");
const { db } = await import("../../src/lib/server/store.ts");
test.after(() => { globalThis.siroDatabase?.close(); rmSync(dir, { recursive: true, force: true }); });

test("roles: viewer without session, operator when signed in, admin only via allowlist", () => {
  assert.equal(roleOf(null), "viewer");
  assert.equal(roleOf(A), "operator");
  assert.equal(roleOf(ADMIN.toUpperCase().replace("0X", "0x")), "admin");
  assert.throws(() => requireRole(A, "admin"), /admin role/);
  assert.doesNotThrow(() => requireRole(ADMIN, "admin"));
  assert.throws(() => requireRole(null, "operator"));
});

test("one wallet, one account: linking works once and never steals a wallet", () => {
  assert.deepEqual(linkWallet(A, B), [A, B]);
  assert.equal(accountOf(B), A);
  assert.throws(() => linkWallet(C, B), /another account/);
  assert.throws(() => linkWallet(A, B), /already linked/);
  assert.throws(() => linkWallet(B, A), /primary/);
  assert.throws(() => linkWallet(C, A), /primary wallet of another account/);
  assert.deepEqual(walletsOf(accountOf(B)), [A, B]);
});

test("admin role carries over to the account of a linked wallet", () => {
  linkWallet(ADMIN, C);
  assert.equal(roleOf(C), "admin");
});

test("admin audit is append-only", () => {
  audit(ADMIN, "risk_policy", { max_weight: 0.2 }, { max_weight: 0.1 }, "tighten after review");
  assert.throws(() => audit(ADMIN, "risk_policy", 1, 2, "  "));
  assert.equal(auditLog()[0].reason, "tighten after review");
  assert.throws(() => db().prepare("UPDATE admin_audit SET reason='x'").run(), /append-only/);
  assert.throws(() => db().prepare("DELETE FROM admin_audit").run(), /append-only/);
});
