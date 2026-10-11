import type { Metadata } from "next";
import { DesignerOpportunities } from "@/modules/areas/designer/DesignerArea";

export const metadata: Metadata = { title: "Oportunidades" };

export default function Page() {
  return <DesignerOpportunities />;
}
