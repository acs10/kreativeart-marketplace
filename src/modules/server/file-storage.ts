import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStore } from "@netlify/blobs";
import { nodeFetch } from "./node-fetch";

/** Partes de até 4 MB: cabem no limite de 6 MB por requisição das funções do Netlify. */
export const PART_SIZE = 4 * 1024 * 1024;

export interface StoredFileMeta {
  id: string;
  ownerId: string;
  name: string;
  size: number;
  mime: string;
  ext: string;
  parts: number;
  createdAt: string;
}

/**
 * Arquivos das entregas. Produção: Netlify Blobs (incluso no Netlify; o Firebase Storage exige
 * o plano pago). Desenvolvimento (FILE_STORE=local): pasta .data/files.
 * Cada arquivo = metadados + partes "<id>/0", "<id>/1"…; o navegador junta as partes.
 */
interface FileStorage {
  putMeta(meta: StoredFileMeta): Promise<void>;
  getMeta(id: string): Promise<StoredFileMeta | null>;
  putPart(id: string, part: number, bytes: Uint8Array): Promise<void>;
  getPart(id: string, part: number): Promise<Uint8Array | null>;
}

class BlobsStorage implements FileStorage {
  private store() {
    return getStore({ name: "kreativeart-files", fetch: nodeFetch, consistency: "strong" });
  }
  async putMeta(meta: StoredFileMeta) {
    await this.store().setJSON(`${meta.id}/meta`, meta);
  }
  async getMeta(id: string) {
    return ((await this.store().get(`${id}/meta`, { type: "json" })) as StoredFileMeta | null) ?? null;
  }
  async putPart(id: string, part: number, bytes: Uint8Array) {
    await this.store().set(`${id}/${part}`, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  }
  async getPart(id: string, part: number) {
    const data = await this.store().get(`${id}/${part}`, { type: "arrayBuffer" });
    return data ? new Uint8Array(data) : null;
  }
}

class LocalStorage implements FileStorage {
  private dir = path.join(process.cwd(), ".data", "files");
  private async ensure() {
    await mkdir(this.dir, { recursive: true });
  }
  async putMeta(meta: StoredFileMeta) {
    await this.ensure();
    await writeFile(path.join(this.dir, `${meta.id}.json`), JSON.stringify(meta));
  }
  async getMeta(id: string) {
    try {
      return JSON.parse(await readFile(path.join(this.dir, `${id}.json`), "utf8")) as StoredFileMeta;
    } catch {
      return null;
    }
  }
  async putPart(id: string, part: number, bytes: Uint8Array) {
    await this.ensure();
    await writeFile(path.join(this.dir, `${id}.${part}`), bytes);
  }
  async getPart(id: string, part: number) {
    try {
      return new Uint8Array(await readFile(path.join(this.dir, `${id}.${part}`)));
    } catch {
      return null;
    }
  }
}

export const fileStorage = (): FileStorage => (process.env.FILE_STORE === "local" ? new LocalStorage() : new BlobsStorage());
