// app/api/symbols/route.ts
import { NextResponse } from "next/server";

// 공통: Binance/Bybit/Bitget 스타일에서 tick/step 추출
function getStr(v: any) { return v === undefined || v === null ? undefined : String(v); }
function parseFilters(filters: any[]): { tickSize?: string; stepSize?: string } {
  let tickSize: string | undefined;
  let stepSize: string | undefined;
  for (const f of filters || []) {
    if ((f.filterType === "PRICE_FILTER" || f.filter === "price") && (f.tickSize || f.tick_size))
      tickSize = getStr(f.tickSize ?? f.tick_size);
    if ((f.filterType === "LOT_SIZE" || f.filter === "size") && (f.stepSize || f.step_size))
      stepSize = getStr(f.stepSize ?? f.step_size);
    if ((f.filterType === "MARKET_LOT_SIZE") && f.stepSize)
      stepSize = getStr(f.stepSize);
  }
  return { tickSize, stepSize };
}

/* ========== BINANCE ========== */
// SPOT
async function binanceSpot() {
  const r = await fetch("https://api.binance.com/api/v3/exchangeInfo", { cache: "no-store" });
  if (!r.ok) throw new Error(`Binance SPOT ${r.status}`);
  const j = await r.json();
  return (j?.symbols || [])
    .filter((s: any) => s?.status === "TRADING" && s?.quoteAsset?.toUpperCase() === "USDT")
    .map((s: any) => {
      const { tickSize, stepSize } = parseFilters(s.filters || []);
      return {
        symbol: String(s.symbol).toUpperCase(),
        baseAsset: String(s.baseAsset).toUpperCase(),
        quoteAsset: String(s.quoteAsset).toUpperCase(),
        tickSize, stepSize, exchange: "BINANCE", market: "spot" as const,
      };
    });
}
// USDT-M
async function binanceUsdtPerp() {
  const r = await fetch("https://fapi.binance.com/fapi/v1/exchangeInfo", { cache: "no-store" });
  if (!r.ok) throw new Error(`Binance USDT-M ${r.status}`);
  const j = await r.json();
  return (j?.symbols || [])
    .filter((s: any) => s?.status === "TRADING" && s?.contractType === "PERPETUAL" && s?.quoteAsset?.toUpperCase() === "USDT")
    .map((s: any) => {
      const { tickSize, stepSize } = parseFilters(s.filters || []);
      return {
        symbol: String(s.symbol).toUpperCase(),
        baseAsset: String(s.baseAsset).toUpperCase(),
        quoteAsset: String(s.quoteAsset).toUpperCase(),
        tickSize, stepSize, exchange: "BINANCE", market: "usdt_perp" as const,
      };
    });
}
// COIN-M
async function binanceCoinPerp() {
  const r = await fetch("https://dapi.binance.com/dapi/v1/exchangeInfo", { cache: "no-store" });
  if (!r.ok) throw new Error(`Binance COIN-M ${r.status}`);
  const j = await r.json();
  return (j?.symbols || [])
    .filter((s: any) => s?.contractStatus === "TRADING" && s?.contractType === "PERPETUAL")
    .map((s: any) => {
      const { tickSize, stepSize } = parseFilters(s.filters || []);
      return {
        symbol: String(s.symbol).toUpperCase(),       // BTCUSD_PERP 등
        baseAsset: String(s.baseAsset).toUpperCase(),
        quoteAsset: String(s.quoteAsset).toUpperCase(), // 보통 USD
        tickSize, stepSize, exchange: "BINANCE", market: "coin_perp" as const,
      };
    });
}

/* ========== BYBIT (v5) ========== */
// SPOT: USDT 쿼트만
async function bybitSpot() {
  const r = await fetch("https://api.bybit.com/v5/market/instruments-info?category=spot", { cache: "no-store" });
  if (!r.ok) throw new Error(`Bybit SPOT ${r.status}`);
  const j = await r.json();
  const list: any[] = j?.result?.list || [];
  return list
    .filter((x) => String(x?.quoteCoin).toUpperCase() === "USDT")
    .map((x) => ({
      symbol: String(x.symbol).toUpperCase().replace("/", ""), // BTCUSDT
      baseAsset: String(x.baseCoin).toUpperCase(),
      quoteAsset: String(x.quoteCoin).toUpperCase(),
      tickSize: getStr(x?.priceFilter?.tickSize),
      stepSize: getStr(x?.lotSizeFilter?.basePrecision ?? x?.lotSizeFilter?.minOrderQty),
      exchange: "BYBIT", market: "spot" as const,
    }));
}
// 선물 Linear(USDT)
async function bybitLinear() {
  const r = await fetch("https://api.bybit.com/v5/market/instruments-info?category=linear", { cache: "no-store" });
  if (!r.ok) throw new Error(`Bybit LINEAR ${r.status}`);
  const j = await r.json();
  const list: any[] = j?.result?.list || [];
  return list
    .filter((x) => String(x?.quoteCoin).toUpperCase() === "USDT" && String(x?.status).toUpperCase() === "TRADING")
    .map((x) => ({
      symbol: String(x.symbol).toUpperCase().replace("/", ""), // BTCUSDT
      baseAsset: String(x.baseCoin).toUpperCase(),
      quoteAsset: String(x.quoteCoin).toUpperCase(),
      tickSize: getStr(x?.priceFilter?.tickSize),
      stepSize: getStr(x?.lotSizeFilter?.qtyStep),
      exchange: "BYBIT", market: "linear" as const,
    }));
}
// 선물 Inverse(COIN)
async function bybitInverse() {
  const r = await fetch("https://api.bybit.com/v5/market/instruments-info?category=inverse", { cache: "no-store" });
  if (!r.ok) throw new Error(`Bybit INVERSE ${r.status}`);
  const j = await r.json();
  const list: any[] = j?.result?.list || [];
  return list
    .filter((x) => String(x?.status).toUpperCase() === "TRADING")
    .map((x) => ({
      symbol: String(x.symbol).toUpperCase().replace("/", ""), // BTCUSD
      baseAsset: String(x.baseCoin).toUpperCase(),
      quoteAsset: String(x.quoteCoin).toUpperCase(), // 보통 USD
      tickSize: getStr(x?.priceFilter?.tickSize),
      stepSize: getStr(x?.lotSizeFilter?.qtyStep),
      exchange: "BYBIT", market: "inverse" as const,
    }));
}

