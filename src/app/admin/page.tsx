import type { Metadata } from "next";
import { AdminDashboard } from "@/modules/areas/admin/AdminArea";

export const metadata: Metadata = { title: "Painel" };

export default function Page() {
  return <AdminDashboard />;
}
