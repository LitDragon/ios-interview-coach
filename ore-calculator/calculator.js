export const ITEMS = Object.freeze({
  铜: Object.freeze({ quantityRatio: 1 }),
  银: Object.freeze({ quantityRatio: 0.4 }),
  金: Object.freeze({ quantityRatio: 0.2 }),
  铂金: Object.freeze({ quantityRatio: null })
});

export const DEFAULT_QUANTITY_OPTIONS = Object.freeze({
  copperCount: 355
});

const PLATINUM_DIVISOR = 21.2;
const EPSILON = 0.0000001;

function parsePositive(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new TypeError(`${label}必须大于 0`);
  }
  return number;
}

function parsePositiveInteger(value, label) {
  const number = parsePositive(value, label);
  if (!Number.isInteger(number)) {
    throw new TypeError(`${label}必须是整数`);
  }
  return number;
}

function readActualPrice(actualPrices, name) {
  if (!actualPrices || actualPrices[name] === undefined || actualPrices[name] === null || actualPrices[name] === "") {
    return null;
  }

  const number = Number(actualPrices[name]);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function roundQuantity(value) {
  return Math.max(1, Math.round(value));
}

export function resolveQuantities(quantityOptions = {}) {
  const copperCount = parsePositiveInteger(
    quantityOptions.copperCount ?? DEFAULT_QUANTITY_OPTIONS.copperCount,
    "铜数量"
  );
  const platinumInput = quantityOptions.platinumCount;
  const platinumCount = platinumInput === undefined || platinumInput === null || platinumInput === ""
    ? roundQuantity(copperCount / PLATINUM_DIVISOR)
    : parsePositiveInteger(platinumInput, "铂金数量");

  return {
    铜: copperCount,
    银: roundQuantity(copperCount * ITEMS.银.quantityRatio),
    金: roundQuantity(copperCount * ITEMS.金.quantityRatio),
    铂金: platinumCount
  };
}

export function calculateBalance(inputItem, inputPrice, actualPrices = {}, quantityOptions = {}) {
  if (!Object.prototype.hasOwnProperty.call(ITEMS, inputItem)) {
    throw new RangeError(`不支持的物品：${inputItem}`);
  }

  const knownPrice = parsePositive(inputPrice, "已知价格");
  const quantities = resolveQuantities(quantityOptions);
  const knownCount = quantities[inputItem];
  const baseCopperPrice = knownPrice * knownCount / quantities.铜;
  const rows = Object.fromEntries(
    Object.entries(ITEMS).map(([name]) => {
      const count = quantities[name];
      const theoreticalPrice = baseCopperPrice * quantities.铜 / count;
      const actualPrice = readActualPrice(actualPrices, name);
      const delta = actualPrice === null ? null : actualPrice - theoreticalPrice;
      let status = "unknown";

      if (delta !== null) {
        if (delta > EPSILON) status = "sell";
        else if (delta < -EPSILON) status = "buy";
        else status = "balanced";
      }

      return [name, {
        count,
        ratio: quantities.铜 / count,
        theoreticalPrice,
        unitPrice: theoreticalPrice / 100,
        bundleValue: theoreticalPrice * count / 100,
        actualPrice,
        delta,
        premiumRate: actualPrice === null ? null : actualPrice / theoreticalPrice - 1,
        status
      }];
    })
  );

  const comparedRows = Object.entries(rows).filter(([, row]) => row.actualPrice !== null);
  const bestSell = comparedRows
    .filter(([, row]) => row.status === "sell")
    .sort(([, a], [, b]) => b.premiumRate - a.premiumRate)[0]?.[0] ?? null;
  const bestBuy = comparedRows
    .filter(([, row]) => row.status === "buy")
    .sort(([, a], [, b]) => a.premiumRate - b.premiumRate)[0]?.[0] ?? null;

  return {
    inputItem,
    inputPrice: knownPrice,
    inputQuantity: knownCount,
    baseCopperPrice,
    quantities,
    rows,
    bestSell,
    bestBuy,
    comparedCount: comparedRows.length
  };
}
