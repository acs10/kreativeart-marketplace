import type { Metadata } from "next";
import { AdminJobs } from "@/modules/areas/admin/AdminArea";

export const metadata: Metadata = { title: "Entregas" };

export default function Page() {
  return <AdminJobs />;
}
