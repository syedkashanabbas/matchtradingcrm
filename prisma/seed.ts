import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

/**
 * Seeds the admin user from env (D2): no hardcoded credentials in the repo.
 * Required env vars: ADMIN_EMAIL, ADMIN_PASSWORD.
 */
async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD env vars are required to seed the admin user"
    );
  }

  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      email,
      password: hashedPassword,
      firstName: process.env.ADMIN_FIRST_NAME || "EIDOS",
      lastName: process.env.ADMIN_LAST_NAME || "Admin",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
    },
  });

  console.log(`✅ Admin user ready: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
