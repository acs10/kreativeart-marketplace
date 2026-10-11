/**
 * Cofre de acessos: o cliente guarda o login das redes sociais para o designer publicar.
 * Regras: só o designer de um pedido ATIVO do cliente pode revelar; toda revelação fica
 * registrada e o cliente vê quem acessou e quando; o cliente pode revogar a qualquer momento.
 * ⚠️ Protótipo: os dados ficam no navegador. Na versão com servidor serão criptografados
 * (chave fora do banco) e só descriptografados no servidor para o designer autorizado.
 */
export const VAULT_PLATFORMS = ["Instagram", "Facebook", "TikTok", "LinkedIn", "YouTube", "Outra"] as const;
export type VaultPlatform = (typeof VAULT_PLATFORMS)[number];

export interface AccessLog {
  id: string;
  designerId: string;
  designerName: string;
  at: string;
}

export interface Credential {
  id: string;
  clientId: string;
  platform: VaultPlatform;
  /** @usuário ou e-mail de login */
  login: string;
  secret: string;
  /** Como receber o código de 2 fatores (ex.: "SMS para (63) 9…") */
  twoFactor: string;
  notes: string;
  /** false = designer não consegue revelar (cliente pausou o acesso) */
  shared: boolean;
  logs: AccessLog[];
  createdAt: string;
  updatedAt: string;
}

export type CredentialInput = Pick<Credential, "platform" | "login" | "secret" | "twoFactor" | "notes" | "shared">;
