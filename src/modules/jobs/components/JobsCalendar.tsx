"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { formatShortDay, toDay } from "@/core/lib/format";
import { Button, Card } from "@/core/ui/ui";
import { JOB_STATUS_STYLE, type Job } from "../domain/types";
import { JobStatusBadge } from "./JobParts";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Data mostrada no calendário: publicação (redes sociais) ou prazo de entrega. */
const dayOf = (j: Job) => j.publishDate ?? j.dueDate;

/** Calendário do mês com as peças; abaixo, a lista do mês (melhor no celular). */
export function JobsCalendar({ jobs, describe, onOpen }: { jobs: Job[]; describe?: (job: Job) => string; onOpen: (job: Job) => void }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const month = toDay(cursor).slice(0, 7);
  const today = toDay(new Date());
  const monthJobs = jobs.filter((j) => dayOf(j).startsWith(month)).sort((a, b) => dayOf(a).localeCompare(dayOf(b)));
  const cells: (string | null)[] = [...Array(cursor.getDay()).fill(null), ...Array.from({ length: new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate() }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  while (cells.length % 7) cells.push(null);
  const shift = (d: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + d, 1));

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold capitalize">{cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h3>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Hoje</Button>
            <Button variant="ghost" size="sm" onClick={() => shift(-1)} aria-label="Mês anterior"><ChevronLeft className="size-5" /></Button>
            <Button variant="ghost" size="sm" onClick={() => shift(1)} aria-label="Próximo mês"><ChevronRight className="size-5" /></Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-caption font-semibold text-gray-500">{WEEKDAYS.map((d) => <div key={d} className="py-1">{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} className="min-h-16 rounded-lg bg-gray-50/50 sm:min-h-24" />;
            const list = monthJobs.filter((j) => dayOf(j) === day);
            return (
              <div key={day} className={`min-h-16 min-w-0 rounded-lg border p-1 sm:min-h-24 ${day === today ? "border-purple-400 bg-purple-50/50" : "border-gray-100"}`}>
                <p className={`mb-1 text-caption font-semibold ${day === today ? "text-purple-700" : "text-gray-600"}`}>{Number(day.slice(8))}</p>
                <div className="space-y-1">
                  {list.slice(0, 3).map((j) => (
                    <button key={j.id} onClick={() => onOpen(j)} title={j.title} className={`block w-full truncate rounded px-1 py-0.5 text-left text-[0.65rem] font-medium ${JOB_STATUS_STYLE[j.status]}`}>{j.title}</button>
                  ))}
                  {list.length > 3 && <p className="text-[0.65rem] text-gray-500">+{list.length - 3}</p>}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-caption text-gray-500">Peças de rede social aparecem na data de publicação; as demais, no prazo de entrega.</p>
      </Card>
      <Card className="p-4 sm:p-6">
        <h3 className="mb-4 font-semibold">Peças do mês ({monthJobs.length})</h3>
        {monthJobs.length === 0 ? <p className="text-small text-gray-500">Nada neste mês.</p> : (
          <ul className="space-y-2">
            {monthJobs.map((j) => (
              <li key={j.id}>
                <button onClick={() => onOpen(j)} className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left hover:bg-gray-50">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{j.title}</span>
                    <span className="block truncate text-small text-gray-500">{describe?.(j)}</span>
                  </span>
                  <span className="flex flex-shrink-0 flex-col items-end gap-1"><span className="text-small font-medium">{formatShortDay(dayOf(j))}</span><JobStatusBadge status={j.status} /></span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
