// Update existing Prop Firm accounts with proper status values
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updatePropStatuses() {
  try {
    // Get all Prop Firm accounts
    const propAccounts = await prisma.propAccount.findMany();

    console.log(`Found ${propAccounts.length} Prop Firm accounts`);

    // Update each account with a different status
    const statuses = ['REVIEW', 'PENDING', 'CERTIFIED', 'ACTIVE'];
    
    for (let i = 0; i < propAccounts.length; i++) {
      const account = propAccounts[i];
      const status = statuses[i % statuses.length]; // Cycle through statuses
      
      await prisma.propAccount.update({
        where: { id: account.id },
        data: { status }
      });
      
      console.log(`Updated ${account.firmName} (${account.mt5AccountNumber}) to status: ${status}`);
    }

    console.log('All Prop Firm accounts updated successfully!');
  } catch (error) {
    console.error('Error updating Prop Firm accounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePropStatuses();
