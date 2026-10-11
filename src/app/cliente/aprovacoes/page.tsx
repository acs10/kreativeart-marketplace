import type { Metadata } from "next";
import { ClientApprovals } from "@/modules/areas/client/ClientArea";

export const metadata: Metadata = { title: "Aprovações" };

export default function Page() {
  return <ClientApprovals />;
}
