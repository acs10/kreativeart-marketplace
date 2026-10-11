import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupPage } from "@/modules/auth/components/AuthPages";

export const metadata: Metadata = { title: "Cadastro" };

export default function Page() {
  return (
    <Suspense>
      <SignupPage role="designer" />
    </Suspense>
  );
}
