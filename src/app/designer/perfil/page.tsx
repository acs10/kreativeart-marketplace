import type { Metadata } from "next";
import { DesignerProfile } from "@/modules/areas/designer/DesignerArea";

export const metadata: Metadata = { title: "Perfil e PIX" };

export default function Page() {
  return <DesignerProfile />;
}
