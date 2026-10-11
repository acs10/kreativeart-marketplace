/**
 * Porta de persistência da plataforma. Hoje: navegador (localStorage).
 * Depois: implementar com o banco escolhido (NoSQL + API) sem alterar as telas.
 */
export interface Repository<T> {
  load(): T | null;
  /** Devolve false se não conseguiu gravar (ex.: armazenamento cheio). */
  save(data: T): boolean;
  clear(): void;
}

export class LocalStorageRepository<T> implements Repository<T> {
  constructor(private readonly key: string) {}

  load(): T | null {
    try {
      const raw = window.localStorage.getItem(this.key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  save(data: T): boolean {
    try {
      window.localStorage.setItem(this.key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      window.localStorage.removeItem(this.key);
    } catch {
      // ignorado
    }
  }
}
