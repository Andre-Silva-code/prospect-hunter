import React from "react";
import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Prospect Hunter | Sistema de prospecção",
  description:
    "Sistema de prospecção para agências de tráfego pago com ICP, qualificação, cadência e gestão de oportunidades.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="pt-BR">
      <body className={`${spaceGrotesk.variable} ${ibmPlexSans.variable}`}>{children}</body>
    </html>
  );
}
