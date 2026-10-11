import type { DeliverableType } from "@/modules/catalog/domain/types";

/**
 * Entrega (cada peça de um pedido). Fluxo do quadro do designer:
 * todo → in_progress → in_review (cliente avalia) → approved → delivered
 *                         ↘ changes_requested → (nova versão) → in_review
 */
export type JobStatus = "todo" | "in_progress" | "in_review" | "changes_requested" | "approved" | "delivered";

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  todo: "A fazer",
  in_progress: "Em produção",
  in_review: "Aguardando aprovação",
  changes_requested: "Ajustes solicitados",
  approved: "Aprovada",
  delivered: "Entregue / publicada",
};

export const JOB_STATUS_STYLE: Record<JobStatus, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-indigo-100 text-indigo-800",
  in_review: "bg-yellow-100 text-yellow-800",
  changes_requested: "bg-red-100 text-red-800",
  approved: "bg-green-100 text-green-800",
  delivered: "bg-blue-100 text-blue-800",
};

export const BOARD_COLUMNS: JobStatus[] = ["todo", "in_progress", "in_review", "changes_requested", "approved", "delivered"];

export interface FileRef {
  id: string;
  name: string;
  size: number;
  mime: string;
  /** Extensão em minúsculas, sem ponto */
  ext: string;
  /** "preview" = o que o cliente vê para aprovar; "source" = arquivo final/editável */
  kind: "preview" | "source";
  /** Link externo (dados demonstrativos) — quando ausente, o arquivo está no armazenamento local */
  url?: string;
  /** Miniatura gerada do PSD/CDR (id de outro arquivo no armazenamento) */
  thumbId?: string;
}

export interface JobVersion {
  number: number;
  files: FileRef[];
  note: string;
  createdAt: string;
}

export type CommentKind = "note" | "submitted" | "approval" | "changes" | "delivered" | "status";

export interface JobComment {
  id: string;
  authorName: string;
  authorRole: "client" | "designer" | "admin";
  kind: CommentKind;
  text: string;
  createdAt: string;
}

export interface Job {
  id: string;
  orderId: string;
  clientId: string;
  designerId?: string;
  title: string;
  deliverable: DeliverableType;
  /** Mês do plano "AAAA-MM" (pedidos de plano) */
  period?: string;
  /** Prazo da primeira versão "AAAA-MM-DD" */
  dueDate: string;
  /** Peças de rede social: data/hora sugerida para publicar */
  publishDate?: string;
  publishTime?: string;
  caption: string;
  status: JobStatus;
  versions: JobVersion[];
  revisionsIncluded: number;
  revisionsUsed: number;
  comments: JobComment[];
  firstSubmittedAt?: string;
  approvedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const latestVersion = (job: Job): JobVersion | undefined => job.versions[job.versions.length - 1];

/** Primeira imagem de prévia da última versão (para miniaturas). */
export const coverFile = (job: Job): FileRef | undefined => latestVersion(job)?.files.find((f) => f.kind === "preview");

const endOfDay = (day: string) => new Date(`${day}T23:59:59`);

/** Atrasada: passou do prazo e o designer ainda não mandou a primeira versão. */
export function isLate(job: Pick<Job, "status" | "dueDate" | "firstSubmittedAt">, now = new Date()): boolean {
  return !job.firstSubmittedAt && (job.status === "todo" || job.status === "in_progress") && endOfDay(job.dueDate) < now;
}

/** Entregue no prazo: primeira versão enviada até o fim do dia do prazo. */
export function wasOnTime(job: Pick<Job, "dueDate" | "firstSubmittedAt">): boolean | null {
  if (!job.firstSubmittedAt) return null;
  return new Date(job.firstSubmittedAt) <= endOfDay(job.dueDate);
}
