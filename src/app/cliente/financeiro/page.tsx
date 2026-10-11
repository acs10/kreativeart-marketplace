import type { Metadata } from "next";
import { ClientFinance } from "@/modules/areas/client/ClientArea";

export const metadata: Metadata = { title: "Financeiro" };

export default function Page() {
  return <ClientFinance />;
}
