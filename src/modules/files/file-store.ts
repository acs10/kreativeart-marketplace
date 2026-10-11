"use client";

import type { FileRef } from "@/modules/jobs/domain/types";
import { canBePreview, extOf, isAccepted, MAX_FILE_MB, PREVIEW_FORMATS, previewKind } from "./formats";

/**
 * Arquivos das entregas: enviados ao servidor em partes de até 4 MB (limite das funções do
 * Netlify) e guardados no Netlify Blobs. Para exibir, o navegador baixa as partes (só quem
 * pode ver a peça consegue) e monta o arquivo de volta.
 */
interface UploadStart {
  id?: string;
  parts?: number;
  partSize?: number;
  error?: string;
}

async function upload(blob: Blob, name: string, mime: string): Promise<{ id: string } | { error: string }> {
  let start: UploadStart;
  try {
    const res = await fetch("/api/files", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, size: blob.size, mime }) });
    start = (await res.json()) as UploadStart;
    if (!res.ok || !start.id || !start.parts || !start.partSize) return { error: start.error ?? `"${name}": não foi possível iniciar o envio.` };
  } catch {
    return { error: `"${name}": sem conexão com o servidor.` };
  }
  for (let part = 0; part < start.parts; part++) {
    const chunk = blob.slice(part * start.partSize, (part + 1) * start.partSize);
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      try {
        ok = (await fetch(`/api/files/${start.id}/${part}`, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: chunk })).ok;
      } catch {
        ok = false;
      }
    }
    if (!ok) return { error: `"${name}": o envio foi interrompido. Tente de novo.` };
  }
  return { id: start.id };
}

/** Arquivos já baixados nesta aba (o mesmo arquivo aparece em várias telas). */
const downloads = new Map<string, Promise<Blob | null>>();

async function download(id: string): Promise<Blob | null> {
  const meta = await fetch(`/api/files/${id}`).then((r) => (r.ok ? (r.json() as Promise<{ parts: number; mime: string }>) : null)).catch(() => null);
  if (!meta) return null;
  const parts: ArrayBuffer[] = [];
  for (let part = 0; part < meta.parts; part++) {
    const res = await fetch(`/api/files/${id}/${part}`).catch(() => null);
    if (!res?.ok) return null;
    parts.push(await res.arrayBuffer());
  }
  return new Blob(parts, { type: meta.mime || "application/octet-stream" });
}

export function getBlob(id: string): Promise<Blob | null> {
  let p = downloads.get(id);
  if (!p) {
    p = download(id);
    downloads.set(id, p);
    void p.then((b) => {
      if (!b) downloads.delete(id); // tenta de novo na próxima vez
    });
  }
  return p;
}

/** Miniatura do PSD: a imagem composta que o Photoshop salva junto (padrão "maximizar compatibilidade"). */
async function psdThumbnail(file: File): Promise<Blob | null> {
  const { readPsd } = await import("ag-psd");
  const psd = readPsd(await file.arrayBuffer(), { skipLayerImageData: true, skipThumbnail: false, useImageData: false });
  const canvas = psd.canvas as HTMLCanvasElement | undefined;
  if (!canvas) return null;
  return new Promise((r) => canvas.toBlob((b) => r(b), "image/png"));
}

/** Miniatura do CDR: arquivos do CorelDRAW X4 em diante são um ZIP com previews/thumbnail.png. */
async function cdrThumbnail(file: File): Promise<Blob | null> {
  const { unzipSync } = await import("fflate");
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: (f) => /thumbnail\.(png|bmp)$/i.test(f.name) });
  const entry = Object.entries(files)[0];
  return entry ? new Blob([entry[1] as BlobPart], { type: entry[0].toLowerCase().endsWith("png") ? "image/png" : "image/bmp" }) : null;
}

export interface UploadResult {
  ref?: FileRef;
  warning?: string;
  error?: string;
}

/** Valida, guarda e (para PSD/CDR) gera a miniatura. */
export async function saveFile(file: File, kind: FileRef["kind"]): Promise<UploadResult> {
  const ext = extOf(file.name);
  if (!isAccepted(ext)) return { error: `"${file.name}": formato .${ext || "?"} não aceito.` };
  if (kind === "preview" && !canBePreview(ext)) return { error: `"${file.name}": a prévia precisa ser JPG, PNG, WEBP, GIF, SVG, MP4, WEBM, MOV ou PDF. Envie o .${ext} em "Arquivos finais".` };
  if (file.size > MAX_FILE_MB * 1024 * 1024) return { error: `"${file.name}" passa de ${MAX_FILE_MB} MB.` };
  const mime = file.type || (PREVIEW_FORMATS as Record<string, string>)[ext] || "application/octet-stream";
  const sent = await upload(file, file.name, mime);
  if ("error" in sent) return { error: sent.error };
  downloads.set(sent.id, Promise.resolve(file));
  const ref: FileRef = { id: sent.id, name: file.name, size: file.size, mime, ext, kind };
  let warning: string | undefined;
  const pk = previewKind(ext);
  if (pk === "psd" || pk === "cdr") {
    try {
      const thumb = pk === "psd" ? await psdThumbnail(file) : await cdrThumbnail(file);
      const sentThumb = thumb ? await upload(thumb, `${file.name}.miniatura.png`, thumb.type) : null;
      if (sentThumb && "id" in sentThumb) {
        ref.thumbId = sentThumb.id;
        downloads.set(sentThumb.id, Promise.resolve(thumb));
      } else if (thumb) warning = `"${file.name}": a miniatura não foi enviada; o cliente verá só o ícone.`;
      else warning = `"${file.name}": sem miniatura embutida. O cliente verá só o ícone; envie também um PNG/JPG de prévia.`;
    } catch {
      warning = `"${file.name}": não foi possível gerar a miniatura (versão antiga ou arquivo protegido).`;
    }
  }
  if (ext === "mov") warning = `"${file.name}": vídeos .MOV nem sempre tocam no navegador. Prefira MP4 (H.264) para a prévia.`;
  return { ref, warning };
}

/** URL para exibir ou baixar (link externo dos dados demonstrativos ou arquivo do servidor). */
export async function fileUrl(ref: Pick<FileRef, "id" | "url" | "ext">, useThumb?: string): Promise<string | null> {
  if (ref.url && !useThumb) return ref.url;
  const blob = await getBlob(useThumb ?? ref.id);
  if (!blob) return null;
  // AI compatível com PDF: abre no visualizador de PDF do navegador.
  const typed = ref.ext === "ai" && !useThumb ? new Blob([blob], { type: "application/pdf" }) : blob;
  return URL.createObjectURL(typed);
}
