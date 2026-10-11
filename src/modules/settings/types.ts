import type { PixKeyType } from "@/modules/accounts/domain/types";

/** Configurações da KreativeArt (dados FICTÍCIOS até o cliente informar os reais). */
export interface Settings {
  companyName: string;
  cnpj: string;
  email: string;
  phone: string;
  city: string;
  instagram: string;
  /** Chave PIX da KreativeArt para receber a comissão */
  pixKeyType: PixKeyType;
  pixKey: string;
  /** Comissão sobre cada cobrança paga (0,10 = 10%) */
  commissionRate: number;
  /** Dias de tolerância após o vencimento antes de pausar a produção */
  graceDays: number;
  /** Meta de entregas no prazo (0,9 = 90%) */
  onTimeGoal: number;
  /** A partir de quantas entregas atrasadas o designer entra em alerta */
  lateAlert: number;
}

export const defaultSettings = (): Settings => ({
  companyName: "KreativeArt Design Ltda.",
  cnpj: "00.000.000/0001-00",
  email: "contato@kreativeart.com",
  phone: "(63) 99999-0000",
  city: "Palmas – TO",
  instagram: "@kreativeart",
  pixKeyType: "CNPJ",
  pixKey: "00.000.000/0001-00",
  commissionRate: 0.1,
  graceDays: 5,
  onTimeGoal: 0.9,
  lateAlert: 2,
});
