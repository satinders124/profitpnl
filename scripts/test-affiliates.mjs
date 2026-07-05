import assert from "node:assert/strict";
import {
  normalizeCouponCode,
  normalizeSlug,
  parseCookieHeader,
  maskEmail,
  cents,
  formatMoney,
} from "../lib/affiliates.ts";

assert.equal(normalizeCouponCode(" tom 20! "), "TOM20");
assert.equal(normalizeSlug(" Trader Tom!! "), "trader-tom");
assert.deepEqual(parseCookieHeader("ppnl_ref=tom; ppnl_coupon=TOM20"), {
  ppnl_ref: "tom",
  ppnl_coupon: "TOM20",
});
assert.equal(maskEmail("johnny@example.com"), "jo****@example.com");
assert.equal(cents(1520.4), 1520);
assert.equal(formatMoney(1520, "usd"), "$15.20");

console.log("Affiliate helper tests passed.");
