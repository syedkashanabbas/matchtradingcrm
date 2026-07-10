import express from "express";
import cors from "cors";
import { validateEnv } from "./config/env-validation";
import helmet from "helmet";
import { additionalSecurityHeaders } from "./middleware/securityHeaders.middleware";
import { generalRateLimit } from "./middleware/rateLimit.middleware";
import authRoutes from "./modules/auth/auth.routes";
import { authenticate } from "./middleware/auth.middleware";
import { authorize } from "./middleware/role.middleware";
import clientRoutes from "./modules/client/client.routes";
import { startSubscriptionCron } from "./cron/subscription.cron";
import notificationRoutes from "./modules/notification/notification.routes";
import adminRoutes from "./modules/admin/admin.routes";
import subscriptionRoutes from "./modules/subscription/subscription.routes";
import brokerRoutes from "./modules/broker/broker.routes";
import propRoutes from "./modules/prop/prop.routes";
import onboardingRoutes from "./modules/onboarding/onboarding.routes";
import provisioningRoutes from "./modules/provisioning/provisioning.routes";
import { provisioningRouter as adminProvisioningRoutes, serviceRouter as adminServiceRoutes } from "./modules/provisioning/admin.provisioning.routes";
import { startProvisioningCron } from "./cron/provisioning.cron";
import networkRoutes from "./modules/network/network.routes";
import adminNetworkRoutes from "./modules/network/admin.network.routes";
import { agentCommissionRouter, adminCommissionRouter } from "./modules/commission/commission.routes";
import { agentChallengeRouter, adminChallengeRouter, adminPromoRouter } from "./modules/challenge/challenge.routes";
import { handleStripeWebhook } from "./webhooks/stripe.webhook";
import { handleCoinGateIpn } from "./webhooks/coingate.webhook";
import { startCryptoRenewalCron } from "./cron/crypto-renewal.cron";
import { startNetworkCron } from "./cron/network.cron";

// Validate environment variables before starting
validateEnv();

const app = express();

// Behind Railway/Vercel proxies: derive req.ip from X-Forwarded-For so
// rate limiting is per client, not per proxy.
app.set("trust proxy", 1);

// Apply security headers
app.use(helmet());
app.use(additionalSecurityHeaders);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Stripe webhook needs the raw body for signature verification and must be
// registered before the JSON body parser.
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), handleStripeWebhook);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// CoinGate IPN callback (form-encoded; verified via per-order token)
app.post("/webhooks/coingate", handleCoinGateIpn);

// Rate limiting applies to the API only - payment webhooks (above) are
// exempt: Stripe/CoinGate retries must never be throttled.
app.use(generalRateLimit);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "API is running...",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// API info endpoint
app.get("/api/info", (req, res) => {
  res.json({
    name: "EIDOS CRM API",
    version: "1.0.0",
    description: "Client acquisition and provisioning system for EIDOS",
    endpoints: {
      auth: "/api/auth",
      client: "/api/client",
      admin: "/api/admin",
      subscriptions: "/api/subscriptions",
      broker: "/api/broker",
      prop: "/api/prop",
      network: "/api/network",
      provisioning: "/api/provisioning",
      onboarding: "/api/v1/onboarding",
      notifications: "/api/notifications",
      webhooks: "/webhooks",
    },
  });
});

// Authentication endpoints
app.use("/api/auth", authRoutes);

// Protected routes (require JWT authentication)
app.use("/api/client", clientRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/broker", brokerRoutes);
app.use("/api/prop", propRoutes);
app.use("/api/network", agentCommissionRouter);
app.use("/api/network", agentChallengeRouter);
app.use("/api/network", networkRoutes);
app.use("/api/provisioning", provisioningRoutes);

// Onboarding endpoints (require JWT authentication)
app.use("/api/v1/onboarding", onboardingRoutes);

// Admin-only routes
app.use("/api/admin/provisioning", adminProvisioningRoutes);
app.use("/api/admin/service", adminServiceRoutes);
app.use("/api/admin/commissions", adminCommissionRouter);
app.use("/api/admin/challenges", adminChallengeRouter);
app.use("/api/admin/promos", adminPromoRouter);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/network", adminNetworkRoutes);

// Start cron jobs
startSubscriptionCron();
startProvisioningCron();
startCryptoRenewalCron();
startNetworkCron();

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: { code: "INVALID_JSON", message: "Invalid JSON in request body" } });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: { code: "PAYLOAD_TOO_LARGE", message: "Request entity too large" } });
  }

  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: err.message || "Internal server error",
    },
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Endpoint not found: ${req.method} ${req.path}`,
    },
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API info: http://localhost:${PORT}/api/info`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});
