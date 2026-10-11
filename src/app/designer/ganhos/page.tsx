import type { Metadata } from "next";
import { DesignerEarnings } from "@/modules/areas/designer/DesignerArea";

export const metadata: Metadata = { title: "Ganhos" };

export default function Page() {
  return <DesignerEarnings />;
}
