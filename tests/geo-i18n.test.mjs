import test from "node:test";
import assert from "node:assert/strict";
import { decideGeo, STOCK_PATHS } from "../src/lib/geo.ts";
import { pickLocale, formatPercent, formatUsd, formatNumber, t, SAFE_DEFAULTS } from "../src/lib/i18n.ts";

test("geo: sanctioned countries and regions are blocked; unknown is allowed and flagged", () => {
  for (const c of ["IR", "kp", "CU", "SY"]) assert.equal(decideGeo(c).action, "block");
  assert.equal(decideGeo("UA", "43").action, "block");
  assert.equal(decideGeo("UA", "30").action, "allow");
  assert.equal(decideGeo("ID").action, "allow");
  const u = decideGeo(null);
  assert.equal(u.action, "allow");
  assert.equal(u.country, null);
  assert.equal(decideGeo("XX").country, null);
  assert.ok(STOCK_PATHS.some(re => re.test("/markets/NVDA")));
  assert.ok(!STOCK_PATHS.some(re => re.test("/about")));
});

test("locale: the site is English only", () => {
  assert.equal(pickLocale("id", "id-ID,id;q=0.9"), "en");
  assert.equal(pickLocale(undefined, "fr-FR"), "en");
  assert.equal(formatNumber(1234.5, "en"), "1,234.5");
});

test("messages exist; safe defaults match the spec", () => {
  for (const key of ["disclaimer.body", "geo.blocked", "default.stop_loss", "default.capital"]) assert.ok(t("en", key).length > 10);
  assert.deepEqual(SAFE_DEFAULTS, { stop_loss_pct: 0.08, max_weight: 0.25, universe: "auto", initial_usd: 10_000, mode: "paper" });
});
