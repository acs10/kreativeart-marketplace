import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContractPage } from "@/modules/site/ContractPage";

export const metadata: Metadata = { title: "Contratar" };

export default async function Page({ params }: { params: Promise<{ tipo: string; id: string }> }) {
  const { tipo, id } = await params;
  if (tipo !== "servico" && tipo !== "plano") notFound();
  return <ContractPage kind={tipo} id={id} />;
}
