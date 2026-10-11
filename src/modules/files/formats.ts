/**
 * Formatos aceitos nas entregas.
 * - PRÉVIA (o cliente vê e aprova): imagens, vídeo e PDF — abrem direto no navegador.
 * - FINAIS / EDITÁVEIS (download após aprovação): arquivos do Photoshop, Illustrator, CorelDRAW etc.
 *   PSD e CDR ganham miniatura automática; AI (com "compatível com PDF", o padrão do Illustrator) abre como PDF.
 */
export const PREVIEW_FORMATS = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  pdf: "application/pdf",
} as const;

export const SOURCE_FORMATS = {
  psd: "Photoshop",
  ai: "Illustrator",
  cdr: "CorelDRAW",
  eps: "EPS (vetor)",
  svg: "SVG (vetor)",
  pdf: "PDF",
  tif: "TIFF",
  tiff: "TIFF",
  indd: "InDesign",
  afdesign: "Affinity Designer",
  xd: "Adobe XD",
  fig: "Figma",
  aep: "After Effects",
  prproj: "Premiere",
  zip: "Pacote ZIP",
  rar: "Pacote RAR",
  png: "PNG",
  jpg: "JPG",
  jpeg: "JPG",
  mp4: "Vídeo MP4",
  mov: "Vídeo MOV",
} as const;

export type PreviewKind = "image" | "video" | "pdf" | "psd" | "cdr" | "ai" | "none";

/** Limite por arquivo no protótipo (armazenamento do navegador). */
export const MAX_FILE_MB = 60;

export const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

export function previewKind(ext: string): PreviewKind {
  if (["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext)) return "image";
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  if (ext === "pdf") return "pdf";
  if (ext === "psd") return "psd";
  if (ext === "cdr") return "cdr";
  if (ext === "ai") return "ai";
  return "none";
}

export function canBePreview(ext: string): boolean {
  return ext in PREVIEW_FORMATS;
}

export function isAccepted(ext: string): boolean {
  return ext in PREVIEW_FORMATS || ext in SOURCE_FORMATS;
}

export const PREVIEW_ACCEPT = Object.keys(PREVIEW_FORMATS).map((e) => `.${e}`).join(",");
export const SOURCE_ACCEPT = Object.keys(SOURCE_FORMATS).map((e) => `.${e}`).join(",");

/** Formato recomendado de prévia por tipo de peça (dica para o designer). */
export const PREVIEW_TIPS: Record<string, string> = {
  "Post de feed": "PNG ou JPG 1080×1350 (4:5) ou 1080×1080",
  Carrossel: "Um PNG/JPG por lâmina, 1080×1350, na ordem",
  Reels: "MP4 (H.264) 1080×1920, até 90 s",
  Stories: "PNG/JPG ou MP4 1080×1920",
  Logo: "PNG com fundo transparente + PDF de apresentação",
  "Identidade visual": "PDF do manual da marca",
  "Banner / capa": "PNG/JPG no tamanho final",
  "Material impresso": "PDF com marcas de corte",
  Ilustração: "PNG/JPG em alta",
};
