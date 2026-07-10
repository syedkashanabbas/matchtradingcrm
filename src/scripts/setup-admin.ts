import { prisma } from '../config/prisma';
import bcrypt from 'bcrypt';

/**
 * Creates or updates the admin user from env (D2).
 * Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... npx ts-node src/scripts/setup-admin.ts
 */
async function setupAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD env vars are required');
    process.exit(1);
  }

  if (password.length < 12) {
    console.error('❌ ADMIN_PASSWORD must be at least 12 characters');
    process.exit(1);
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.user.upsert({
      where: { email },
      update: {
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      create: {
        email,
        password: hashedPassword,
        firstName: process.env.ADMIN_FIRST_NAME || 'EIDOS',
        lastName: process.env.ADMIN_LAST_NAME || 'Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
      },
    });

    console.log('✅ Admin user ready:', admin.email);
  } catch (error) {
    console.error('❌ Setup error:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

setupAdmin();
