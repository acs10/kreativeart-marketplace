"use client";

import { Download, FileArchive, FileImage, FileText, FileVideo, Loader2, Paperclip, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatBytes } from "@/core/lib/format";
import type { FileRef } from "@/modules/jobs/domain/types";
import { fileUrl, saveFile } from "./file-store";
import { PREVIEW_ACCEPT, previewKind, SOURCE_ACCEPT, SOURCE_FORMATS } from "./formats";

/** Resolve a URL (link externo ou arquivo local) e libera a memória ao sair. */
function useFileUrl(file: FileRef, thumb?: boolean) {
  const [url, setUrl] = useState<string | null>(file.url && !thumb ? file.url : null);
  useEffect(() => {
    let created: string | null = null;
    let alive = true;
    if (file.url && !thumb) {
      setUrl(file.url);
      return;
    }
    if (!file.id) return; // sem arquivo (miniatura vazia)
    void fileUrl(file, thumb ? file.thumbId : undefined).then((u) => {
      if (u?.startsWith("blob:")) created = u;
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [file, thumb]);
  return url;
}

export function FileIcon({ ext, className = "size-5" }: { ext: string; className?: string }) {
  const k = previewKind(ext);
  if (k === "image") return <FileImage className={className} />;
  if (k === "video") return <FileVideo className={className} />;
  if (k === "pdf" || k === "ai") return <FileText className={className} />;
  if (["zip", "rar"].includes(ext)) return <FileArchive className={className} />;
  return <Paperclip className={className} />;
}

const EMPTY: FileRef = { id: "", name: "", size: 0, mime: "", ext: "", kind: "preview" };

/** Miniatura quadrada (cards, quadro, calendário). */
export function FileThumb({ file, className = "" }: { file?: FileRef; className?: string }) {
  const kind = file ? previewKind(file.ext) : "none";
  const useThumb = !!file?.thumbId;
  const url = useFileUrl(file ?? EMPTY, useThumb);
  if (!file) return <div className={`brand-gradient-soft flex items-center justify-center text-purple-300 ${className}`}><FileImage className="size-8" /></div>;
  if ((kind === "image" || useThumb) && url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={file.name} loading="lazy" className={`bg-gray-100 object-cover ${className}`} />;
  }
  if (kind === "video" && url) return <video src={url} muted playsInline preload="metadata" className={`bg-black object-cover ${className}`} />;
  return (
    <div className={`flex flex-col items-center justify-center gap-1 bg-gray-100 text-gray-500 ${className}`}>
      <FileIcon ext={file.ext} className="size-8" />
      <span className="text-caption font-bold uppercase">{file.ext}</span>
    </div>
  );
}

/** Visualização grande de um arquivo, com download. */
export function FileViewer({ file }: { file: FileRef }) {
  const kind = previewKind(file.ext);
  const url = useFileUrl(file);
  const thumbUrl = useFileUrl(file, true);
  const demo = file.url === "#";
  const label = (SOURCE_FORMATS as Record<string, string>)[file.ext];
  let body: React.ReactNode;
  if (!url && !demo) body = <div className="flex h-64 items-center justify-center text-gray-400"><Loader2 className="size-6 animate-spin" /></div>;
  else if (kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    body = <img src={url!} alt={file.name} className="max-h-[65vh] w-full bg-gray-50 object-contain" />;
  } else if (kind === "video") body = <video src={url!} controls playsInline className="max-h-[65vh] w-full bg-black" />;
  else if ((kind === "pdf" || kind === "ai") && !demo) body = <iframe src={url!} title={file.name} className="h-[65vh] w-full bg-white" />;
  else if ((kind === "psd" || kind === "cdr") && thumbUrl && file.thumbId) {
    // eslint-disable-next-line @next/next/no-img-element
    body = <img src={thumbUrl} alt={`Miniatura de ${file.name}`} className="max-h-[65vh] w-full bg-gray-50 object-contain" />;
  } else
    body = (
      <div className="flex h-56 flex-col items-center justify-center gap-2 bg-gray-50 text-center text-gray-500">
        <FileIcon ext={file.ext} className="size-10" />
        <p className="font-semibold text-gray-700">{file.name}</p>
        <p className="max-w-sm text-small">{label ? `Arquivo ${label}` : "Arquivo"} — sem visualização no navegador.{demo ? " (arquivo demonstrativo)" : " Baixe para abrir no programa."}</p>
      </div>
    );
  return (
    <figure className="overflow-hidden rounded-lg border border-gray-200">
      {body}
      <figcaption className="flex items-center justify-between gap-3 border-t border-gray-100 bg-white px-3 py-2 text-small">
        <span className="flex min-w-0 items-center gap-2 text-gray-700"><FileIcon ext={file.ext} className="size-4 flex-shrink-0" /><span className="truncate">{file.name}</span><span className="flex-shrink-0 text-caption text-gray-400">{formatBytes(file.size)}</span></span>
        {url && !demo && (
          <a href={url} download={file.name} className="flex flex-shrink-0 items-center gap-1 font-semibold text-purple-700 hover:underline"><Download className="size-4" /> Baixar</a>
        )}
      </figcaption>
    </figure>
  );
}

/** Lista compacta (arquivos finais/editáveis). */
export function FileList({ files }: { files: FileRef[] }) {
  return (
    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
      {files.map((f) => <FileRow key={f.id} file={f} />)}
    </ul>
  );
}

function FileRow({ file }: { file: FileRef }) {
  const url = useFileUrl(file);
  const demo = file.url === "#";
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2 text-small">
      <span className="flex min-w-0 items-center gap-2"><FileIcon ext={file.ext} className="size-4 flex-shrink-0 text-gray-500" /><span className="truncate">{file.name}</span><span className="flex-shrink-0 text-caption text-gray-400">{(SOURCE_FORMATS as Record<string, string>)[file.ext] ?? file.ext.toUpperCase()} · {formatBytes(file.size)}</span></span>
      {demo ? <span className="text-caption text-gray-400">demo</span> : url && <a href={url} download={file.name} className="flex-shrink-0 font-semibold text-purple-700 hover:underline">Baixar</a>}
    </li>
  );
}

/** Área de envio: prévia (obrigatória) e arquivos finais (opcionais). */
/** `onChange` recebe uma função de atualização: envios em paralelo (prévia e finais) não se sobrescrevem. */
export function FileUploader({ kind, files, onChange }: { kind: FileRef["kind"]; files: FileRef[]; onChange: (update: (files: FileRef[]) => FileRef[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const add = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true);
    const added: FileRef[] = [];
    for (const file of Array.from(list)) {
      const r = await saveFile(file, kind);
      if (r.error) toast.error(r.error);
      if (r.warning) toast.warning(r.warning);
      if (r.ref) added.push(r.ref);
    }
    setBusy(false);
    onChange((current) => [...current, ...added]);
  };
  const mine = files.filter((f) => f.kind === kind);
  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); void add(e.dataTransfer.files); }}
        className={`flex w-full flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-5 text-center text-small transition ${drag ? "border-purple-500 bg-purple-50" : "border-gray-300 hover:border-purple-400 hover:bg-purple-50/40"}`}
      >
        {busy ? <Loader2 className="size-6 animate-spin text-purple-500" /> : <UploadCloud className="size-6 text-purple-500" />}
        <span className="font-semibold text-gray-700">{kind === "preview" ? "Prévia para aprovação" : "Arquivos finais / editáveis"}</span>
        <span className="text-caption text-gray-500">{kind === "preview" ? "JPG, PNG, WEBP, GIF, SVG, MP4, WEBM, MOV ou PDF" : "PSD, AI, CDR, EPS, SVG, PDF, TIFF, INDD, FIG, ZIP… (PSD e CDR ganham miniatura)"}</span>
      </button>
      <input ref={input} type="file" multiple hidden accept={kind === "preview" ? PREVIEW_ACCEPT : SOURCE_ACCEPT} onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
      {mine.length > 0 && (
        <ul className="mt-2 space-y-1">
          {mine.map((f) => (
            <li key={f.id} className="flex items-center gap-2 rounded-md bg-gray-50 px-2 py-1.5 text-small">
              <span className="size-8 flex-shrink-0 overflow-hidden rounded"><FileThumb file={f} className="size-8" /></span>
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="text-caption text-gray-400">{formatBytes(f.size)}</span>
              <button type="button" onClick={() => onChange((current) => current.filter((x) => x.id !== f.id))} aria-label={`Remover ${f.name}`} className="text-gray-400 hover:text-red-600"><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
