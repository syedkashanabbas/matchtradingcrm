/**
 * Configurable plan catalog (M3, spec §6.1): plans are defined via the
 * STRIPE_PLAN_CATALOG env var (JSON array), not fixed in code.
 */
export interface Plan {
  code: string;
  name: string;
  stripePriceId: string;
  /** Display price in `currency` per `interval` */
  price: number;
  currency: string; // EUR | GBP | USD ...
  interval: "month" | "year";
  features?: string[];
  popular?: boolean;
  /**
   * Non-Client Collaborator membership (spec v1.1 §7.2): grants network
   * participation and a demo account, no product access, no provisioning.
   * Its payments generate commissions like subscriptions do.
   */
  membership?: boolean;
}

const DEFAULT_CATALOG: Plan[] = [
  {
    code: "STARTER",
    name: "Starter",
    stripePriceId: "",
    price: 99,
    currency: "EUR",
    interval: "month",
    features: ["1 hedge setup", "Automatic provisioning", "Email support"],
  },
  {
    code: "PRO",
    name: "Pro",
    stripePriceId: "",
    price: 199,
    currency: "EUR",
    interval: "month",
    popular: true,
    features: ["1 hedge setup", "Automatic provisioning", "Priority support", "Broker rotation"],
  },
  {
    code: "MEMBERSHIP",
    name: "Collaborator Membership",
    stripePriceId: "",
    price: 40,
    currency: "USD",
    interval: "month",
    membership: true,
    features: ["Network back office", "Demo account", "Referral commissions", "No product access"],
  },
];

let cached: Plan[] | null = null;

export const getPlanCatalog = (): Plan[] => {
  if (cached) return cached;

  const raw = process.env.STRIPE_PLAN_CATALOG;
  if (!raw) {
    console.warn("⚠️  STRIPE_PLAN_CATALOG not set - using default plan catalog (no Stripe price ids)");
    cached = DEFAULT_CATALOG;
    return cached;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("catalog must be a non-empty JSON array");
    }
    cached = parsed.map((p: any) => ({
      code: String(p.code).toUpperCase(),
      name: String(p.name),
      stripePriceId: String(p.stripePriceId ?? ""),
      price: Number(p.price),
      currency: String(p.currency ?? "EUR").toUpperCase(),
      interval: p.interval === "year" ? "year" : "month",
      features: Array.isArray(p.features) ? p.features.map(String) : undefined,
      popular: Boolean(p.popular),
      membership: Boolean(p.membership) || String(p.code).toUpperCase() === "MEMBERSHIP",
    }));
    return cached;
  } catch (error: any) {
    console.error(`❌ Invalid STRIPE_PLAN_CATALOG: ${error.message} - using default catalog`);
    cached = DEFAULT_CATALOG;
    return cached;
  }
};

export const getPlanByCode = (code: string): Plan | undefined =>
  getPlanCatalog().find(plan => plan.code === String(code).toUpperCase());

/** Test hook: clears the memoized catalog. */
export const resetPlanCatalogCache = () => {
  cached = null;
};
