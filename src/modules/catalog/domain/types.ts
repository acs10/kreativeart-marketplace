import type { Specialty } from "@/modules/accounts/domain/types";

/** Tipos de peça que um designer entrega. Cada uma tem prazo e formatos próprios. */
export const DELIVERABLE_TYPES = ["Post de feed", "Carrossel", "Reels", "Stories", "Logo", "Identidade visual", "Banner / capa", "Material impresso", "Ilustração"] as const;
export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];

/** Peças de redes sociais têm data de publicação; as demais, só a entrega. */
export const SOCIAL_TYPES: DeliverableType[] = ["Post de feed", "Carrossel", "Reels", "Stories"];

export interface Service {
  id: string;
  name: string;
  description: string;
  category: Specialty;
  deliverable: DeliverableType;
  /** Preço por unidade, em reais */
  price: number;
  /** Prazo para a primeira versão, em dias corridos */
  deliveryDays: number;
  /** Rodadas de ajuste incluídas */
  revisions: number;
  active: boolean;
}

export interface PlanItem {
  serviceId: string;
  /** Quantidade por mês */
  quantity: number;
}

/** Pacote mensal (contrato): conjunto de serviços com preço fechado por mês. */
export interface Plan {
  id: string;
  name: string;
  tagline: string;
  items: PlanItem[];
  monthlyPrice: number;
  /** Fidelidade mínima, em meses */
  minMonths: number;
  highlight: boolean;
  active: boolean;
}

/** Soma dos itens avulsos — usada para mostrar a economia do pacote. */
export function planListPrice(plan: Plan, services: Service[]): number {
  return plan.items.reduce((sum, item) => sum + (services.find((s) => s.id === item.serviceId)?.price ?? 0) * item.quantity, 0);
}

export function planUnits(plan: Plan): number {
  return plan.items.reduce((sum, i) => sum + i.quantity, 0);
}
