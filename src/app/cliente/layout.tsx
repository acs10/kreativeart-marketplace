import type { ReactNode } from "react";
import { ClientLayout } from "@/modules/areas/client/ClientArea";

export default function Layout({ children }: { children: ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}
