import type { Metadata } from "next";
import { ClientDashboard } from "@/modules/areas/client/ClientArea";

export const metadata: Metadata = { title: "Área do cliente" };

export default function Page() {
  return <ClientDashboard />;
}
