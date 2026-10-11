import type { Metadata } from "next";
import { ClientProfile } from "@/modules/areas/client/ClientArea";

export const metadata: Metadata = { title: "Perfil e marca" };

export default function Page() {
  return <ClientProfile />;
}
