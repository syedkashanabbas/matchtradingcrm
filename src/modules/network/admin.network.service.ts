import { PrismaClient } from '@prisma/client';

export class AdminNetworkService {
  constructor(private prisma: PrismaClient) {}

  async getOverview() {
    const totalUsers = await this.prisma.user.count();
    const referredUsers = await this.prisma.user.count({ 
      where: { referredByUserId: { not: null } } 
    });
    const organicUsers = await this.prisma.user.count({ 
      where: { registrationSource: 'organic' } 
    });
    
    const avgDepthResult = await this.prisma.$queryRawUnsafe<Array<{ avgDepth: number }>>(`
      WITH RECURSIVE all_networks AS (
        SELECT 
          u.id as root_id,
          d.level
        FROM "User" u
        LEFT JOIN LATERAL (
          WITH RECURSIVE downline AS (
            SELECT id, "referredByUserId", 1 as level
            FROM "User"
            WHERE "referredByUserId" = u.id
              
            UNION ALL
              
            SELECT 
              u2.id, 
              u2."referredByUserId", 
              d.level + 1
            FROM "User" u2
            INNER JOIN downline d ON u2."referredByUserId" = d.id
          )
          SELECT MAX(level) as level
          FROM downline
        ) d ON true
        WHERE u.id IS NOT NULL
      )
      SELECT COALESCE(AVG(level), 0) as avgDepth
      FROM all_networks
      WHERE level IS NOT NULL
    `);

    const topRecruitersAllTime = await this.getTopRecruitersAllTime();
    const topRecruitersMonth = await this.getTopRecruitersMonth();

    return {
      totalUsers,
      referredUsers,
      organicUsers,
      avgNetworkDepth: Number(avgDepthResult[0]?.avgDepth || 0),
      topRecruitersAllTime,
      topRecruitersMonth
    };
  }

  async getTopRecruitersAllTime() {
    const result = await this.prisma.$queryRawUnsafe<Array<{
      rank: number;
      name: string;
      count: bigint;
    }>>(`
      WITH referral_counts AS (
        SELECT 
          u."referredByUserId",
          COUNT(*) as count
        FROM "User" u
        WHERE u."referredByUserId" IS NOT NULL
        GROUP BY u."referredByUserId"
      ),
      ranked AS (
        SELECT 
          r."referredByUserId",
          r.count,
          ROW_NUMBER() OVER (ORDER BY r.count DESC) as rank
        FROM referral_counts r
      ),
      top10 AS (
        SELECT rank, r."referredByUserId", r.count
        FROM ranked r
        WHERE rank <= 10
      )
      SELECT 
        t.rank,
        u."firstName" || ' ' || SUBSTRING(u."lastName", 1, 1) || '.' as name,
        t.count
      FROM top10 t
      JOIN "User" u ON t."referredByUserId" = u.id
      ORDER BY t.rank
    `);

    return result.map(item => ({
      rank: item.rank,
      name: item.name,
      count: Number(item.count)
    }));
  }

  async getTopRecruitersMonth() {
    const result = await this.prisma.$queryRawUnsafe<Array<{
      rank: number;
      name: string;
      count: bigint;
    }>>(`
      WITH monthly_referrals AS (
        SELECT 
          u."referredByUserId",
          COUNT(*) as count
        FROM "User" u
        WHERE u."referredByUserId" IS NOT NULL 
        AND u."createdAt" >= date_trunc('month', CURRENT_DATE)
        GROUP BY u."referredByUserId"
      ),
      ranked AS (
        SELECT 
          r."referredByUserId",
          r.count,
          ROW_NUMBER() OVER (ORDER BY r.count DESC) as rank
        FROM monthly_referrals r
      ),
      top10 AS (
        SELECT rank, r."referredByUserId", r.count
        FROM ranked r
        WHERE rank <= 10
      )
      SELECT 
        t.rank,
        u."firstName" || ' ' || SUBSTRING(u."lastName", 1, 1) || '.' as name,
        t.count
      FROM top10 t
      JOIN "User" u ON t."referredByUserId" = u.id
      ORDER BY t.rank
    `);

    return result.map(item => ({
      rank: item.rank,
      name: item.name,
      count: Number(item.count)
    }));
  }

