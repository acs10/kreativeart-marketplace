import type { Metadata } from "next";
import { ClientOrders } from "@/modules/areas/client/ClientArea";

export const metadata: Metadata = { title: "Meus pedidos" };

export default function Page() {
  return <ClientOrders />;
}
