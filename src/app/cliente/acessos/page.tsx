import type { Metadata } from "next";
import { ClientVault } from "@/modules/areas/client/ClientArea";

export const metadata: Metadata = { title: "Acessos" };

export default function Page() {
  return <ClientVault />;
}
