import type { MetadataRoute } from "next";
import { clientEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/admin/", "/api/", "/post/", "/search"],
      },
    ],
    sitemap: `${clientEnv.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  };
}
