import type { Metadata } from "next";
import { DesignerCalendar } from "@/modules/areas/designer/DesignerArea";

export const metadata: Metadata = { title: "Calendário" };

export default function Page() {
  return <DesignerCalendar />;
}
