import type { Metadata } from "next";
import { ClientCalendar } from "@/modules/areas/client/ClientArea";

export const metadata: Metadata = { title: "Calendário" };

export default function Page() {
  return <ClientCalendar />;
}
