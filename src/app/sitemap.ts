import type { MetadataRoute } from "next";

const URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastMod = new Date().toISOString().split("T")[0];

  return [
    { url: URL, lastModified: lastMod, changeFrequency: "monthly", priority: 1 },
    { url: `${URL}/login`, lastModified: lastMod, changeFrequency: "yearly", priority: 0.3 },
    { url: `${URL}/register`, lastModified: lastMod, changeFrequency: "yearly", priority: 0.3 },
    { url: `${URL}/terms`, lastModified: lastMod, changeFrequency: "yearly", priority: 0.4 },
    { url: `${URL}/privacy`, lastModified: lastMod, changeFrequency: "yearly", priority: 0.4 },
    { url: `${URL}/cookies`, lastModified: lastMod, changeFrequency: "yearly", priority: 0.2 },
  ];
}
