import assert from "node:assert/strict";
import { calculateBalance, ITEMS, resolveQuantities } from "./calculator.js";

assert.deepEqual(ITEMS, {
  铜: { quantityRatio: 1 },
  银: { quantityRatio: 0.4 },
  金: { quantityRatio: 0.2 },
  铂金: { quantityRatio: null }
});

const legacySized = resolveQuantities({ copperCount: 220 });
assert.deepEqual(legacySized, { 铜: 220, 银: 88, 金: 44, 铂金: 10 });

const copper = calculateBalance("铜", 0.4, {}, { copperCount: 220 });
assert.equal(copper.rows.铜.theoreticalPrice, 0.4);
assert.equal(copper.rows.银.theoreticalPrice, 1);
assert.equal(copper.rows.金.theoreticalPrice, 2);
assert.equal(copper.rows.铂金.theoreticalPrice, 8.8);
assert.equal(copper.rows.铜.bundleValue, 0.88);
assert.equal(copper.rows.银.bundleValue, 0.88);
assert.equal(copper.rows.金.bundleValue, 0.88);
assert.equal(copper.rows.铂金.bundleValue, 0.88);

const fromGold = calculateBalance("金", 2, {}, { copperCount: 220 });
assert.equal(fromGold.rows.铜.theoreticalPrice, 0.4);
assert.equal(fromGold.rows.铂金.theoreticalPrice, 8.8);

const variableQuantities = calculateBalance("银", 10, {}, {
  copperCount: 355
});
assert.equal(variableQuantities.rows.铜.count, 355);
assert.equal(variableQuantities.rows.银.count, 142);
assert.equal(variableQuantities.rows.金.count, 71);
assert.equal(variableQuantities.rows.铂金.count, 17);
assert.equal(variableQuantities.rows.铜.theoreticalPrice, 4);
assert.equal(variableQuantities.rows.金.theoreticalPrice, 20);
assert.equal(variableQuantities.rows.铂金.theoreticalPrice, 1420 / 17);
assert.equal(variableQuantities.rows.铜.bundleValue, 14.2);
assert.equal(variableQuantities.rows.铂金.bundleValue, 14.2);

const manuallySized = resolveQuantities({ copperCount: 355, platinumCount: 11 });
assert.equal(manuallySized.铂金, 11);

assert.equal(resolveQuantities({ copperCount: 310 }).铂金, 14);
assert.equal(resolveQuantities({ copperCount: 330 }).铂金, 15);
assert.equal(resolveQuantities({ copperCount: 355 }).铂金, 17);
assert.equal(resolveQuantities({ copperCount: 375 }).铂金, 19);

const compared = calculateBalance("银", 10, {
  铜: 3,
  银: 10.5,
  金: 20,
  铂金: 90
}, { copperCount: 355 });
assert.equal(compared.rows.铜.status, "buy");
assert.equal(compared.rows.银.status, "sell");
assert.equal(compared.rows.金.status, "balanced");
assert.equal(compared.rows.铂金.status, "sell");
assert.equal(compared.bestBuy, "铜");
assert.equal(compared.bestSell, "铂金");

assert.throws(() => calculateBalance("钻石", 1), /不支持/);
assert.throws(() => calculateBalance("铜", 0), /大于 0/);
assert.throws(() => resolveQuantities({ copperCount: 355.5 }), /必须是整数/);

console.log("ORE_CALCULATOR_OK");
