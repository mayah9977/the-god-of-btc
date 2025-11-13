import { NextResponse } from "next/server";

type Stats = {
  lastPrice?: string;
  /** 거래대금(USDT/QUOTE) */
  amount24h?: string;
  /** 체결량(베이스 수량) */
  volume24h?: string;
  fundingRate?: string;
  openInterest?: string;
};

const toKey = (s: string) => s.toUpperCase();
const s = (v: any) => (v === undefined || v === null ? undefined : String(v));

/* BINANCE */
async function binanceSummary(market: string): Promise<Record<string, Stats>> {
  const out: Record<string, Stats> = {};
  try {
    if (market === "spot") {
      const r = await fetch("https://api.binance.com/api/v3/ticker/24hr", { cache: "no-store" });
      const arr: any[] = await r.json();
      for (const t of arr) {
        const sym = toKey(t.symbol || "");
        if (!sym.endsWith("USDT")) continue;
        out[sym] = {
          lastPrice: s(t.lastPrice),
          amount24h: s(t.quoteVolume), // 거래대금
          volume24h: s(t.volume),      // 체결량(베이스)
        };
      }
    } else if (market === "usdt_perp") {
      const r = await fetch("https://fapi.binance.com/fapi/v1/ticker/24hr", { cache: "no-store" });
      const arr: any[] = await r.json();
      for (const t of arr) {
        const sym = toKey(t.symbol || "");
        out[sym] = {
          lastPrice: s(t.lastPrice),
          amount24h: s(t.quoteVolume),
          volume24h: s(t.volume),
        };
      }
      // 펀딩
      try {
        const fr = await fetch("https://fapi.binance.com/fapi/v1/premiumIndex", { cache: "no-store" });
        const fArr: any[] = await fr.json();
        for (const f of fArr) {
          const sym = toKey(f.symbol || "");
          if (!out[sym]) out[sym] = {};
          out[sym].fundingRate = s(f.lastFundingRate);
        }
      } catch {}
    } else if (market === "coin_perp") {
      const r = await fetch("https://dapi.binance.com/dapi/v1/ticker/24hr", { cache: "no-store" });
      const arr: any[] = await r.json();
      for (const t of arr) {
        const sym = toKey(t.symbol || "");
        out[sym] = {
          lastPrice: s(t.lastPrice),
          amount24h: s(t.quoteVolume),
          volume24h: s(t.volume),
        };
      }
      try {
        const fr = await fetch("https://dapi.binance.com/dapi/v1/premiumIndex", { cache: "no-store" });
        const fArr: any[] = await fr.json();
        for (const f of fArr) {
          const sym = toKey(f.symbol || "");
          if (!out[sym]) out[sym] = {};
          out[sym].fundingRate = s(f.lastFundingRate);
        }
      } catch {}
    }
  } catch {}
  return out;
}

/* BYBIT (v5) */
async function bybitSummary(market: string): Promise<Record<string, Stats>> {
  const out: Record<string, Stats> = {};
  try {
    const category = market === "linear" ? "linear" : market === "inverse" ? "inverse" : "spot";
    const r = await fetch(`https://api.bybit.com/v5/market/tickers?category=${category}`, { cache: "no-store" });
    const j = await r.json();
    const list: any[] = j?.result?.list || [];
    for (const t of list) {
      const sym = toKey(String(t.symbol).replace("/", ""));
      out[sym] = {
        lastPrice: s(t.lastPrice),
        amount24h: s(t.turnover24h ?? t.turnover), // 거래대금
        volume24h: s(t.volume24h ?? t.volume),     // 체결량
        fundingRate: s(t.fundingRate),
        openInterest: s(t.openInterestValue ?? t.openInterest),
      };
    }
  } catch {}
  return out;
}

/* BITGET */
async function bitgetSummary(market: string): Promise<Record<string, Stats>> {
  const out: Record<string, Stats> = {};
  try {
    if (market === "spot") {
      const r = await fetch("https://api.bitget.com/api/v2/spot/market/tickers", { cache: "no-store" });
      const j = await r.json();
      const arr: any[] = j?.data || [];
      for (const t of arr) {
        const sym = toKey(String(t.symbol).replace("-", "")); // BTCUSDT
        out[sym] = {
          lastPrice: s(t.close),
          amount24h: s(t.quoteVol), // 거래대금
          volume24h: s(t.baseVol),  // 체결량
        };
      }
    } else {
      const productType = market === "linear" ? "umcbl" : "dmcbl";
      const r = await fetch(`https://api.bitget.com/api/v2/mix/market/tickers?productType=${productType}`, { cache: "no-store" });
      const j = await r.json();
      const arr: any[] = j?.data || [];
      for (const t of arr) {
        const raw = String(t.symbol).toUpperCase();
        const std = productType === "umcbl" ? raw.replace("_UMCBL", "") : raw.replace("_DMCBL", "");
        out[std] = {
          lastPrice: s(t.close),
          amount24h: s(t.usdtVol ?? t.quoteVol ?? t.turnover), // 거래대금
          volume24h: s(t.baseVol),
          fundingRate: s(t.fundingRate),
          openInterest: s(t.holdAmount ?? t.openInterest),
        };
      }
    }
  } catch {}
  return out;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const exchange = (url.searchParams.get("exchange") || "BINANCE").toUpperCase();
    const market = (url.searchParams.get("market") || "spot").toLowerCase();

    let map: Record<string, Stats> = {};
    if (exchange === "BINANCE") map = await binanceSummary(market);
    else if (exchange === "BYBIT") map = await bybitSummary(market);
    else if (exchange === "BITGET") map = await bitgetSummary(market);

    return NextResponse.json({ ok: true, exchange, market, map });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e), map: {} }, { status: 500 });
  }
}

