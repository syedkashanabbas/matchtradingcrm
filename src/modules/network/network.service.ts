import { PrismaClient } from '@prisma/client';
import { TreeNode } from '../../utils/network.utils';
import { generateReferralCode, buildTreeFromFlat, checkAndCreateMilestone, getNetworkStats } from '../../utils/network.utils';

export class NetworkService {
  constructor(private prisma: PrismaClient) {}

  async getMyReferralLink(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true }
    });

    if (!user || !user.referralCode) {
      throw new Error('Referral code not found');
    }

    const registrations = await this.prisma.user.count({
      where: { referredByUserId: userId }
    });

    // TODO: Implement link click tracking when database schema supports it
    // For now, returning 0 as placeholder
    const linkClicks = 0;

    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://app.exonoma.ai' 
      : 'http://localhost:3000';
    
    return {
      referralCode: user.referralCode,
      referralLink: `${baseUrl}/join?ref=${user.referralCode}`,
      registrations,
      linkClicks
    };
  }

  async getMyTree(userId: string) {
    // First get the logged-in user as root
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
      throw new Error('User not found');
    }

    // Get all downline members using recursive CTE
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

    // Create root node from logged-in user
    const rootNode: TreeNode = {
      id: rootUser.id,
      name: `${rootUser.firstName} ${rootUser.lastName}`,
      level: 0,
      status: rootUser.status,
      children: []
    };

    // Build tree structure from downline data
    const nodeMap = new Map<string, TreeNode>();
    
    // Create nodes for all downline members
    flatRows.forEach(row => {
      const node: TreeNode = {
        id: row.id,
        name: `${row.firstName} ${row.lastName}`,
        level: row.level,
        status: row.status,
        children: []
      };
      nodeMap.set(row.id, node);
    });
    
    // Build parent-child relationships
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

  async getDirectReferrals(userId: string) {
    return await this.prisma.user.findMany({
      where: { referredByUserId: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getNetworkStats(userId: string) {
    return await getNetworkStats(userId, this.prisma);
  }

  async getLeaderboard() {
    // Top recruiters this month
    const topRecruitersMonth = await this.prisma.$queryRawUnsafe<Array<{
      rank: number;
      name: string;
      referralCount: bigint;
    }>>(`
      WITH monthly_referrals AS (
        SELECT 
          u2."referredByUserId",
          COUNT(*) as count
        FROM "User" u2
        WHERE u2."referredByUserId" IS NOT NULL 
        AND u2."createdAt" >= date_trunc('month', CURRENT_DATE)
        GROUP BY u2."referredByUserId"
      ),
      ranked AS (
        SELECT 
          r."referredByUserId",
          r.count,
          ROW_NUMBER() OVER (ORDER BY r.count DESC) as rank
        FROM monthly_referrals r
      ),
      top10 AS (
        SELECT rank, r."referredByUserId", r.count as referralCount
        FROM ranked r
        WHERE rank <= 10
      )
      SELECT 
        t.rank,
        u."firstName" || ' ' || SUBSTRING(u."lastName", 1, 1) || '.' as name,
        t.referralCount
      FROM top10 t
      JOIN "User" u ON t."referredByUserId" = u.id
      ORDER BY t.rank
    `);

    // Fastest growing networks this month
    const fastestGrowing = await this.prisma.$queryRawUnsafe<Array<{
      rank: number;
      name: string;
      networkGrowthThisMonth: bigint;
    }>>(`
      WITH monthly_growth AS (
        SELECT 
          u2.id,
          COUNT(d.id) as growth
        FROM "User" u2
        LEFT JOIN LATERAL (
          SELECT id, "referredByUserId", "createdAt"
          FROM "User"
          WHERE "referredByUserId" = u2.id 
          AND "createdAt" >= date_trunc('month', CURRENT_DATE)
        ) d ON true
        WHERE u2.id != d.id OR d.id IS NULL
        GROUP BY u2.id
        HAVING COUNT(d.id) > 0
      ),
      ranked AS (
        SELECT 
          mg.id,
          mg.growth,
          ROW_NUMBER() OVER (ORDER BY mg.growth DESC) as rank
        FROM monthly_growth mg
      ),
      top10 AS (
        SELECT rank, r.id, r.growth as networkGrowthThisMonth
        FROM ranked r
        WHERE rank <= 10
      )
      SELECT 
        t.rank,
        u."firstName" || ' ' || SUBSTRING(u."lastName", 1, 1) || '.' as name,
        t.networkGrowthThisMonth
      FROM top10 t
      JOIN "User" u ON t.id = u.id
      ORDER BY t.rank
    `);

    return {
      topRecruitersMonth: topRecruitersMonth.map(item => ({
        rank: item.rank,
        name: item.name,
        referralCount: Number(item.referralCount)
      })),
      fastestGrowing: fastestGrowing.map(item => ({
        rank: item.rank,
        name: item.name,
        networkGrowthThisMonth: Number(item.networkGrowthThisMonth)
      }))
    };
  }

  async getActivityFeed(userId: string) {
    const events = await this.prisma.networkEvent.findMany({
      where: { userId },
      include: {
        user: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return events.map(event => ({
      id: event.id,
      eventType: event.eventType,
      message: event.message,
      relatedUserName: event.relatedUserId ? 'Related User' : null,
      createdAt: event.createdAt
    }));
  }

  async getInviterByReferralCode(refCode: string) {
    const inviter = await this.prisma.user.findUnique({
      where: { referralCode: refCode },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    if (!inviter) {
      throw new Error('Invalid referral code');
    }

    return {
      id: inviter.id,
      firstName: inviter.firstName,
      lastName: inviter.lastName,
      fullName: `${inviter.firstName} ${inviter.lastName}`
    };
  }

  async processReferralOnRegistration(userId: string, refCode?: string) {
    // Generate referral code for new user
    const referralCode = await generateReferralCode(this.prisma, userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode }
    });

    if (refCode) {
      // Find referrer
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: refCode },
        select: { id: true, firstName: true, lastName: true }
      });

      if (referrer) {
        // Update new user with referral info
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            referredByUserId: referrer.id,
            referredByCode: refCode,
            registrationSource: 'referral'
          }
        });

        // Get new user info for event message
        const newUser = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true }
        });

        if (newUser) {
          // Create referral event
          await this.prisma.networkEvent.create({
            data: {
              userId: referrer.id,
              eventType: 'new_referral',
              relatedUserId: userId,
              message: `${newUser.firstName} ${newUser.lastName} joined your network`
            }
          });

          // Check for milestones
          await checkAndCreateMilestone(referrer.id, this.prisma);
        }
      } else {
        // Invalid referral code, register as organic
        await this.prisma.user.update({
          where: { id: userId },
          data: { registrationSource: 'organic' }
        });
      }
    } else {
      // No referral code, register as organic
      await this.prisma.user.update({
        where: { id: userId },
        data: { registrationSource: 'organic' }
      });
    }
  }
}
