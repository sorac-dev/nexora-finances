import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { hashPassword } from "@better-auth/utils/password";

try { process.loadEnvFile?.(); } catch {}

const DEMO_EMAIL = "demo@demo.com";
const DEMO_PASSWORD = "Demo2026!";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Clean all
  await prisma.installment.deleteMany();
  await prisma.cardPurchase.deleteMany();
  await prisma.recurringEvent.deleteMany();
  await prisma.recurringPayment.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.creditCard.deleteMany();
  await prisma.financialAccount.deleteMany();
  await prisma.category.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.rateLimit.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();

  // User
  const user = await prisma.user.create({
    data: {
      id: "demo-user",
      name: "Demo User",
      email: DEMO_EMAIL,
      emailVerified: true,
      currency: "COP",
      country: "Colombia",
      theme: "dark",
      salaryDay: 30,
    },
  });
  console.log(`  ✅ User: ${user.name}`);

  // Password
  const hashedPw = await hashPassword(DEMO_PASSWORD);
  await prisma.account.create({
    data: { userId: user.id, providerId: "credential", accountId: user.id, password: hashedPw },
  });
  console.log(`  ✅ Password: ${DEMO_PASSWORD}`);

  // Default categories
  await prisma.category.createMany({
    data: [
      { userId: user.id, name: "Comida", icon: "Utensils", color: "#FF9F43", type: "expense", isDefault: true },
      { userId: user.id, name: "Transporte", icon: "Bus", color: "#5AC8FA", type: "expense", isDefault: true },
      { userId: user.id, name: "Entretenimiento", icon: "Bus", color: "#BF5AF2", type: "expense", isDefault: true },
      { userId: user.id, name: "Compras", icon: "ShoppingCart", color: "#FF6B81", type: "expense", isDefault: true },
      { userId: user.id, name: "Salud", icon: "Hospital", color: "#34C759", type: "expense", isDefault: true },
      { userId: user.id, name: "Servicios", icon: "FileText", color: "#FFD60A", type: "expense", isDefault: true },
      { userId: user.id, name: "Educación", icon: "GraduationCap", color: "#0A84FF", type: "expense", isDefault: true },
      { userId: user.id, name: "Viajes", icon: "Plane", color: "#8B5CF6", type: "expense", isDefault: true },
      { userId: user.id, name: "Hogar", icon: "House", color: "#30D5C8", type: "expense", isDefault: true },
      { userId: user.id, name: "Otros", icon: "WalletCards", color: "#8E8E93", type: "expense", isDefault: true },
      { userId: user.id, name: "Salario", icon: "DollarSign", color: "#34C759", type: "income", isDefault: true },
      { userId: user.id, name: "Extras", icon: "Plus", color: "#0A84FF", type: "income", isDefault: true },
    ],
  });
  console.log("  ✅ 13 default categories");

  // Admin user
  const admin = await prisma.user.create({
    data: {
      id: "admin-user",
      name: "Admin",
      email: "admin@nexora.app",
      emailVerified: true,
      role: "ADMIN",
      currency: "COP",
      country: "Colombia",
      theme: "dark",
      salaryDay: 30,
    },
  });
  const adminHashedPw = await hashPassword("Admin2026!");
  await prisma.account.create({
    data: { userId: admin.id, providerId: "credential", accountId: admin.id, password: adminHashedPw },
  });
  console.log(`  ✅ Admin: ${admin.email} / Admin2026!`);

  console.log("\n🎉 Clean seed complete!");
  console.log(`   User: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`   Admin: admin@nexora.app / Admin2026!`);
}

main()
  .catch((e) => { console.error("Seed error:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
