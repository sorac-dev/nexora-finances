import { defineConfig } from "prisma/config";

try {
  // @ts-ignore
  process.loadEnvFile();
} catch {
  // Fallback if loadEnvFile doesn't exist or .env isn't found
}

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
});
