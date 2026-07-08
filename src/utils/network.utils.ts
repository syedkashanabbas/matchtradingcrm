import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

export interface TreeNode {
  id: string;
  name: string;
  level: number;
  status: string;
  children: TreeNode[];
}

interface NetworkStats {
  directReferrals: number;
  totalNetwork: number;
  networkDepth: number;
  activeMembers: number;
  newThisMonth: number;
  newThisWeek: number;
  pendingActivation: number;
}

export async function generateReferralCode(prisma: PrismaClient, userId?: string): Promise<string> {
  let code: string;
  let isUnique = false;
  
  // Generate user ID part (last 6 characters of user ID, uppercase)
  const userIdPart = userId ? userId.substring(userId.length - 6).toUpperCase().replace(/[^A-Z0-9]/g, '') : 'USR';
  
  while (!isUnique) {
    // Generate 5 character alphanumeric code
    const randomPart = randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
    code = `MTR-${userIdPart}-${randomPart}`;
    
    // Check if code is unique
    const existing = await prisma.user.findUnique({
      where: { referralCode: code }
    });
    
    if (!existing) {
      isUnique = true;
    }
  }
  
  return code!;
}

export function buildTreeFromFlat(flatRows: any[]): TreeNode {
  const nodeMap = new Map<string, TreeNode>();
  let rootNode: TreeNode | null = null;
  
  // Create all nodes
  flatRows.forEach(row => {
    const node: TreeNode = {
      id: row.id,
      name: `${row.firstName} ${row.lastName}`,
      level: row.level,
      status: row.status,
      children: []
    };
    nodeMap.set(row.id, node);
    
    // Track the root node (level 0)
    if (row.level === 0) {
      rootNode = node;
    }
  });
  
  // Build tree structure
  flatRows.forEach(row => {
    const node = nodeMap.get(row.id);
    if (node && row.referredByUserId) {
      const parent = nodeMap.get(row.referredByUserId);
      if (parent) {
        parent.children.push(node);
      }
    }
  });
  
  // Return root node or empty tree
  return rootNode || { id: '', name: '', level: 0, status: '', children: [] };
}

export async function checkAndCreateMilestone(userId: string, prisma: PrismaClient): Promise<void> {
  // Count total network size
  const networkCount = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
    WITH RECURSIVE downline AS (
      SELECT id, "referredByUserId"
      FROM "User"
      WHERE "referredByUserId" = $1::text
      
      UNION ALL
      
      SELECT u.id, u."referredByUserId"
      FROM "User" u
      INNER JOIN downline d ON u."referredByUserId"::text = d.id::text
    )
    SELECT COUNT(*)::bigint as count
    FROM downline
  `, userId);
  
  const count = Number(networkCount[0].count);
  const milestones = [10, 25, 50, 100];
  
  if (milestones.includes(count)) {
    // Get user name for message
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true }
    });
    
    if (user) {
      await prisma.networkEvent.create({
        data: {
          userId,
          eventType: 'milestone',
          message: `🎉 Milestone! Your network reached ${count} members`,
        }
      });
    }
  }
}

export async function getNetworkStats(userId: string, prisma: PrismaClient): Promise<NetworkStats> {
  const stats = await prisma.$queryRawUnsafe<Array<{
    directReferrals: bigint;
    totalNetwork: bigint;
    networkDepth: bigint;
    activeMembers: bigint;
    newThisMonth: bigint;
    newThisWeek: bigint;
    pendingActivation: bigint;
  }>>(`
    WITH RECURSIVE downline AS (
      SELECT 
        id, 
        status, 
        "referredByUserId",
        "createdAt",
        1 as level
      FROM "User"
      WHERE "referredByUserId" = $1::text
      
      UNION ALL
      
      SELECT 
        u.id, 
        u.status,
        u."referredByUserId",
        u."createdAt",
        d.level + 1
      FROM "User" u
      INNER JOIN downline d ON u."referredByUserId"::text = d.id::text
    ),
    stats AS (
      SELECT 
        COUNT(*)::bigint as totalNetwork,
        MAX(level)::bigint as networkDepth,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END)::bigint as activeMembers,
        COUNT(CASE WHEN "createdAt" >= date_trunc('month', CURRENT_DATE) THEN 1 END)::bigint as newThisMonth,
        COUNT(CASE WHEN "createdAt" >= date_trunc('week', CURRENT_DATE) THEN 1 END)::bigint as newThisWeek,
        COUNT(CASE WHEN status = 'NEW' OR status = 'ONBOARDING' THEN 1 END)::bigint as pendingActivation
      FROM downline
    )
    SELECT 
      (SELECT COUNT(*) FROM "User" WHERE "referredByUserId" = $1::text)::bigint as directReferrals,
      s.*
    FROM stats s
  `, userId);
  
  const result = stats[0];
  return {
    directReferrals: Number(result.directReferrals),
    totalNetwork: Number(result.totalNetwork),
    networkDepth: Number(result.networkDepth),
    activeMembers: Number(result.activeMembers),
    newThisMonth: Number(result.newThisMonth),
    newThisWeek: Number(result.newThisWeek),
    pendingActivation: Number(result.pendingActivation)
  };
}
