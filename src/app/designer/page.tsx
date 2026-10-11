import type { Metadata } from "next";
import { DesignerDashboard } from "@/modules/areas/designer/DesignerArea";

export const metadata: Metadata = { title: "Área do designer" };

export default function Page() {
  return <DesignerDashboard />;
}
