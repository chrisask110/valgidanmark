import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/"],
    },
    sitemap: "https://valgidanmark.dk/sitemap.xml",
    host: "https://valgidanmark.dk",
  };
}
