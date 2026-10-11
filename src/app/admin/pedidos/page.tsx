import type { Metadata } from "next";
import { AdminOrders } from "@/modules/areas/admin/AdminArea";

export const metadata: Metadata = { title: "Pedidos" };

export default function Page() {
  return <AdminOrders />;
}
