"use client";

import { CheckCircle, Eye, KeyRound, Play, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatDateTime, formatDay } from "@/core/lib/format";
import { observer } from "@/core/state/mobx";
import { Badge, Button, Field, Modal, TextArea } from "@/core/ui/ui";
import { FileList, FileUploader, FileViewer } from "@/modules/files/FileViews";
import { PREVIEW_TIPS } from "@/modules/files/formats";
import { SOCIAL_TYPES } from "@/modules/catalog/domain/types";
import { usePlatform } from "@/modules/platform/PlatformProvider";
import type { FileRef } from "../domain/types";
import { CommentThread, JobFlags, JobStatusBadge } from "./JobParts";

/** Briefing do pedido + identidade da marca (o que o designer precisa saber). */
const BriefingPanel = observer(function BriefingPanel({ orderId, clientId }: { orderId: string; clientId: string }) {
  const { market: m } = usePlatform();
  const order = m.order(orderId);
  const brand = m.account(clientId)?.brand;
  if (!order) return null;
  const b = order.briefing;
  return (
    <div className="space-y-3 text-small">
      {[["Objetivo", b.objective], ["Público", b.audience], ["Referências", b.references], ["Textos / legendas", b.copy], ["Observações", b.notes]].filter(([, v]) => v).map(([k, v]) => (
        <p key={k}><span className="font-semibold text-gray-800">{k}:</span> <span className="whitespace-pre-line text-gray-700">{v}</span></p>
      ))}
      {brand && (brand.colors.length > 0 || brand.fonts || brand.tone) && (
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="mb-2 font-semibold text-gray-800">Identidade da marca</p>
          {brand.colors.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{brand.colors.map((c) => <span key={c} className="flex items-center gap-1 text-caption"><span className="size-5 rounded border border-gray-300" style={{ background: c }} />{c}</span>)}</div>}
          {brand.fonts && <p><span className="text-gray-500">Fontes:</span> {brand.fonts}</p>}
          {brand.tone && <p><span className="text-gray-500">Tom de voz:</span> {brand.tone}</p>}
          {brand.notes && <p><span className="text-gray-500">Observações:</span> {brand.notes}</p>}
          {brand.logoUrl && <a href={brand.logoUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-purple-700 hover:underline">Ver logo</a>}
        </div>
      )}
    </div>
  );
});

/** Cofre do cliente visto pelo designer: revelar fica registrado. */
const VaultPanel = observer(function VaultPanel({ clientId }: { clientId: string }) {
  const platform = usePlatform();
  const { market: m, auth } = platform;
  const [shown, setShown] = useState<Record<string, string>>({});
  const creds = m.credentialsOf(clientId);
  if (!auth.actor || auth.actor.role !== "designer") return null;
  if (!creds.length) return <p className="text-small text-gray-500">O cliente ainda não cadastrou acessos.</p>;
  return (
    <ul className="space-y-2">
      {creds.map((c) => {
        const allowed = m.canReveal(c, auth.actor!.id);
        return (
          <li key={c.id} className="rounded-lg border border-gray-200 p-3 text-small">
            <p className="font-semibold">{c.platform} · {c.login}</p>
            {shown[c.id] ? <p className="mt-1 font-mono">{shown[c.id]}</p> : <p className="mt-1 text-gray-400">••••••••</p>}
            {c.twoFactor && <p className="mt-1 text-caption text-gray-600">2 fatores: {c.twoFactor}</p>}
            {c.notes && <p className="text-caption text-gray-600">{c.notes}</p>}
            {!shown[c.id] && (
              <Button size="sm" variant="secondary" className="mt-2" disabled={!allowed} title={allowed ? undefined : "Acesso pausado pelo cliente"} onClick={async () => {
                const r = await platform.revealCredential(c.id);
                if (typeof r === "string") return void toast.error(r);
                setShown((s) => ({ ...s, [c.id]: r.secret }));
                toast.info("Acesso revelado — o cliente vê este registro.");
              }}>
                <Eye className="size-4" /> {allowed ? "Revelar senha" : "Acesso pausado"}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
});

export const JobDetailModal = observer(function JobDetailModal({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const { market: m, auth } = usePlatform();
  const job = m.job(jobId);
  const actor = auth.actor;
  const [text, setText] = useState("");
  const [files, setFiles] = useState<FileRef[]>([]);
  const [note, setNote] = useState("");
  const [caption, setCaption] = useState(job?.caption ?? "");
  const [versionIdx, setVersionIdx] = useState<number | null>(null);
  if (!job || !actor) return null;

  const role = actor.role;
  const isDesigner = role === "designer" && job.designerId === actor.id;
  const isClient = role === "client" && job.clientId === actor.id;
  const order = m.order(job.orderId);
  const paused = m.isPaused(job);
  const version = job.versions[versionIdx ?? job.versions.length - 1];
  const previews = version?.files.filter((f) => f.kind === "preview") ?? [];
  const sources = version?.files.filter((f) => f.kind === "source") ?? [];
  const social = SOCIAL_TYPES.includes(job.deliverable);
  const run = (error: string | null, ok: string, close = false) => {
    if (error) return toast.error(error);
    toast.success(ok);
    setText("");
    if (close) onClose();
  };
  const canSubmit = isDesigner && ["todo", "in_progress", "changes_requested"].includes(job.status);

  return (
    <Modal
      size="xl"
      onClose={onClose}
      title={job.title}
      description={
        <span className="mt-1 flex flex-wrap items-center gap-2">
          <JobStatusBadge status={job.status} />
          <JobFlags job={job} />
          <span>{order?.number} · {role !== "client" && `${m.nameOf(job.clientId)} · `}{role !== "designer" && `designer: ${m.nameOf(job.designerId)} · `}prazo {formatDay(job.dueDate)}</span>
          {job.publishDate && <Badge className="border border-gray-300 bg-white text-gray-700">publicar {formatDay(job.publishDate)} {job.publishTime}</Badge>}
          <span>· ajustes {job.revisionsUsed}/{job.revisionsIncluded}</span>
        </span>
      }
    >
      {paused && <p className="rounded-lg bg-gray-800 px-4 py-3 text-small text-white">⏸️ Produção pausada: a cobrança deste período está em atraso há mais de {m.settings.graceDays} dias. {isClient ? "Regularize em Financeiro para retomar." : "O prazo desta peça não conta enquanto estiver pausada."}</p>}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-3">
          {job.versions.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {job.versions.map((v, i) => (
                <button key={v.number} onClick={() => setVersionIdx(i)} className={`rounded-md px-2.5 py-1 text-caption font-semibold ${(versionIdx ?? job.versions.length - 1) === i ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>Versão {v.number}</button>
              ))}
            </div>
          )}
          {version ? (
            <>
              {previews.map((f) => <FileViewer key={f.id} file={f} />)}
              {version.note && <p className="rounded-lg bg-purple-50 px-3 py-2 text-small text-purple-900">Nota do designer: {version.note}</p>}
              {sources.length > 0 && (job.status === "approved" || job.status === "delivered" || !isClient) && (
                <div>
                  <p className="mb-1 text-small font-semibold">Arquivos finais / editáveis</p>
                  <FileList files={sources} />
                </div>
              )}
              {sources.length > 0 && isClient && !(job.status === "approved" || job.status === "delivered") && <p className="text-caption text-gray-500">{sources.length} arquivo(s) editável(is) liberado(s) após a aprovação.</p>}
              <p className="text-caption text-gray-500">Versão {version.number} enviada em {formatDateTime(version.createdAt)}</p>
            </>
          ) : (
            <div className="brand-gradient-soft flex h-64 flex-col items-center justify-center rounded-lg text-center text-gray-500">
              <p className="font-semibold text-gray-700">Ainda sem arte</p>
              <p className="text-small">{isDesigner ? "Envie a primeira versão ao lado." : "O designer ainda está produzindo esta peça."}</p>
            </div>
          )}
          {job.caption && <div className="rounded-lg border border-gray-100 p-3"><p className="mb-1 text-small font-semibold">Legenda</p><p className="whitespace-pre-line text-small text-gray-700">{job.caption}</p></div>}
        </div>

        <div className="space-y-5">
          {isClient && job.status === "in_review" && (
            <section className="space-y-3 rounded-xl border-2 border-yellow-300 bg-yellow-50/50 p-4">
              <h3 className="font-semibold">Sua avaliação</h3>
              <TextArea label="Comentário (obrigatório para pedir ajustes)" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="O que mudar? Ou deixe um elogio 🙂" />
              {job.revisionsUsed >= job.revisionsIncluded && <p className="text-caption text-orange-700">Você já usou os {job.revisionsIncluded} ajuste(s) incluídos. Novos pedidos ficam registrados como ajuste extra.</p>}
              <div className="flex gap-2">
                <Button variant="danger" className="flex-1" onClick={() => run(m.requestChanges(job.id, actor, text), "Ajustes enviados ao designer.")}><ThumbsDown className="size-4" /> Pedir ajustes</Button>
                <Button variant="success" className="flex-1" onClick={() => run(m.approveJob(job.id, actor, text), "Arte aprovada! 🎉")}><ThumbsUp className="size-4" /> Aprovar</Button>
              </div>
            </section>
          )}

          {isDesigner && job.status === "todo" && !paused && <Button className="w-full" onClick={() => run(m.moveJob(job.id, "in_progress", actor), "Produção iniciada.")}><Play className="size-4" /> Começar produção</Button>}

          {canSubmit && !paused && (
            <section className="space-y-3 rounded-xl border border-purple-200 bg-purple-50/40 p-4">
              <h3 className="font-semibold">{job.status === "changes_requested" ? `Enviar versão ${job.versions.length + 1} com os ajustes` : "Enviar para aprovação"}</h3>
              <p className="text-caption text-gray-600">Formato sugerido: {PREVIEW_TIPS[job.deliverable] ?? "PNG ou JPG"}</p>
              <FileUploader kind="preview" files={files} onChange={setFiles} />
              <FileUploader kind="source" files={files} onChange={setFiles} />
              {social && <TextArea label="Legenda" rows={3} value={caption} onChange={(e) => setCaption(e.target.value)} />}
              <Field label="Nota para o cliente (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button className="w-full" onClick={() => {
                const err = m.submitVersion(job.id, actor, files, note, social ? caption : undefined);
                if (err) return toast.error(err);
                setFiles([]);
                setNote("");
                toast.success("Enviado para o cliente aprovar.");
              }}><Send className="size-4" /> Enviar para aprovação</Button>
            </section>
          )}

          {isDesigner && job.status === "approved" && (
            <section className="space-y-3 rounded-xl border border-green-200 bg-green-50/60 p-4">
              <h3 className="font-semibold">Aprovada! Agora {social ? "publique" : "entregue"}</h3>
              <p className="text-small text-gray-600">{social ? "Publique na data combinada usando o acesso do cliente (abaixo) e confirme aqui." : "Anexe os arquivos finais na versão (se ainda não anexou) e confirme a entrega."}</p>
              <TextArea label={social ? "Link da publicação ou observação" : "Observação da entrega"} rows={2} value={text} onChange={(e) => setText(e.target.value)} />
              <Button variant="success" className="w-full" onClick={() => run(m.markDelivered(job.id, actor, text), social ? "Publicação registrada." : "Entrega registrada.")}><CheckCircle className="size-4" /> {social ? "Confirmar publicação" : "Confirmar entrega"}</Button>
            </section>
          )}

          {isDesigner && social && (
            <details className="rounded-xl border border-gray-200 p-4" open={job.status === "approved"}>
              <summary className="flex cursor-pointer items-center gap-2 font-semibold"><KeyRound className="size-4" /> Acesso às redes do cliente</summary>
              <div className="mt-3"><VaultPanel clientId={job.clientId} /></div>
            </details>
          )}

          {role !== "client" && (
            <details className="rounded-xl border border-gray-200 p-4" open={isDesigner && job.versions.length === 0}>
              <summary className="cursor-pointer font-semibold">Briefing e identidade da marca</summary>
              <div className="mt-3"><BriefingPanel orderId={job.orderId} clientId={job.clientId} /></div>
            </details>
          )}

          <section>
            <h3 className="mb-2 font-semibold">Histórico e mensagens</h3>
            <CommentThread comments={job.comments} />
            {job.status !== "delivered" && !(isClient && job.status === "in_review") && (
              <div className="mt-3 flex gap-2">
                <input className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-small outline-none focus:border-brand-purple" placeholder="Escreva uma mensagem…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run(m.comment(job.id, actor, text), "Mensagem enviada.")} />
                <Button size="sm" variant="secondary" onClick={() => run(m.comment(job.id, actor, text), "Mensagem enviada.")}>Enviar</Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </Modal>
  );
});
