"use client";

import { AlertTriangle, CheckCircle, Clock, MessageSquare, PauseCircle, RotateCcw, Send, Upload, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { formatDateTime, formatShortDay } from "@/core/lib/format";
import { observer } from "@/core/state/mobx";
import { Badge } from "@/core/ui/ui";
import { FileThumb } from "@/modules/files/FileViews";
import { useMarket } from "@/modules/platform/PlatformProvider";
import { coverFile, isLate, JOB_STATUS_LABEL, JOB_STATUS_STYLE, type CommentKind, type Job, type JobComment, type JobStatus } from "../domain/types";

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge className={JOB_STATUS_STYLE[status]}>{JOB_STATUS_LABEL[status]}</Badge>;
}

/** Selos de alerta: atrasada e pausada por falta de pagamento. */
export const JobFlags = observer(function JobFlags({ job }: { job: Job }) {
  const m = useMarket();
  const paused = m.isPaused(job);
  return (
    <>
      {paused && <Badge className="bg-gray-800 text-white"><PauseCircle className="size-3" /> Pausada</Badge>}
      {!paused && isLate(job) && <Badge className="bg-red-600 text-white"><AlertTriangle className="size-3" /> Atrasada</Badge>}
      {job.revisionsUsed > job.revisionsIncluded && <Badge className="bg-orange-100 text-orange-800">ajuste extra</Badge>}
    </>
  );
});

/** Card de peça (quadro do designer, aprovações do cliente, listas do admin). */
export const JobCard = observer(function JobCard({ job, subtitle, onOpen, compact }: { job: Job; subtitle?: string; onOpen: () => void; compact?: boolean }) {
  const last = [...job.comments].reverse().find((c) => c.kind === "changes");
  return (
    <button onClick={onOpen} className="group w-full overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {!compact && (
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <FileThumb file={coverFile(job)} className="h-full w-full" />
          {job.versions.length > 1 && <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-caption font-semibold text-white">v{job.versions.length}</span>}
        </div>
      )}
      <div className="space-y-2 p-3">
        <div className="flex flex-wrap gap-1"><JobStatusBadge status={job.status} /><JobFlags job={job} /></div>
        <p className="font-semibold leading-tight text-gray-900">{job.title}</p>
        {subtitle && <p className="truncate text-caption text-gray-500">{subtitle}</p>}
        <p className="flex items-center gap-1 text-caption text-gray-500"><Clock className="size-3" /> Prazo {formatShortDay(job.dueDate)}{job.publishDate && ` · publicar ${formatShortDay(job.publishDate)} ${job.publishTime ?? ""}`}</p>
        {job.status === "changes_requested" && last && <p className="line-clamp-2 rounded-md bg-red-50 px-2 py-1 text-caption text-red-800">{last.text}</p>}
      </div>
    </button>
  );
});

const KIND: Record<CommentKind, { icon: ReactNode; label: string; className: string }> = {
  note: { icon: <MessageSquare className="size-3.5" />, label: "Mensagem", className: "border-gray-200 bg-gray-50" },
  submitted: { icon: <Upload className="size-3.5 text-purple-600" />, label: "Enviou versão", className: "border-purple-200 bg-purple-50" },
  approval: { icon: <CheckCircle className="size-3.5 text-green-600" />, label: "Aprovou", className: "border-green-200 bg-green-50" },
  changes: { icon: <XCircle className="size-3.5 text-red-600" />, label: "Pediu ajustes", className: "border-red-200 bg-red-50" },
  delivered: { icon: <Send className="size-3.5 text-blue-600" />, label: "Entregou", className: "border-blue-200 bg-blue-50" },
  status: { icon: <RotateCcw className="size-3.5 text-gray-500" />, label: "Atualização", className: "border-gray-100 bg-white" },
};

const ROLE = { client: "cliente", designer: "designer", admin: "KreativeArt" };

export function CommentThread({ comments }: { comments: JobComment[] }) {
  if (!comments.length) return <p className="text-small text-gray-500">Nenhuma interação ainda.</p>;
  return (
    <ol className="space-y-2">
      {comments.map((c) => (
        <li key={c.id} className={`rounded-lg border p-3 ${KIND[c.kind].className}`}>
          <div className="mb-1 flex flex-wrap items-center gap-1.5 text-caption text-gray-600">
            {KIND[c.kind].icon}
            <strong className="text-gray-800">{c.authorName}</strong>
            <span>({ROLE[c.authorRole]}) · {KIND[c.kind].label} · {formatDateTime(c.createdAt)}</span>
          </div>
          <p className="whitespace-pre-line text-small text-gray-800">{c.text}</p>
        </li>
      ))}
    </ol>
  );
}
