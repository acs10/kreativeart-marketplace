import type { Metadata } from "next";
import { AdminInsights } from "@/modules/areas/admin/AdminArea";

export const metadata: Metadata = { title: "Inteligência" };

export default function Page() {
  return <AdminInsights />;
}
