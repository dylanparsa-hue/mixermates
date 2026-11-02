import type { MetadataRoute } from "next";
export default function robots():MetadataRoute.Robots {
  // Preview release has no public sitemap or indexed private routes.
  return {rules:{userAgent:"*",disallow:"/"}};
}
