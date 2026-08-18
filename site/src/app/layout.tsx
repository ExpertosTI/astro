import type { Metadata } from "next";
import localFont from "next/font/local";
import { AstroNativeBridge } from "@/components/AstroNativeBridge";
import "./globals.css";

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
  title: {
    default: "ASTRO — Santo Domingo",
    template: "%s",
  },
  description:
    "ASTRO Match, noticias, comunidad y toda la experiencia ASTRO SDQ.",
  manifest: "/astro-manifest.json",
  icons: {
    icon: "/astro/logo-icon.png",
    apple: "/astro/logo-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ASTRO",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${climax.variable} ${gotham.variable}`}>
      <body>
        <AstroNativeBridge />
        {children}
      </body>
    </html>
  );
}
