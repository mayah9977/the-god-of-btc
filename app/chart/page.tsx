"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

/* ---------- Types ---------- */
type MarketUnified = "spot" | "linear" | "inverse";
type Exchange = "BINANCE" | "BYBIT" | "BITGET";

type SymbolItem = {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  tickSize?: string;
  stepSize?: string;
  exchange: Exchange;
  market: string;
};

type Stats = {
  lastPrice?: string;
  amount24h?: string; // 거래대금(QUOTE)
  volume24h?: string; // 체결량(베이스)
  fundingRate?: string;
  openInterest?: string;
};

type TF = "1m"|"15m"|"30m"|"1h"|"2h"|"3h"|"4h"|"1d"|"1W";

/* ---------- Const ---------- */
const TF_MAP: Record<string,string> = { "1m":"1","15m":"15","30m":"30","1h":"60","2h":"120","3h":"180","4h":"240","1d":"D","1W":"W" };
const TF_ORDER: TF[] = ["1m","15m","30m","1h","2h","3h","4h","1d","1W"];

const keySymbols = (ex: string, mk: string)=> `symbols_${ex}_${mk}`;
const keySummary = (ex: string, mk: string)=> `summary_${ex}_${mk}`;
const keyFavs    = (ex: string, mk: string)=> `favs_${ex}_${mk}`;

const s = (v:any)=> v===undefined||v===null? undefined: String(v);
const toNum = (v:any)=> { const n = Number(v); return isFinite(n) ? n : undefined; };

/* ---------- Utils ---------- */
function toApiMarket(exchange: Exchange, uiMarket: MarketUnified): string {
  if (exchange === "BINANCE") {
    if (uiMarket === "spot") return "spot";
    if (uiMarket === "linear") return "usdt_perp";
    return "coin_perp";
  }
  return uiMarket;
}
function toTVSymbol(item: SymbolItem) {
  const ex = item.exchange.toUpperCase();
  if (item.exchange === "BINANCE" && item.market !== "spot") {
    return `${ex}:${item.symbol.replace("_PERP","")}.P`;
  }
  return `${ex}:${item.symbol}`;
}
function loadJSON<T>(k:string, fb:T):T { try{ const v=localStorage.getItem(k); return v? JSON.parse(v) as T : fb; }catch{return fb;} }
function saveJSON<T>(k:string, v:T){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} }

function decimalsFromTick(tick?: string) {
  if (!tick) return 4;
  if (!tick.includes(".")) return 0;
  return tick.split(".")[1].replace(/0+$/,"").length || tick.split(".")[1].length;
}
function fmtPriceByTick(val?: string|number, tick?: string) {
  const n = toNum(val); if (n===undefined) return "-";
  const dec = decimalsFromTick(tick);
  return n.toFixed(Math.min(8, Math.max(0, dec)));
}
function fmtFunding(val?: string|number) {
  const n = toNum(val); if (n===undefined) return "-";
  const pct = Math.abs(n) < 1 ? n * 100 : n;
  return `${pct.toFixed(4)}%`;
}
function fmtAbbrev(val?: string|number) {
  const n = toNum(val); if (n===undefined) return "-";
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n/1e12).toFixed(2)+"T";
  if (abs >= 1e9)  return (n/1e9 ).toFixed(2)+"B";
  if (abs >= 1e6)  return (n/1e6 ).toFixed(2)+"M";
  if (abs >= 1e3)  return (n/1e3 ).toFixed(2)+"K";
  return n.toFixed(2);
}
function toneFor(m:string){
  if (m==="spot") return "green";
  if (m==="linear" || m==="usdt_perp") return "blue";
  return "violet";
}

