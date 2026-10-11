import type { Metadata } from "next";
import { AdminClients } from "@/modules/areas/admin/AdminArea";

export const metadata: Metadata = { title: "Clientes" };

export default function Page() {
  return <AdminClients />;
}
