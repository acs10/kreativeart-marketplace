import { isLate, wasOnTime, type Job } from "@/modules/jobs/domain/types";
import type { Settings } from "@/modules/settings/types";

export type PerformanceLevel = "meta" | "atencao" | "atrasando" | "sem-dados";

export const LEVEL_LABEL: Record<PerformanceLevel, string> = {
  meta: "Cumprindo a meta",
  atencao: "Atenção",
  atrasando: "Atrasando",
  "sem-dados": "Sem entregas ainda",
};

export const LEVEL_STYLE: Record<PerformanceLevel, string> = {
  meta: "bg-green-100 text-green-800",
  atencao: "bg-amber-100 text-amber-800",
  atrasando: "bg-red-100 text-red-800",
  "sem-dados": "bg-gray-100 text-gray-600",
};

export interface Performance {
  total: number;
  /** Peças com a 1ª versão enviada */
  submitted: number;
  onTime: number;
  /** Entregues no prazo ÷ enviadas */
  onTimeRate: number | null;
  /** Atrasadas agora (prazo vencido sem 1ª versão) */
  lateNow: number;
  open: number;
  approved: number;
  /** Média de rodadas de ajuste por peça aprovada */
  avgRevisions: number;
  level: PerformanceLevel;
}

/**
 * Desempenho de um designer:
 * - "atrasando": atrasadas ≥ limite do alerta, ou pontualidade abaixo de (meta − 15 p.p.);
 * - "atenção": alguma atrasada, ou pontualidade abaixo da meta;
 * - "cumprindo a meta": o resto, com pelo menos uma peça enviada.
 */
export function designerPerformance(jobs: Job[], settings: Pick<Settings, "onTimeGoal" | "lateAlert">, now = new Date()): Performance {
  const submittedJobs = jobs.filter((j) => j.firstSubmittedAt);
  const onTime = submittedJobs.filter((j) => wasOnTime(j)).length;
  const lateNow = jobs.filter((j) => isLate(j, now)).length;
  const approvedJobs = jobs.filter((j) => j.status === "approved" || j.status === "delivered");
  const rate = submittedJobs.length ? onTime / submittedJobs.length : null;
  let level: PerformanceLevel = "sem-dados";
  if (lateNow >= settings.lateAlert || (rate !== null && rate < settings.onTimeGoal - 0.15)) level = "atrasando";
  else if (lateNow > 0 || (rate !== null && rate < settings.onTimeGoal)) level = "atencao";
  else if (rate !== null) level = "meta";
  return {
    total: jobs.length,
    submitted: submittedJobs.length,
    onTime,
    onTimeRate: rate,
    lateNow,
    open: jobs.filter((j) => j.status !== "approved" && j.status !== "delivered").length,
    approved: approvedJobs.length,
    avgRevisions: approvedJobs.length ? approvedJobs.reduce((s, j) => s + j.revisionsUsed, 0) / approvedJobs.length : 0,
    level,
  };
}
