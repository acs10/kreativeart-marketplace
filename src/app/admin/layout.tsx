import type { ReactNode } from "react";
import { AdminLayout } from "@/modules/areas/admin/AdminArea";

export default function Layout({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
