"use client";

import { useState, type ReactNode } from "react";

/** Gráficos leves (SVG/CSS) para o painel — sem biblioteca externa. */
export const PALETTE = ["#8b5cf6", "#3b82f6", "#ec4899", "#10b981", "#f59e0b", "#0891b2", "#ef4444", "#65a30d", "#ea580c", "#475569"];

export function ChartCard({ title, subtitle, action, children, className = "", allowBreak = false }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string; /** tabelas longas podem continuar na página seguinte do PDF */ allowBreak?: boolean }) {
  return (
    <section className={`${allowBreak ? "" : "break-inside-avoid"} rounded-2xl border border-gray-100 bg-white p-5 shadow-sm print:shadow-none ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-black text-gray-800">{title}</h2>
          {subtitle && <p className="text-caption text-gray-500">{subtitle}</p>}
        </div>
        {action && <div className="print:hidden">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children = "Sem vendas para este filtro." }: { children?: ReactNode }) {
  return <p className="py-10 text-center text-small text-gray-400">{children}</p>;
}

/** Colunas verticais; destaca o maior valor. Passe o mouse para ver o valor. */
export function ColumnChart({ data, format, height = 200, highlight = true }: { data: { label: string; value: number; hint?: string }[]; format: (n: number) => string; height?: number; highlight?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 0);
  if (max === 0) return <Empty />;
  const dense = data.length > 16;
  const labelEvery = Math.ceil(data.length / 12);
  const shown = hover ?? data.findIndex((d) => d.value === max);
  return (
    <div>
      <p className="mb-2 h-5 text-caption text-gray-600">
        <strong className="text-gray-800">{data[shown].label}</strong>: {format(data[shown].value)} {data[shown].hint && <span className="text-gray-400">· {data[shown].hint}</span>}
      </p>
      <div className="flex items-end gap-[3px]" style={{ height }} onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <div key={d.label + i} className="group flex h-full flex-1 flex-col justify-end" onMouseEnter={() => setHover(i)} title={`${d.label}: ${format(d.value)}`}>
            <div
              className={`w-full rounded-t-md transition-colors ${hover === i ? "bg-gray-800" : highlight && d.value === max ? "bg-brand-purple" : "bg-purple-200 group-hover:bg-purple-300"}`}
              style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 1.5 : 0)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[3px]">
        {data.map((d, i) => (
          <span key={d.label + i} className="flex-1 overflow-visible whitespace-nowrap text-center text-[10px] text-gray-500">{!dense || i % labelEvery === 0 ? d.label : ""}</span>
        ))}
      </div>
    </div>
  );
}

/** Rosca (pizza) com legenda e percentuais. */
export function Donut({ data, format }: { data: { label: string; value: number }[]; format: (n: number) => string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <Empty />;
  const r = 60;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 160 160" className="size-36 flex-shrink-0 -rotate-90" role="img" aria-label="Gráfico de pizza">
        {data.map((d, i) => {
          const len = (d.value / total) * c;
          const el = <circle key={d.label} cx="80" cy="80" r={r} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth="26" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}><title>{`${d.label}: ${format(d.value)}`}</title></circle>;
          offset += len;
          return el;
        })}
      </svg>
      <ul className="min-w-40 flex-1 space-y-1.5 text-small">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="size-3 flex-shrink-0 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="flex-1 truncate text-gray-700">{d.label}</span>
            <span className="font-bold text-gray-800">{Math.round((d.value / total) * 100)}%</span>
            <span className="hidden w-24 text-right text-caption text-gray-500 sm:inline">{format(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ranking em barras horizontais. */
export function BarList({ rows, format, max: limit = 10 }: { rows: { label: string; value: number; sub?: string }[]; format: (n: number) => string; max?: number }) {
  const top = rows.slice(0, limit);
  const max = Math.max(...top.map((r) => r.value), 0);
  if (max === 0) return <Empty />;
  return (
    <ol className="space-y-2.5">
      {top.map((r, i) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between gap-3 text-small">
            <span className="truncate text-gray-700"><span className="mr-1.5 font-bold text-gray-400">{i + 1}.</span>{r.label}</span>
            <span className="whitespace-nowrap font-bold text-gray-800">{format(r.value)}{r.sub && <span className="ml-1.5 text-caption font-normal text-gray-500">{r.sub}</span>}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100">
            <div className="h-2 rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Mapa de calor (linhas × colunas); intensidade proporcional ao maior valor. */
export function Heatmap({ rows, cols, value, format, color = "139, 92, 246" }: { rows: string[]; cols: string[]; value: (r: number, c: number) => number; format: (n: number) => string; color?: string }) {
  let max = 0;
  rows.forEach((_, r) => cols.forEach((_, c) => (max = Math.max(max, value(r, c)))));
  if (max === 0) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-caption">
        <thead>
          <tr>
            <th />
            {cols.map((c) => <th key={c} className="px-1 pb-1 text-center font-semibold text-gray-500">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={row}>
              <th className="whitespace-nowrap pr-2 text-left font-semibold text-gray-600">{row}</th>
              {cols.map((col, c) => {
                const v = value(r, c);
                const alpha = v / max;
                return (
                  <td key={col} title={`${row} · ${col}: ${format(v)}`} className="h-9 min-w-12 rounded-md text-center font-bold" style={{ background: v ? `rgba(${color}, ${0.08 + alpha * 0.85})` : "#f9fafb", color: alpha > 0.55 ? "#fff" : "#374151" }}>
                    {v ? format(v) : "–"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
