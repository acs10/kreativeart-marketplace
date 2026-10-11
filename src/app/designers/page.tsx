import type { Metadata } from "next";
import { DesignersPage } from "@/modules/site/SitePages";

export const metadata: Metadata = { title: "Seja um designer" };

export default function Page() {
  return <DesignersPage />;
}
