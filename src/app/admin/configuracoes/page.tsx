import type { Metadata } from "next";
import { AdminSettings } from "@/modules/areas/admin/AdminArea";

export const metadata: Metadata = { title: "Configurações" };

export default function Page() {
  return <AdminSettings />;
}
