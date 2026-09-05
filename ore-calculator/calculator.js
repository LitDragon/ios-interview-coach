export const ITEMS = Object.freeze({
  铜: Object.freeze({ count: 220, ratio: 1 }),
  银: Object.freeze({ count: 88, ratio: 2.5 }),
  金: Object.freeze({ count: 44, ratio: 5 }),
  铂金: Object.freeze({ count: 10, ratio: 22 })
});

const EPSILON = 0.0000001;

function parsePositive(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new TypeError(`${label}必须大于 0`);
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

export function calculateBalance(inputItem, inputPrice, actualPrices = {}) {
  if (!Object.prototype.hasOwnProperty.call(ITEMS, inputItem)) {
    throw new RangeError(`不支持的物品：${inputItem}`);
  }

  const knownPrice = parsePositive(inputPrice, "已知价格");
  const baseCopperPrice = knownPrice / ITEMS[inputItem].ratio;
  const rows = Object.fromEntries(
    Object.entries(ITEMS).map(([name, data]) => {
      const theoreticalPrice = baseCopperPrice * data.ratio;
      const actualPrice = readActualPrice(actualPrices, name);
      const delta = actualPrice === null ? null : actualPrice - theoreticalPrice;
      let status = "unknown";

      if (delta !== null) {
        if (delta > EPSILON) status = "sell";
        else if (delta < -EPSILON) status = "buy";
        else status = "balanced";
      }

      return [name, {
        count: data.count,
        ratio: data.ratio,
        theoreticalPrice,
        unitPrice: theoreticalPrice / 100,
        bundleValue: theoreticalPrice * data.count / 100,
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
    baseCopperPrice,
    rows,
    bestSell,
    bestBuy,
    comparedCount: comparedRows.length
  };
}
