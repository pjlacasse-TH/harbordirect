import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";
import ThemeProvider from "@/components/ThemeProvider";
import { BrandProvider } from "@/components/BrandProvider";
import { getSite, toBrand } from "@/lib/portal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    title: site.tagline ? `${site.brand_name} — ${site.tagline}` : site.brand_name,
    description: `Customer ordering portal${site.tagline ? ` for ${site.tagline}` : ''}`,
  };
}

// Brand colours come from portal_sites at request time; every page reads them as CSS variables.
export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const site = await getSite();
  const brandVars = {
    '--brand': site.primary_color,
    '--brand-hover': site.primary_hover,
  } as React.CSSProperties;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body style={brandVars} className="min-h-full flex flex-col bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <BrandProvider brand={toBrand(site)}>
          <ThemeProvider>
            {children}
            <Footer />
          </ThemeProvider>
        </BrandProvider>
      </body>
    </html>
  );
}
