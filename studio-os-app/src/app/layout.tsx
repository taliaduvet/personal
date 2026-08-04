import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { GoogleGsiPreload } from "@/components/GoogleGsiPreload";

const display = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const serif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Studio OS",
  description: "A calm task, project & calendar system for independent artists.",
  applicationName: "Studio OS",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Studio OS" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#5b61e8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${serif.variable} h-full`}>
      <body className="min-h-full">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('studio-os:theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');else if(t==='light')document.documentElement.setAttribute('data-theme','light');})();`,
          }}
        />
        <GoogleGsiPreload />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
