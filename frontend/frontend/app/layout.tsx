import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agentic AI Business Research System",
  description:
    "Transform business research objectives into structured, evidence-based reports using autonomous AI agents for market, company, competitor, analysis, writing, and review.",
  generator: "Next.js",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#09090B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}

        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}