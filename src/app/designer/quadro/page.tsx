import type { Metadata } from "next";
import { DesignerBoard } from "@/modules/areas/designer/DesignerArea";

export const metadata: Metadata = { title: "Quadro de produção" };

export default function Page() {
  return <DesignerBoard />;
}
