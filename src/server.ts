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
import apiKeyRoutes from "./modules/apikey/apikey.routes";
import eaRoutes from "./modules/ea/ea.routes";
import { startSubscriptionCron } from "./cron/subscription.cron";
import notificationRoutes from "./modules/notification/notification.routes";
import adminRoutes from "./modules/admin/admin.routes";
import billingRoutes from "./modules/billing/billing.routes";
import subscriptionRoutes from "./modules/subscription/subscription.routes";
import vpsRoutes from "./modules/vps/vps.routes";
import brokerRoutes from "./modules/broker/broker.routes";
import propRoutes from "./modules/prop/prop.routes";
import deviceRoutes from "./modules/device/device.routes";
import configRoutes from "./modules/config/config.routes";
import onboardingRoutes from "./modules/onboarding/onboarding.routes";
import networkRoutes from "./modules/network/network.routes";
import adminNetworkRoutes from "./modules/network/admin.network.routes";
import { handleStripeWebhook } from "./webhooks/stripe.webhook";

// Validate environment variables before starting
validateEnv();

const app = express();

// Apply security headers
app.use(helmet());
app.use(additionalSecurityHeaders);

// Apply rate limiting
app.use(generalRateLimit);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
    name: "MatchTrading CRM API",
    version: "1.0.0",
    description: "CRM and EA licensing system for MatchTrading",
    endpoints: {
      auth: "/api/auth",
      client: "/api/client",
      admin: "/api/admin",
      apikeys: "/api/apikeys",
      ea: "/api/ea",
      v1: "/v1/ea",
      billing: "/api/billing",
      subscriptions: "/api/subscriptions",
      vps: "/api/vps",
      broker: "/api/broker",
      prop: "/api/prop",
      config: "/api/config",
      notifications: "/api/notifications",
      webhooks: "/webhooks",
    },
    documentation: "https://docs.matchtrading.com/api",
  });
});

// Webhook endpoints (no authentication required)
app.post("/webhooks/stripe", handleStripeWebhook);

// Public endpoints (no authentication required)
app.use("/api/config", configRoutes); // Public config endpoints

// Authentication endpoints
app.use("/api/auth", authRoutes);

// EA validation endpoints (API key authentication)
app.use("/v1/ea", eaRoutes);

// Protected routes (require JWT authentication)
app.use("/api/billing", billingRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/apikeys", apiKeyRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/vps", vpsRoutes);
app.use("/api/broker", brokerRoutes);
app.use("/api/prop", propRoutes);
app.use("/api/device", deviceRoutes);
app.use("/api/network", networkRoutes);

// Onboarding endpoints (require JWT authentication)
app.use("/api/v1/onboarding", onboardingRoutes);

// Admin-only routes
app.use("/api/admin", adminRoutes);
app.use("/api/admin/network", adminNetworkRoutes);

// Admin dashboard (protected)
app.get(
  "/api/admin/dashboard",
  authenticate,
  authorize("ADMIN"),
  (req, res) => {
    res.json({ message: "Welcome Admin" });
  },
);

// Start cron jobs
startSubscriptionCron();

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: "Invalid JSON in request body" });
  }
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: "Request entity too large" });
  }
  
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: "Endpoint not found",
    path: req.path,
    method: req.method,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/info`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});
