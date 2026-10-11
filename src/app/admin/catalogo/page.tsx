import type { Metadata } from "next";
import { AdminCatalog } from "@/modules/areas/admin/AdminArea";

export const metadata: Metadata = { title: "Serviços e planos" };

export default function Page() {
  return <AdminCatalog />;
}
