/**
 * Demo fixtures for local preview (idempotent - safe to re-run).
 *
 * Creates a small realistic world:
 *   marco@eidos.local  (agent with a 2-level downline, completed onboarding,
 *                       ACTIVE provisioned service, commissions)
 *   sara@eidos.local   (level 1 under Marco, active subscriber)
 *   luigi@eidos.local  (level 1 under Marco, onboarding in progress)
 *   giulia@eidos.local (level 2 under Marco via Sara, active subscriber)
 *
 * All passwords: demo-password-123
 *
 * Usage: npx ts-node --transpile-only src/scripts/dev-fixtures.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { encryptData } from "../utils/encryption";

const prisma = new PrismaClient();
const PASSWORD = "demo-password-123";

const month = (offset: number) => {
  const date = new Date();
  date.setMonth(date.getMonth() + offset);
  return date;
};

async function upsertUser(opts: {
  email: string;
  firstName: string;
  lastName: string;
  referralCode: string;
  referredById?: string;
  status: "NEW" | "ONBOARDING" | "ACTIVE";
}) {
  const password = await bcrypt.hash(PASSWORD, 10);
  return prisma.user.upsert({
    where: { email: opts.email },
    update: { status: opts.status },
    create: {
      email: opts.email,
      password,
      firstName: opts.firstName,
      lastName: opts.lastName,
      phone: "+391234567890",
      country: "Italy",
      role: "CLIENT",
      status: opts.status,
      referralCode: opts.referralCode,
      referredByUserId: opts.referredById ?? null,
      referredByCode: opts.referredById ? undefined : null,
      registrationSource: opts.referredById ? "referral" : "organic",
      termsAcceptedAt: new Date(),
      privacyAcceptedAt: new Date(),
      onboardingProgress: opts.status === "ACTIVE" ? "completed" : "not_started",
    },
  });
}

async function activateSubscription(userId: string, plan: string, provider = "stripe") {
  const existing = await prisma.subscription.findFirst({ where: { userId } });
  if (existing) return existing;
  return prisma.subscription.create({
    data: {
      userId,
      provider,
      plan,
      status: "ACTIVE",
      stripeSubscriptionId: provider === "stripe" ? `sub_demo_${userId.slice(0, 8)}` : null,
      stripeCustomerId: provider === "stripe" ? `cus_demo_${userId.slice(0, 8)}` : null,
      externalOrderId: provider === "coingate" ? `cg_demo_${userId.slice(0, 8)}` : null,
      currentPeriodStart: month(0),
      currentPeriodEnd: month(1),
    },
  });
}

async function completeOnboarding(userId: string) {
  for (const stepId of ["payment", "broker", "prop"]) {
    await prisma.onboardingStep.upsert({
      where: { userId_stepId: { userId, stepId } },
      update: { status: "COMPLETED", completedAt: new Date() },
      create: { userId, stepId, status: "COMPLETED", completedAt: new Date() },
    });
  }
}

async function main() {
  console.log("🎭 Creating demo fixtures...");

  // ---- Users + referral tree ----
  const marco = await upsertUser({
    email: "marco@eidos.local",
    firstName: "Marco",
    lastName: "Rossi",
    referralCode: "MARCO123",
    status: "ACTIVE",
  });
  const sara = await upsertUser({
    email: "sara@eidos.local",
    firstName: "Sara",
    lastName: "Bianchi",
    referralCode: "SARA456",
    referredById: marco.id,
    status: "ACTIVE",
  });
  const luigi = await upsertUser({
    email: "luigi@eidos.local",
    firstName: "Luigi",
    lastName: "Verdi",
    referralCode: "LUIGI789",
    referredById: marco.id,
    status: "ONBOARDING",
  });
  const giulia = await upsertUser({
    email: "giulia@eidos.local",
    firstName: "Giulia",
    lastName: "Russo",
    referralCode: "GIULIA01",
    referredById: sara.id,
    status: "ACTIVE",
  });
  // Extra directs under Marco so the Exonoma qualifications are visible
  const paolo = await upsertUser({
    email: "paolo@eidos.local",
    firstName: "Paolo",
    lastName: "Ferrari",
    referralCode: "PAOLO234",
    referredById: marco.id,
    status: "ACTIVE",
  });
  const elena = await upsertUser({
    email: "elena@eidos.local",
    firstName: "Elena",
    lastName: "Greco",
    referralCode: "ELENA567",
    referredById: marco.id,
    status: "ACTIVE",
  });
  // Level 3 under Marco (via Sara -> Giulia) to demo the full 3-level engine
  const davide = await upsertUser({
    email: "davide@eidos.local",
    firstName: "Davide",
    lastName: "Moretti",
    referralCode: "DAVIDE89",
    referredById: giulia.id,
    status: "ACTIVE",
  });
  // Non-client collaborator (spec v1.1 §7.2): $40 membership, no product
  const franco = await upsertUser({
    email: "franco@eidos.local",
    firstName: "Franco",
    lastName: "Conti",
    referralCode: "FRANCO12",
    referredById: marco.id,
    status: "ACTIVE",
  });

  // ---- Subscriptions ----
  await activateSubscription(marco.id, "PRO");
  await activateSubscription(sara.id, "STARTER");
  await activateSubscription(giulia.id, "PRO", "coingate");
  await activateSubscription(paolo.id, "STARTER");
  await activateSubscription(elena.id, "PRO");
  await activateSubscription(davide.id, "STARTER");
  await activateSubscription(franco.id, "MEMBERSHIP");

  // ---- Marco: complete onboarding + accounts + provisioned service ----
  await completeOnboarding(marco.id);
  await completeOnboarding(sara.id);
  await completeOnboarding(giulia.id);

  const existingProp = await prisma.propAccount.findFirst({ where: { userId: marco.id } });
  let propId = existingProp?.id;
  let brokerId: string | undefined;
  if (!existingProp) {
    const prop = await prisma.propAccount.create({
      data: {
        userId: marco.id,
        firmName: "FTMO",
        mt5AccountNumber: "51234567",
        mt5Password: encryptData("demo-prop-pass"),
        mt5Server: "FTMO-Server3",
        phase: "FUNDED",
        status: "active",
        isActive: true,
        epAccountId: "ep-demo-prop-1",
      },
    });
    propId = prop.id;
    // An archived previous challenge for the history view
    await prisma.propAccount.create({
      data: {
        userId: marco.id,
        firmName: "FTMO",
        mt5AccountNumber: "50111222",
        mt5Password: encryptData("demo-old-pass"),
        mt5Server: "FTMO-Server3",
        phase: "ARCHIVED",
        status: "archived",
        isActive: false,
        archivedAt: month(-2),
        createdAt: month(-4),
      },
    });
    const broker = await prisma.brokerAccount.create({
      data: {
        userId: marco.id,
        brokerName: "IC Markets",
        mt5AccountNumber: "8765432",
        mt5Password: encryptData("demo-broker-pass"),
        mt5Server: "ICMarkets-Live04",
        status: "active",
        epAccountId: "ep-demo-broker-1",
      },
    });
    brokerId = broker.id;
  }

  const provision = await prisma.easierPropProvision.findUnique({ where: { userId: marco.id } });
  if (!provision && propId && brokerId) {
    await prisma.easierPropProvision.create({
      data: {
        userId: marco.id,
        status: "COMPLETED",
        epKeyId: "key-demo-1",
        epApiKeyEncrypted: encryptData("sk_demo_key"),
        epPropAccountId: "ep-demo-prop-1",
        epBrokerAccountId: "ep-demo-broker-1",
      },
    });
    await prisma.hedgeSetup.create({
      data: {
        userId: marco.id,
        propAccountId: propId,
        brokerAccountId: brokerId,
        epPropAccountId: "ep-demo-prop-1",
        epBrokerAccountId: "ep-demo-broker-1",
        status: "active",
      },
    });
  }

  // ---- Commission plan: Exonoma 20/18/12 with 0/3/5 thresholds (spec v1.1 §7.3) ----
  const exonomaPlan = await prisma.commissionPlan.findFirst({ where: { name: "Exonoma Launch Plan" } });
  if (!exonomaPlan) {
    await prisma.commissionPlan.updateMany({ where: { isActive: true }, data: { isActive: false } });
    await prisma.commissionPlan.create({
      data: {
        name: "Exonoma Launch Plan",
        isActive: true,
        levels: {
          create: [
            { level: 1, rate: 20, minActiveDirects: 0 },
            { level: 2, rate: 18, minActiveDirects: 3 },
            { level: 3, rate: 12, minActiveDirects: 5 },
          ],
        },
      },
    });
  }

  // ---- Qualification snapshots for the current period (spec v1.1 §7.4) ----
  const period = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`;
  const snapshotRows = [
    // Marco: 4 active paying directs (Sara, Paolo, Elena, Franco's membership) -> L2 yes, L3 no
    { userId: marco.id, activeDirectCount: 4, qualifiesLevel2: true, qualifiesLevel3: false },
    // Sara: only Giulia pays -> not qualified for L2 (compression demo)
    { userId: sara.id, activeDirectCount: 1, qualifiesLevel2: false, qualifiesLevel3: false },
    { userId: giulia.id, activeDirectCount: 1, qualifiesLevel2: false, qualifiesLevel3: false },
  ];
  for (const row of snapshotRows) {
    await prisma.qualificationSnapshot.upsert({
      where: { userId_period: { userId: row.userId, period } },
      update: { activeDirectCount: row.activeDirectCount, qualifiesLevel2: row.qualifiesLevel2, qualifiesLevel3: row.qualifiesLevel3 },
      create: { ...row, period },
    });
  }

  const hasCommissions = await prisma.commission.count({ where: { agentId: marco.id } });
  if (hasCommissions === 0) {
    const rows = [
      // Sara pays 99 EUR monthly - Marco level 1 (10%)
      { source: sara.id, ref: "inv_demo_s1", base: 99, level: 1, rate: 10, at: month(-2), status: "PAID" },
      { source: sara.id, ref: "inv_demo_s2", base: 99, level: 1, rate: 10, at: month(-1), status: "PAID" },
      { source: sara.id, ref: "inv_demo_s3", base: 99, level: 1, rate: 10, at: month(0), status: "EARNED" },
      // Giulia pays 199 EUR - Marco level 2 (5%)
      { source: giulia.id, ref: "cg_demo_g1", base: 199, level: 2, rate: 5, at: month(-1), status: "PAID" },
      { source: giulia.id, ref: "cg_demo_g2", base: 199, level: 2, rate: 5, at: month(0), status: "EARNED" },
    ];
    for (const row of rows) {
      await prisma.commission.create({
        data: {
          agentId: marco.id,
          sourceUserId: row.source,
          paymentRef: row.ref,
          provider: row.ref.startsWith("cg") ? "coingate" : "stripe",
          level: row.level,
          baseAmount: row.base,
          rate: row.rate,
          amount: Math.round(row.base * row.rate) / 100,
          currency: "EUR",
          status: row.status,
          createdAt: row.at,
        },
      });
    }
    // Giulia's payments also earn Sara a level-1 commission
    for (const [ref, at, status] of [["cg_demo_g1", month(-1), "PAID"], ["cg_demo_g2", month(0), "EARNED"]] as const) {
      await prisma.commission.create({
        data: {
          agentId: sara.id,
          sourceUserId: giulia.id,
          paymentRef: ref,
          provider: "coingate",
          level: 1,
          baseAmount: 199,
          rate: 10,
          amount: 19.9,
          currency: "EUR",
          status,
          createdAt: at,
        },
      });
    }
  }

  // ---- Compression demo (spec v1.1 §7.5): Davide pays 99 EUR ----
  // Chain above Davide: L1 Giulia (20%), L2 Sara (18%, NOT qualified ->
  // compressed up to Marco), L3 Marco (12%, needs 5 directs -> skipped).
  const hasCompressed = await prisma.commission.count({ where: { paymentRef: "inv_demo_d1" } });
  if (hasCompressed === 0) {
    await prisma.commission.createMany({
      data: [
        {
          agentId: giulia.id,
          sourceUserId: davide.id,
          paymentRef: "inv_demo_d1",
          provider: "stripe",
          level: 1,
          baseAmount: 99,
          rate: 20,
          amount: 19.8,
          currency: "EUR",
          status: "EARNED",
        },
        {
          agentId: marco.id,
          sourceUserId: davide.id,
          paymentRef: "inv_demo_d1",
          provider: "stripe",
          level: 2,
          baseAmount: 99,
          rate: 18,
          amount: 17.82,
          currency: "EUR",
          status: "EARNED",
          wasCompressed: true,
          originalBeneficiaryId: sara.id,
        },
      ],
    });
  }

  // ---- Membership commission (spec v1.1 §7.2): Franco's $40 fee pays Marco L1 ----
  const hasMembershipCommission = await prisma.commission.count({ where: { paymentRef: "inv_demo_f1" } });
  if (hasMembershipCommission === 0) {
    await prisma.commission.create({
      data: {
        agentId: marco.id,
        sourceUserId: franco.id,
        paymentRef: "inv_demo_f1",
        provider: "stripe",
        level: 1,
        baseAmount: 40,
        rate: 20,
        amount: 8,
        currency: "USD",
        status: "EARNED",
      },
    });
  }

  // ---- Challenge + travel promo (spec v1.1 §7.8) ----
  const hasChallenge = await prisma.challenge.count();
  if (hasChallenge === 0) {
    const start = new Date();
    start.setDate(start.getDate() - 10);
    const end = new Date();
    end.setDate(end.getDate() + 20);
    await prisma.challenge.create({
      data: {
        name: "Summer Sprint",
        metric: "new_active_directs",
        prize: "500 EUR bonus",
        startsAt: start,
        endsAt: end,
        status: "ACTIVE",
      },
    });
    // A finished challenge with a frozen winners log for the history view
    const pastStart = new Date();
    pastStart.setMonth(pastStart.getMonth() - 2);
    const pastEnd = new Date();
    pastEnd.setMonth(pastEnd.getMonth() - 1);
    await prisma.challenge.create({
      data: {
        name: "Spring Kickoff",
        metric: "revenue_generated",
        prize: "MacBook Air",
        startsAt: pastStart,
        endsAt: pastEnd,
        status: "FROZEN",
        winnersLog: [
          { userId: marco.id, name: "Marco R.", score: 1240, rank: 1 },
          { userId: sara.id, name: "Sara B.", score: 830, rank: 2 },
          { userId: giulia.id, name: "Giulia R.", score: 512, rank: 3 },
        ],
      },
    });
  }

  const hasPromo = await prisma.travelPromo.count();
  if (hasPromo === 0) {
    const deadline = new Date();
    deadline.setMonth(deadline.getMonth() + 3);
    await prisma.travelPromo.create({
      data: {
        name: "Dubai Experience",
        metric: "active_directs",
        threshold: 5,
        deadline,
      },
    });
  }

  // ---- Network events + notifications ----
  const hasEvents = await prisma.networkEvent.count({ where: { userId: marco.id } });
  if (hasEvents === 0) {
    for (const [related, name] of [[sara.id, "Sara Bianchi"], [luigi.id, "Luigi Verdi"]] as const) {
      await prisma.networkEvent.create({
        data: { userId: marco.id, eventType: "new_referral", relatedUserId: related, message: `${name} joined your network` },
      });
    }
    await prisma.networkEvent.create({
      data: { userId: sara.id, eventType: "new_referral", relatedUserId: giulia.id, message: "Giulia Russo joined your network" },
    });
  }

  const hasNotifications = await prisma.notification.count({ where: { userId: marco.id } });
  if (hasNotifications === 0) {
    await prisma.notification.createMany({
      data: [
        { userId: marco.id, type: "PROVISIONING", title: "Your trading service is active", message: "Your MT5 accounts have been provisioned and your hedge setup is now active.", severity: "MEDIUM" },
        { userId: marco.id, type: "COMMISSION", title: "Commission earned", message: "You earned 9.90 EUR (level 1).", severity: "LOW", isRead: true },
        { userId: marco.id, type: "COMMISSION", title: "Commission earned", message: "You earned 9.95 EUR (level 2).", severity: "LOW" },
      ],
    });
  }

  console.log("✅ Demo fixtures ready:");
  console.log("   admin  → admin@eidos.local / local-admin-password-123");
  console.log("   client → marco@eidos.local / demo-password-123 (agent, 5 directs, L2 qualified)");
  console.log("   client → sara@eidos.local  / demo-password-123 (1 direct, not L2 qualified)");
  console.log("   client → luigi@eidos.local / demo-password-123 (onboarding in progress)");
  console.log("   membership → franco@eidos.local / demo-password-123 ($40 collaborator)");
}

main()
  .catch(error => {
    console.error("❌ Fixture error:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
