'use client';

import { useEffect, useState } from 'react';

type SignalItem = {
  id: string;
  symbol?: string;
  title?: string;
  message?: string;
  side?: string;
  price?: number;
  createdAt?: any;
  source?: string;
};

export default function AdminSignalsPage() {
  const [rows, setRows] = useState<SignalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/signals?limit=50')
      .then((r) => r.json())
      .then((d) => setRows(d?.items ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-bold">최근 신호(최신 50)</h1>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="rounded border p-3 overflow-auto">
          <table className="min-w-[800px] text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">symbol</th>
                <th className="p-2">title</th>
                <th className="p-2">message</th>
                <th className="p-2">side</th>
                <th className="p-2">price</th>
                <th className="p-2">source</th>
                <th className="p-2">id</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-2">{r.symbol}</td>
                  <td className="p-2">{r.title}</td>
                  <td className="p-2">{r.message}</td>
                  <td className="p-2">{r.side}</td>
                  <td className="p-2">{r.price}</td>
                  <td className="p-2">{r.source}</td>
                  <td className="p-2">{r.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
