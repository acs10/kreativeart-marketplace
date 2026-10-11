import type { Metadata } from "next";
import { ServicesPage } from "@/modules/site/SitePages";

export const metadata: Metadata = { title: "Serviços" };

export default function Page() {
  return <ServicesPage />;
}
