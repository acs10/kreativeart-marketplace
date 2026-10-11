import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginPage } from "@/modules/auth/components/AuthPages";

export const metadata: Metadata = { title: "Entrar" };

export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
