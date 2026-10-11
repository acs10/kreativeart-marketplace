import type { ReactNode } from "react";
import { DesignerLayout } from "@/modules/areas/designer/DesignerArea";

export default function Layout({ children }: { children: ReactNode }) {
  return <DesignerLayout>{children}</DesignerLayout>;
}