/* ---------- Component ---------- */
export default function ChartPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialExchange = (sp.get("exchange")?.toUpperCase() as Exchange) || "BINANCE";
  const initialUiMarket: MarketUnified =
    (sp.get("market") as MarketUnified) || (initialExchange==="BINANCE" ? "spot" : "linear");
  const initialSymbol = (sp.get("symbol") || "BTCUSDT").toUpperCase();
  const initialTf = (sp.get("tf") as TF) || "1h";

  const [exchange, setExchange] = useState<Exchange>(initialExchange);
  const [uiMarket, setUiMarket] = useState<MarketUnified>(initialUiMarket);
  const [tf, setTf] = useState<TF>(initialTf);

  const [symbols, setSymbols] = useState<SymbolItem[]>([]);
  const [loadingSymbols, setLoadingSymbols] = useState(true);

  const [summary, setSummary] = useState<Record<string, Stats>>({});
  const [loadingSummary, setLoadingSummary] = useState(false);

  const apiMarket = toApiMarket(exchange, uiMarket);

  const [symbolInput, setSymbolInput] = useState(initialSymbol);
  const [selected, setSelected] = useState<SymbolItem>({
    symbol: initialSymbol,
    baseAsset: initialSymbol.replace(/USDT|USD/i, ""),
    quoteAsset: initialSymbol.endsWith("USD") ? "USD" : "USDT",
    exchange,
    market: apiMarket,
  });

  // favorites
  const [favs, setFavs] = useState<string[]>([]);
  useEffect(()=>{
    setFavs(loadJSON<string[]>(keyFavs(exchange, apiMarket), []));
  }, [exchange, apiMarket]);
  function toggleFav(sym: string) {
    setFavs(prev=>{
      const set = new Set(prev);
      set.has(sym) ? set.delete(sym) : set.add(sym);
      const out = Array.from(set);
      saveJSON(keyFavs(exchange, apiMarket), out);
      return out;
    });
  }

  function setQuery(q: Partial<{symbol:string; tf:TF; exchange:Exchange; market:MarketUnified }>) {
    const params = new URLSearchParams(sp.toString());
    if (q.symbol) params.set("symbol", q.symbol);
    if (q.tf) params.set("tf", q.tf);
    if (q.exchange) params.set("exchange", q.exchange);
    if (q.market) params.set("market", q.market);
    router.replace(`${pathname}?${params.toString()}`);
  }

  /* -- symbols (3h cache) -- */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingSymbols(true);
      const cacheKey = keySymbols(exchange, apiMarket);
      const cached = loadJSON<{at:number; list:SymbolItem[]} | null>(cacheKey, null);
      const now = Date.now();
      if (cached && now - cached.at < 3*60*60*1000 && cached.list?.length) {
        setSymbols(cached.list);
        setLoadingSymbols(false);
      } else {
        try{
          const r = await fetch(`/api/symbols?exchange=${exchange}&market=${apiMarket}`, { cache:"no-store" });
          const j = await r.json();
          const list: SymbolItem[] = j?.items || [];
          if (!cancelled) {
            setSymbols(list);
            setLoadingSymbols(false);
            saveJSON(cacheKey, { at: now, list });
          }
        }catch{
          if(!cancelled){ setSymbols([]); setLoadingSymbols(false); }
        }
      }
    }
    load();
    return ()=>{ cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exchange, uiMarket]);

  /* -- summary (60s cache) -- */
  async function ensureSummary() {
    const cacheKey = keySummary(exchange, apiMarket);
    const cached = loadJSON<{at:number; map:Record<string,Stats>} | null>(cacheKey, null);
    const now = Date.now();
    if (cached && now - cached.at < 60*1000) {
      setSummary(cached.map);
      return;
    }
    try{
      setLoadingSummary(true);
      const r = await fetch(`/api/summary?exchange=${exchange}&market=${apiMarket}`, { cache:"no-store" });
      const j = await r.json();
      const map: Record<string, Stats> = j?.map || {};
      setSummary(map);
      setLoadingSummary(false);
      saveJSON(cacheKey, { at: now, map });
    }catch{
      setLoadingSummary(false);
    }
  }

  /* -- Suggest box -- */
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestList, setSuggestList] = useState<SymbolItem[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  type SortKey = "default" | "amount_desc" | "volume_desc" | "funding_abs_desc" | "price_desc";
  type FilterKey = "all" | "favorites" | "top20";
  const [sortKey, setSortKey] = useState<SortKey>("amount_desc"); // 기본: 거래대금 ↓
  const [filterKey, setFilterKey] = useState<FilterKey>("all");

  function buildSuggest() {
    const q = symbolInput.toUpperCase().trim();
    let pool = q ? symbols.filter((it)=> it.symbol.includes(q)) : symbols.slice();

    // 필터
    if (filterKey === "favorites") {
      const favSet = new Set(favs);
      pool = pool.filter(it => favSet.has(it.symbol));
    }
    if (filterKey === "top20") {
      if (!Object.keys(summary).length) ensureSummary();
      pool.sort((a,b)=>{
        const aa = toNum(summary[a.symbol]?.amount24h) ?? 0;
        const bb = toNum(summary[b.symbol]?.amount24h) ?? 0;
        return bb - aa;
      });
      pool = pool.slice(0, 20);
    }

    // 정렬
    if (sortKey === "amount_desc") {
      pool.sort((a,b)=>{
        const aa = toNum(summary[a.symbol]?.amount24h) ?? -Infinity;
        const bb = toNum(summary[b.symbol]?.amount24h) ?? -Infinity;
        return bb - aa;
      });
    } else if (sortKey === "volume_desc") {
      pool.sort((a,b)=>{
        const aa = toNum(summary[a.symbol]?.volume24h) ?? -Infinity;
        const bb = toNum(summary[b.symbol]?.volume24h) ?? -Infinity;
        return bb - aa;
      });
    } else if (sortKey === "funding_abs_desc") {
      pool.sort((a,b)=>{
        const fa = toNum(summary[a.symbol]?.fundingRate);
        const fb = toNum(summary[b.symbol]?.fundingRate);
        const aa = fa===undefined ? -Infinity : Math.abs(fa < 1 ? fa*100 : fa);
        const bb = fb===undefined ? -Infinity : Math.abs(fb < 1 ? fb*100 : fb);
        return bb - aa;
      });
    } else if (sortKey === "price_desc") {
      pool.sort((a,b)=>{
        const pa = toNum(summary[a.symbol]?.lastPrice) ?? -Infinity;
        const pb = toNum(summary[b.symbol]?.lastPrice) ?? -Infinity;
        return pb - pa;
      });
    }

    setSuggestList(pool.slice(0, 150));
    setActiveIdx(pool.length ? 0 : -1);
  }

  function openSuggest() {
    buildSuggest();
    setSuggestOpen(true);
    if (!Object.keys(summary).length) ensureSummary();
  }
  function closeSuggest() { setSuggestOpen(false); setActiveIdx(-1); }

  function applyItem(it: SymbolItem) {
    setSelected(it);
    setSymbolInput(it.symbol);
    setQuery({ symbol: it.symbol, exchange, market: uiMarket });
    closeSuggest();
  }
  function applyByText() {
    const sym = symbolInput.toUpperCase().replace(/\s+/g,"");
    applyItem(symbols.find((x)=> x.symbol===sym) || selected);
  }

  /* -- TV URL -- */
  const tvSymbol = useMemo(()=> toTVSymbol(selected), [selected]);
  const tvSrc = useMemo(()=>{
    const p = new URLSearchParams({
      symbol: tvSymbol,
      interval: TF_MAP[tf],
      theme: "dark",
      style: "1",
      locale: "kr",
      hide_side_toolbar: "false",
      enable_publishing: "false",
      allow_symbol_change: "true",
      isTransparent: "false",
      hide_top_toolbar: "false",
    });
    return `https://s.tradingview.com/widgetembed/?${p.toString()}`;
  }, [tvSymbol, tf]);

  /* -- Hotkeys -- */
  useEffect(() => {
    function onKey(e: KeyboardEvent){
      const typing = document.activeElement===inputRef.current;
      if (e.key==="/") { e.preventDefault(); inputRef.current?.focus(); openSuggest(); return; }
      if (suggestOpen) {
        if (e.key==="Escape") { e.preventDefault(); closeSuggest(); return; }
        if (e.key==="ArrowDown") { e.preventDefault(); setActiveIdx(i=> (i+1)%(suggestList.length||1)); return; }
        if (e.key==="ArrowUp")   { e.preventDefault(); setActiveIdx(i=> (i-1+(suggestList.length||1))%(suggestList.length||1)); return; }
        if (e.key==="Enter") { e.preventDefault(); activeIdx>=0? applyItem(suggestList[activeIdx]) : applyByText(); return; }
      }
      if (typing && e.key==="Enter") { e.preventDefault(); applyByText(); closeSuggest(); (document.activeElement as HTMLElement)?.blur(); return; }
      if (!typing) {
        const m:Record<string,TF> = {"1":"1m","2":"15m","3":"30m","4":"1h","5":"2h","6":"3h","7":"4h","8":"1d","9":"1W"};
        const ntf = m[e.key]; if (ntf) { setTf(ntf); setQuery({ tf: ntf }); return; }
        if (e.key==="ArrowUp" || e.key==="ArrowDown") {
          e.preventDefault();
          const idx = TF_ORDER.indexOf(tf);
          const nidx = e.key==="ArrowUp" ? (idx-1+TF_ORDER.length)%TF_ORDER.length : (idx+1)%TF_ORDER.length;
          setTf(TF_ORDER[nidx]); setQuery({ tf: TF_ORDER[nidx] });
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return ()=> window.removeEventListener("keydown", onKey);
  }, [suggestOpen, suggestList, activeIdx, tf]);

  /* -- UI -- */
  const btn = (a:boolean)=> `rounded-md border px-3 py-1 text-sm ${a? "bg-gray-200 text-black border-gray-300":"hover:bg-gray-50 border-gray-300"}`;
  const Badge = ({children, tone="neutral"}:{children:React.ReactNode; tone?:"neutral"|"green"|"blue"|"violet"})=>{
    const cls = { neutral:"bg-gray-700/70 text-gray-100", green:"bg-green-600/70 text-white", blue:"bg-blue-600/70 text-white", violet:"bg-violet-600/70 text-white" }[tone];
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{children}</span>;
  };

  return (
    <main className="w-screen h-screen bg-black text-white">
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center gap-2">
        <button onClick={()=>router.back()} className="rounded-md border border-neutral-700 bg-neutral-900/70 px-3 py-1 text-sm hover:bg-neutral-800">← 돌아가기</button>

        <select
          value={exchange}
          onChange={(e)=>{ const ex=e.target.value as Exchange; setExchange(ex); setQuery({ exchange: ex }); }}
          className="rounded-md border border-neutral-700 bg-neutral-900/70 px-2 py-1 text-sm"
        >
          <option value="BINANCE">BINANCE</option>
          <option value="BYBIT">BYBIT</option>
          <option value="BITGET">BITGET</option>
        </select>

        <select
          value={uiMarket}
          onChange={(e)=>{ const m=e.target.value as MarketUnified; setUiMarket(m); setQuery({ market: m }); }}
          className="rounded-md border border-neutral-700 bg-neutral-900/70 px-2 py-1 text-sm"
        >
          <option value="spot">SPOT</option>
          <option value="linear">LINEAR (USDT)</option>
          <option value="inverse">INVERSE (COIN)</option>
        </select>

        <div className="relative">
          <input
            ref={inputRef}
            value={symbolInput}
            onChange={(e)=>{ setSymbolInput(e.target.value); setTimeout(()=>openSuggest(),0); }}
            onFocus={()=>openSuggest()}
            onBlur={()=> setTimeout(()=>closeSuggest(), 120)}
            placeholder={loadingSymbols? "심볼 불러오는 중…" : "심볼 입력 (예: BTCUSDT / BTCUSD)"}
            className="rounded-md border border-neutral-700 bg-neutral-900/70 px-3 py-1 text-sm placeholder-gray-400"
          />

          {suggestOpen && (
            <div className="absolute z-20 mt-1 w-[680px] max-h-[70vh] overflow-auto rounded-md border border-neutral-700 bg-neutral-900/95 text-sm shadow-lg">
              <div className="sticky top-0 z-10 flex items-center gap-2 bg-neutral-900/95 px-3 py-2 border-b border-neutral-700">
                <select
                  value={filterKey}
                  onChange={(e)=>{ setFilterKey(e.target.value as any); setTimeout(()=>buildSuggest(),0); }}
                  className="rounded-md border border-neutral-700 bg-neutral-900/70 px-2 py-1 text-xs"
                >
                  <option value="all">All</option>
                  <option value="favorites">Favorites</option>
                  <option value="top20">Top 20 by Amount</option>
                </select>
                <select
                  value={sortKey}
                  onChange={(e)=>{ setSortKey(e.target.value as any); setTimeout(()=>buildSuggest(),0); }}
                  className="rounded-md border border-neutral-700 bg-neutral-900/70 px-2 py-1 text-xs"
                >
                  <option value="amount_desc">Amount ↓</option>
                  <option value="volume_desc">Volume ↓</option>
                  <option value="funding_abs_desc">|Funding| ↓</option>
                  <option value="price_desc">Price ↓</option>
                  <option value="default">Default</option>
                </select>
                <span className="ml-auto text-[11px] text-neutral-400">
                  Tip: ★ 즐겨찾기 / / 입력, Enter 적용
                </span>
              </div>

              {suggestList.map((it,i)=>{
                const st = summary[it.symbol] || summary[it.symbol.replace("_PERP","")] || {};
                const fav = favs.includes(it.symbol);
                return (
                  <div
                    key={it.symbol+i}
                    className={`cursor-pointer px-3 py-2 flex items-start justify-between gap-3 ${i===activeIdx? "bg-neutral-800":"hover:bg-neutral-800/60"}`}
                    onMouseDown={(e)=>{ e.preventDefault(); applyItem(it); }}
                    onMouseEnter={()=> setActiveIdx(i)}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          title={fav? "즐겨찾기 해제":"즐겨찾기 추가"}
                          onMouseDown={(e)=>{ e.preventDefault(); e.stopPropagation(); toggleFav(it.symbol); }}
                          className="text-yellow-300/80 hover:text-yellow-300"
                        >
                          {fav? "★":"☆"}
                        </button>
                        <span className="font-semibold">{it.symbol}</span>
                        <span className="hidden sm:inline">
                          <Badge tone="neutral">{it.exchange}</Badge>
                        </span>
                        <Badge tone={toneFor(it.market)}>{it.market.toUpperCase().replace("_","-")}</Badge>
                      </div>
                      <div className="mt-0.5 text-xs text-neutral-300">
                        {it.baseAsset} / {it.quoteAsset} · tick {it.tickSize ?? "-"} · step {it.stepSize ?? "-"}
                      </div>
                    </div>
                    <div className="text-right text-xs text-neutral-300 shrink-0 leading-5">
                      <div>last: {fmtPriceByTick(st.lastPrice, it.tickSize)}</div>
                      <div>amount: {fmtAbbrev(st.amount24h)}</div>
                      <div>volume: {fmtAbbrev(st.volume24h)}</div>
                      <div>funding: {fmtFunding(st.fundingRate)}</div>
                    </div>
                  </div>
                );
              })}
              {loadingSummary && <div className="px-3 py-2 text-xs text-neutral-400">요약 불러오는 중…</div>}
              {!suggestList.length && !loadingSymbols && (
                <div className="px-3 py-3 text-xs text-neutral-400">결과가 없습니다.</div>
              )}
            </div>
          )}
        </div>

        <button onClick={applyByText} className="rounded-md border border-neutral-700 bg-neutral-900/70 px-3 py-1 text-sm hover:bg-neutral-800">적용</button>

        <div className="ml-1 flex flex-wrap items-center gap-1">
          {TF_ORDER.map((t)=>(
            <button key={t} className={btn(tf===t)} onClick={()=>{ setTf(t); setQuery({ tf: t }); }}>{t}</button>
          ))}
        </div>

        <span className="ml-auto text-xs text-neutral-400 hidden md:inline">
          단축키: / 입력, Enter 적용, 1~9 TF, ↑/↓ TF순환
        </span>
      </div>

      <iframe title={`Chart`} src={tvSrc} className="w-full h-full border-0" allowFullScreen />
    </main>
  );
}





