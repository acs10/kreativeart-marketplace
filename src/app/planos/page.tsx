import type { Metadata } from "next";
import { PlansPage } from "@/modules/site/SitePages";

export const metadata: Metadata = { title: "Planos mensais" };

export default function Page() {
  return <PlansPage />;
}
