/**
 * Lê uma imagem enviada pelo usuário e devolve um data URL JPEG reduzido
 * (máx. 1080px), para caber no armazenamento do navegador.
 * Quando houver backend, o arquivo original irá para um storage de arquivos.
 */
export async function resizeImage(file: File, maxSize = 1080, quality = 0.82): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Envie um arquivo de imagem (PNG, JPG ou WEBP).");
  if (file.size > 10 * 1024 * 1024) throw new Error("A imagem deve ter até 10 MB.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}
