import assert from "node:assert/strict";
import { calculateBalance, ITEMS } from "./calculator.js";

const copper = calculateBalance("铜", 0.4);
assert.deepEqual(ITEMS, {
  铜: { count: 220, ratio: 1 },
  银: { count: 88, ratio: 2.5 },
  金: { count: 44, ratio: 5 },
  铂金: { count: 10, ratio: 22 }
});
assert.equal(copper.rows.铜.theoreticalPrice, 0.4);
assert.equal(copper.rows.银.theoreticalPrice, 1);
assert.equal(copper.rows.金.theoreticalPrice, 2);
assert.equal(copper.rows.铂金.theoreticalPrice, 8.8);
assert.equal(copper.rows.铜.bundleValue, 0.88);
assert.equal(copper.rows.银.bundleValue, 0.88);
assert.equal(copper.rows.金.bundleValue, 0.88);
assert.equal(copper.rows.铂金.bundleValue, 0.88);

const fromGold = calculateBalance("金", 2);
assert.equal(fromGold.rows.铜.theoreticalPrice, 0.4);
assert.equal(fromGold.rows.铂金.theoreticalPrice, 8.8);

const compared = calculateBalance("铜", 0.4, {
  铜: 0.4,
  银: 1.2,
  金: 1.5,
  铂金: 7
});
assert.equal(compared.rows.银.status, "sell");
assert.equal(compared.rows.金.status, "buy");
assert.equal(compared.rows.铂金.status, "buy");

assert.throws(() => calculateBalance("钻石", 1), /不支持/);
assert.throws(() => calculateBalance("铜", 0), /大于 0/);

console.log("ORE_CALCULATOR_OK");
