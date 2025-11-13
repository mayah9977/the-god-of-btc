'use client'

import React from 'react'

export type Signal = {
  id: string
  source?: string
  symbol?: string
  side?: 'long' | 'short' | 'neutral' | string
  timeframe?: string | null
  price?: number | null
  title?: string
  message?: string | null
  receivedAt?: string
  meta?: any
}

function clsx(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(' ')
}

function sideBadge(side?: string) {
  const base = 'px-2 py-0.5 rounded-full text-xs border'
  if (side === 'long') return clsx(base, 'bg-green-50 text-green-700 border-green-200')
  if (side === 'short') return clsx(base, 'bg-red-50 text-red-700 border-red-200')
  return clsx(base, 'bg-gray-50 text-gray-700 border-gray-200')
}

function strategyBadge(tf?: string | null) {
  if (!tf) return null
  return <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">{tf}</span>
}

function fmtDate(iso?: string) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(d)
  } catch { return iso }
}

export default function SignalCard({ s }: { s: Signal }) {
  return (
    <article className="rounded-2xl border p-4 shadow-sm hover:shadow md:transition">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{s.symbol ?? 'UNKNOWN'}</span>
          <span className={sideBadge(s.side)}>{s.side ?? 'neutral'}</span>
          {strategyBadge(s.timeframe)}
        </div>
        <time className="text-xs text-gray-500">{fmtDate(s.receivedAt)}</time>
      </header>

      <h3 className="mt-2 text-lg font-bold">{s.title ?? 'Signal'}</h3>
      {s.message && <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{s.message}</p>}

      <footer className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
        {typeof s.price === 'number' && <span>Price: <b>{s.price}</b></span>}
        {s.source && <span>Source: {s.source}</span>}
        {s.meta?.strategy && <span>Strategy: {String(s.meta.strategy)}</span>}
        <span className="ml-auto text-[11px] text-gray-400">id: {s.id}</span>
      </footer>
    </article>
  )
}

