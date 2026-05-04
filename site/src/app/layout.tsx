import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { editionData } from "@/content/edition";

const climax = localFont({
  src: "./fonts/Climax.woff2",
  variable: "--font-display",
  display: "swap",
});

const gotham = localFont({
  src: [
    {
      path: "./fonts/gotham-medium-local.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/gotham-bold-local.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: `ASTRO SDQ — ${editionData.location.replace("\n", " ")}`,
  description: `${editionData.title} · ${editionData.coordinates}`,
  icons: {
    icon: "/favicon.ico",
    apple: "/astro/logo-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${climax.variable} ${gotham.variable}`}>
      <body>{children}</body>
    </html>
  );
}
