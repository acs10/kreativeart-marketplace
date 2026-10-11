import type { Metadata } from "next";
import { AdminDesigners } from "@/modules/areas/admin/AdminArea";

export const metadata: Metadata = { title: "Designers" };

export default function Page() {
  return <AdminDesigners />;
}
