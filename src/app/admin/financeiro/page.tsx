import type { Metadata } from "next";
import { AdminFinance } from "@/modules/areas/admin/AdminArea";

export const metadata: Metadata = { title: "Financeiro" };

export default function Page() {
  return <AdminFinance />;
}
