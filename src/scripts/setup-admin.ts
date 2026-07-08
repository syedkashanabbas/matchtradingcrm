import { prisma } from '../config/prisma';
import bcrypt from 'bcrypt';

async function setupAdmin() {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'exonomaai@gmail.com' },
    });

    if (existingAdmin) {
      // Update existing user to admin role
      const adminUser = await prisma.user.update({
        where: { email: 'exonomaai@gmail.com' },
        data: { 
          role: 'ADMIN',
          status: 'ACTIVE'
        },
      });
      console.log('✅ Admin user updated:', adminUser.email);
    } else {
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123$!@#$', 10);
      const adminUser = await prisma.user.create({
        data: {
          email: 'exonomaai@gmail.com',
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'User',
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });
      console.log('✅ Admin user created:', adminUser.email);
    }

    // Create a test client user if not exists
    const existingClient = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });

    if (!existingClient) {
      const clientPassword = await bcrypt.hash('password123', 10);
      const clientUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: clientPassword,
          firstName: 'Test',
          lastName: 'Client',
          role: 'CLIENT',
          status: 'ACTIVE',
        },
      });
      console.log('✅ Test client user created:', clientUser.email);
    } else {
      console.log('✅ Test client user exists:', existingClient.email);
    }

  } catch (error) {
    console.error('❌ Setup error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdmin();
