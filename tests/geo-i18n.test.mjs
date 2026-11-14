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

test("locale: cookie wins, then Accept-Language; Indonesian and English formats differ", () => {
  assert.equal(pickLocale("en", "id-ID,id;q=0.9"), "en");
  assert.equal(pickLocale(undefined, "id-ID,id;q=0.9,en;q=0.8"), "id");
  assert.equal(pickLocale(undefined, "fr-FR"), "en");
  assert.equal(pickLocale("xx", null), "en");
  assert.equal(formatNumber(1234.5, "id"), "1.234,5");
  assert.equal(formatNumber(1234.5, "en"), "1,234.5");
  assert.match(formatPercent(0.0825, "id"), /8,25\s?%/);
  assert.match(formatUsd(10000, "id"), /10\.000/);
});

test("every message exists in both languages; safe defaults match the spec", () => {
  for (const key of ["disclaimer.body", "geo.blocked", "default.stop_loss", "default.capital"]) {
    assert.ok(t("en", key).length > 10);
    assert.ok(t("id", key).length > 10);
    assert.notEqual(t("en", key), t("id", key));
  }
  assert.deepEqual(SAFE_DEFAULTS, { stop_loss_pct: 0.08, max_weight: 0.25, universe: "auto", initial_usd: 10_000, mode: "paper" });
});
