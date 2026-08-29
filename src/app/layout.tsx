import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCategoriesWithSubcategories } from "@/lib/categories";
import { clientEnv } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(clientEnv.NEXT_PUBLIC_APP_URL),
  title: {
    default: `${clientEnv.NEXT_PUBLIC_SITE_NAME} — Buy. Sell. Find. For Just $1.`,
    template: `%s | ${clientEnv.NEXT_PUBLIC_SITE_NAME}`,
  },
  description: "Post a listing for $1 and keep it live for 45 days. A modern, fast classifieds marketplace for your community.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: clientEnv.NEXT_PUBLIC_SITE_NAME,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategoriesWithSubcategories();

  return (
    <html lang="en" className="h-full antialiased">
      <body
        className="flex min-h-full flex-col"
        style={{
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'",
        }}
      >
        <Providers>
          <SiteHeader categories={categories} />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