  async getUserNetworkInfo(userId: string) {
    const referredBy = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        referredBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    const referralCode = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true }
    });

    const directReferralsCount = await this.prisma.user.count({
      where: { referredByUserId: userId }
    });

    const directReferrals = await this.prisma.user.findMany({
      where: { referredByUserId: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalNetworkSize = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
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

    const networkDepth = await this.prisma.$queryRawUnsafe<Array<{ maxDepth: bigint }>>(`
      WITH RECURSIVE downline AS (
        SELECT id, "referredByUserId", 1 as level
        FROM "User"
        WHERE "referredByUserId" = $1::text
        
        UNION ALL
        
        SELECT u.id, u."referredByUserId", d.level + 1
        FROM "User" u
        INNER JOIN downline d ON u."referredByUserId"::text = d.id::text
      )
      SELECT COALESCE(MAX(level), 0)::bigint as maxDepth
      FROM downline
    `, userId);

    return {
      referredBy,
      referralCode: referralCode?.referralCode || '',
      directReferralsCount,
      directReferrals,
      totalNetworkSize: Number(totalNetworkSize[0]?.count || 0),
      networkDepth: Number(networkDepth[0]?.maxDepth || 0)
    };
  }

  async getUserTree(userId: string) {
    // First get the user as root (same as client service)
    const rootUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true
      }
    });

    if (!rootUser) {
      return { id: '', name: '', level: 0, status: '', children: [] };
    }

    // Get all downline members using recursive CTE (same as client service)
    const flatRows = await this.prisma.$queryRawUnsafe<any[]>(`
      WITH RECURSIVE downline AS (
        SELECT 
          id::text, 
          "firstName", 
          "lastName", 
          email,
          "referredByUserId"::text,
          status,
          1 as level
        FROM "User"
        WHERE "referredByUserId" = $1::text

        UNION ALL

        SELECT 
          u.id::text,
          u."firstName",
          u."lastName",
          u.email,
          u."referredByUserId"::text,
          u.status,
          d.level + 1
        FROM "User" u
        INNER JOIN downline d ON u."referredByUserId"::text = d.id::text
      )
      SELECT * FROM downline ORDER BY level
    `, userId);

    // Create root node from user (same as client service)
    const rootNode: any = {
      id: rootUser.id,
      name: `${rootUser.firstName} ${rootUser.lastName}`,
      level: 0,
      status: rootUser.status,
      children: []
    };

    // Build tree structure from downline data (same as client service)
    const nodeMap = new Map<string, any>();
    
    // Create nodes for all downline members
    flatRows.forEach(row => {
      const node: any = {
        id: row.id,
        name: `${row.firstName} ${row.lastName}`,
        level: row.level,
        status: row.status,
        children: []
      };
      nodeMap.set(row.id, node);
    });
    
    // Build parent-child relationships (same as client service)
    flatRows.forEach(row => {
      const node = nodeMap.get(row.id);
      if (node && row.referredByUserId) {
        const parent = nodeMap.get(row.referredByUserId);
        if (parent) {
          parent.children.push(node);
        } else if (row.level === 1) {
          // Direct referrals become children of root
          rootNode.children.push(node);
        }
      }
    });

    return rootNode;
  }

  async getOrphans() {
    return await this.prisma.user.findMany({
      where: { referredByUserId: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        registrationSource: true,
        status: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async assignUpline(orphanUserId: string, uplineUserId: string, adminId: string) {
    // Find orphan user
    const orphan = await this.prisma.user.findUnique({
      where: { id: orphanUserId },
      select: { firstName: true, lastName: true }
    });

    if (!orphan) {
      throw new Error('Orphan user not found');
    }

    // Find upline user
    const upline = await this.prisma.user.findUnique({
      where: { id: uplineUserId },
      select: { referralCode: true, firstName: true, lastName: true }
    });

    if (!upline) {
      throw new Error('Upline user not found');
    }

    // Update orphan user
    await this.prisma.user.update({
      where: { id: orphanUserId },
      data: {
        referredByUserId: uplineUserId,
        referredByCode: upline.referralCode,
        registrationSource: 'referral'
      }
    });

    // Create network event
    await this.prisma.networkEvent.create({
      data: {
        userId: uplineUserId,
        eventType: 'new_referral',
        relatedUserId: orphanUserId,
        message: `${orphan.firstName} ${orphan.lastName} was assigned to your network by admin`
      }
    });

    // Create audit event
    await this.prisma.auditEvent.create({
      data: {
        userId: adminId,
        action: 'ADMIN_ASSIGN_UPLINE',
        resource: 'network',
        details: {
          orphanUserId,
          orphanName: `${orphan.firstName} ${orphan.lastName}`,
          uplineUserId,
          uplineName: `${upline.firstName} ${upline.lastName}`
        }
      }
    });

    return { success: true, message: 'Upline assigned successfully' };
  }

  async getAllClientNetworks() {
    // Get all users who have referrals (potential network roots)
    const clientsWithNetworks = await this.prisma.user.findMany({
      where: {
        OR: [
          { referredByUserId: { not: null } }, // Has referred users
          { // OR has been referred (is in a network)
            referredByUserId: { not: null }
          }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        referralCode: true,
        status: true,
        createdAt: true,
        role: true
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    });

    // For each client, get their network tree
    const clientsWithTrees = await Promise.all(
      clientsWithNetworks.map(async (client) => {
        const networkTree = await this.getUserTree(client.id);
        const networkStats = await this.getUserNetworkInfo(client.id);
        
        return {
          id: client.id,
          name: `${client.firstName} ${client.lastName}`,
          email: client.email,
          referralCode: client.referralCode || '',
          status: client.status,
          role: client.role,
          createdAt: client.createdAt,
          totalTeamMembers: networkStats.totalNetworkSize,
          totalLevels: networkStats.networkDepth,
          directReferrals: networkStats.directReferralsCount,
          networkTree: networkTree
        };
      })
    );

    return clientsWithTrees;
  }

  async changeUpline(userId: string, newUplineUserId: string, adminId: string) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        referredByUserId: true,
        firstName: true, 
        lastName: true 
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Find new upline
    const newUpline = await this.prisma.user.findUnique({
      where: { id: newUplineUserId },
      select: { referralCode: true, firstName: true, lastName: true }
    });

    if (!newUpline) {
      throw new Error('New upline user not found');
    }

    const oldUplineUserId = user.referredByUserId;

    // Update user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        referredByUserId: newUplineUserId,
        referredByCode: newUpline.referralCode
      }
    });

    // Create event for old upline if they existed
    if (oldUplineUserId) {
      await this.prisma.networkEvent.create({
        data: {
          userId: oldUplineUserId,
          eventType: 'upline_changed',
          relatedUserId: userId,
          message: `${user.firstName} ${user.lastName} was moved out of your network by admin`
        }
      });
    }

    // Create event for new upline
    await this.prisma.networkEvent.create({
      data: {
        userId: newUplineUserId,
        eventType: 'new_referral',
        relatedUserId: userId,
        message: `${user.firstName} ${user.lastName} was added to your network by admin`
      }
    });

    // Create audit event
    await this.prisma.auditEvent.create({
      data: {
        userId: adminId,
        action: 'ADMIN_CHANGE_UPLINE',
        resource: 'network',
        details: {
          userId,
          userName: `${user.firstName} ${user.lastName}`,
          oldUplineUserId,
          newUplineUserId,
          newUplineName: `${newUpline.firstName} ${newUpline.lastName}`
        }
      }
    });

    return { success: true, message: 'Upline changed successfully' };
  }
}