/* ========== BITGET ========== */
// SPOT (USDT 쿼트)
async function bitgetSpot() {
  const r = await fetch("https://api.bitget.com/api/v2/spot/public/symbols", { cache: "no-store" });
  if (!r.ok) throw new Error(`Bitget SPOT ${r.status}`);
  const j = await r.json();
  const list: any[] = j?.data || [];
  return list
    .filter((x) => String(x?.quoteCoin).toUpperCase() === "USDT")
    .map((x) => ({
      symbol: String(x.symbol).toUpperCase().replace("-", ""), // BTCUSDT
      baseAsset: String(x.baseCoin).toUpperCase(),
      quoteAsset: String(x.quoteCoin).toUpperCase(),
      tickSize: getStr(x?.pricePlace), // 자리수 기반, 참고용
      stepSize: getStr(x?.sizePlace),
      exchange: "BITGET", market: "spot" as const,
    }));
}
// Futures Linear(USDT) = umcbl, Inverse(COIN) = dmcbl
async function bitgetLinear() {
  const r = await fetch("https://api.bitget.com/api/v2/mix/market/contracts?productType=umcbl", { cache: "no-store" });
  if (!r.ok) throw new Error(`Bitget LINEAR ${r.status}`);
  const j = await r.json();
  const list: any[] = j?.data || [];
  return list
    .filter((x) => String(x?.symbol))
    .map((x) => ({
      symbol: String(x.symbol).toUpperCase().replace("_UMCBL", "USDT"), // BTCUSDT (표준화)
      baseAsset: String(x.baseCoin).toUpperCase(),
      quoteAsset: "USDT",
      tickSize: getStr(x?.priceEndStep),
      stepSize: getStr(x?.sizeMultiplier ?? x?.sizeEndStep),
      exchange: "BITGET", market: "linear" as const,
    }));
}
async function bitgetInverse() {
  const r = await fetch("https://api.bitget.com/api/v2/mix/market/contracts?productType=dmcbl", { cache: "no-store" });
  if (!r.ok) throw new Error(`Bitget INVERSE ${r.status}`);
  const j = await r.json();
  const list: any[] = j?.data || [];
  return list
    .filter((x) => String(x?.symbol))
    .map((x) => ({
      symbol: String(x.symbol).toUpperCase().replace("_DMCBL", "USD"), // BTCUSD (표준화)
      baseAsset: String(x.baseCoin).toUpperCase(),
      quoteAsset: "USD",
      tickSize: getStr(x?.priceEndStep),
      stepSize: getStr(x?.sizeMultiplier ?? x?.sizeEndStep),
      exchange: "BITGET", market: "inverse" as const,
    }));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const exchange = (url.searchParams.get("exchange") || "BINANCE").toUpperCase();
    const market = (url.searchParams.get("market") || "spot").toLowerCase();

    let items: any[] = [];
    if (exchange === "BINANCE") {
      if (market === "spot") items = await binanceSpot();
      else if (market === "usdt_perp") items = await binanceUsdtPerp();
      else if (market === "coin_perp") items = await binanceCoinPerp();
      else items = await binanceSpot();
    } else if (exchange === "BYBIT") {
      if (market === "spot") items = await bybitSpot();
      else if (market === "linear") items = await bybitLinear();
      else if (market === "inverse") items = await bybitInverse();
      else items = await bybitSpot();
    } else if (exchange === "BITGET") {
      if (market === "spot") items = await bitgetSpot();
      else if (market === "linear") items = await bitgetLinear();
      else if (market === "inverse") items = await bitgetInverse();
      else items = await bitgetSpot();
    } else {
      items = await binanceSpot();
    }

    return NextResponse.json({ ok: true, exchange, market, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e), items: [] }, { status: 500 });
  }
}



