import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "@/core/theme/fonts";
import { PlatformProvider } from "@/modules/platform/PlatformProvider";
import { getInitialState } from "@/modules/server/initial-state";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "KreativeArt — design sob demanda", template: "%s | KreativeArt" },
  description: "Contrate designers para posts, Reels, logos e identidade visual. Acompanhe, aprove e pague tudo pela plataforma.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const initial = await getInitialState();
  return (
    <html lang="pt-BR" className={fontVariables}>
      <body>
        <PlatformProvider initial={initial}>{children}</PlatformProvider>
      </body>
    </html>
  );
}
