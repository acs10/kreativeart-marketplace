/** Perfis de acesso da plataforma. */
export type Role = "client" | "designer" | "admin";

export const ROLE_LABEL: Record<Role, string> = { client: "Cliente", designer: "Designer", admin: "KreativeArt" };
export const ROLE_HOME: Record<Role, string> = { client: "/cliente", designer: "/designer", admin: "/admin" };

export const PIX_KEY_TYPES = ["CPF", "CNPJ", "E-mail", "Telefone", "Chave aleatória"] as const;
export type PixKeyType = (typeof PIX_KEY_TYPES)[number];

export const SPECIALTIES = ["Social media", "Reels e vídeo", "Identidade visual", "Ilustração", "Impressos", "Web e banners"] as const;
export type Specialty = (typeof SPECIALTIES)[number];

/** Identidade visual do cliente, usada pelos designers em todos os pedidos. */
export interface BrandKit {
  logoUrl: string;
  colors: string[];
  fonts: string;
  tone: string;
  notes: string;
}

export interface Account {
  id: string;
  role: Role;
  name: string;
  email: string;
  /** SHA-256 da senha (protótipo). Na versão com servidor: Firebase Authentication. */
  passwordHash: string;
  phone: string;
  status: "active" | "pending" | "suspended";
  createdAt: string;

  // ---- cliente ----
  company?: string;
  /** CPF ou CNPJ */
  document?: string;
  instagram?: string;
  brand?: BrandKit;

  // ---- designer ----
  bio?: string;
  specialties?: Specialty[];
  portfolioUrl?: string;
  pixKeyType?: PixKeyType;
  pixKey?: string;
  /** Capacidade declarada: quantas entregas consegue fazer por semana. */
  weeklyCapacity?: number;
  /** Conta Mercado Pago conectada (divisão automática dos pagamentos). Os tokens ficam só no servidor. */
  mercadoPago?: { userId: string; connectedAt: string; expiresAt: string };
}

export type SignupInput = {
  role: "client" | "designer";
  name: string;
  email: string;
  password: string;
  phone: string;
  company?: string;
  document?: string;
  instagram?: string;
  bio?: string;
  specialties?: Specialty[];
  portfolioUrl?: string;
  pixKeyType?: PixKeyType;
  pixKey?: string;
  weeklyCapacity?: number;
};

export const emptyBrand = (): BrandKit => ({ logoUrl: "", colors: [], fonts: "", tone: "", notes: "" });

/** Nome exibido: empresa para clientes, nome para os demais. */
export const displayName = (a: Pick<Account, "name" | "company" | "role">) => (a.role === "client" && a.company ? a.company : a.name);
