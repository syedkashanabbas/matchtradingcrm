import { prisma } from "../../config/prisma";
import { stripe } from "../../config/stripe";
import { env } from "../../config/env-validation";
import { PlanType, SubscriptionStatus, ClientStatus } from "@prisma/client";

export const createFreeSubscription = async (userId: string, planType: PlanType = PlanType.FREE) => {
  // DEBUG: Log subscription creation
  console.log('🔍 DEBUG - createFreeSubscription:');
  console.log('User ID:', userId);
  console.log('Plan type:', planType);
  console.log('Plan type type:', typeof planType);
  console.log('PlanType.FREE:', PlanType.FREE);
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Create subscription in database
  const subscription = await prisma.subscription.create({
    data: {
      userId,
      stripeSubscriptionId: `${planType.toLowerCase()}_${userId}_${Date.now()}`,
      stripeCustomerId: `${planType.toLowerCase()}_customer_${userId}`,
      plan: planType,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    },
  });
  
  console.log('Created subscription in DB:', subscription);

  // Update user status
  await updateUserStatusBasedOnSubscription(userId);

  return subscription;
};

export const createSubscription = async (userId: string, plan: PlanType) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Create or retrieve Stripe customer
  let stripeCustomerId = user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        userId: user.id,
      },
    });
    stripeCustomerId = customer.id;
    
    // Update user with Stripe customer ID
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId },
    });
  }

  // Determine price based on plan
  const priceMap = {
    FREE: env.STRIPE_FREE_PRICE_ID,
    PRO: env.STRIPE_PRO_PRICE_ID,
    ENTERPRISE: env.STRIPE_ENTERPRISE_PRICE_ID,
  };

  const priceId = priceMap[plan];
  if (!priceId) {
    throw new Error(`No price ID configured for ${plan} plan`);
  }

  // For development, if price ID looks like a product ID, create a fallback
  if (priceId.startsWith('prod_')) {
    console.warn(`Invalid price ID detected: ${priceId}. Price IDs should start with 'price_'.`);
    
    // Try to create a price from the product ID (fallback for development)
    try {
      const product = await stripe.products.retrieve(priceId);
      const prices = await stripe.prices.list({
        product: priceId,
        active: true,
        limit: 1
      });
      
      if (prices.data.length > 0) {
        console.log(`Found active price: ${prices.data[0].id}`);
        const validPriceId = prices.data[0].id;
        
        // Create checkout session with valid price
        const session = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          payment_method_types: ["card"],
          mode: "subscription",
          line_items: [
            {
              price: validPriceId,
              quantity: 1,
            },
          ],
          success_url: `${env.CLIENT_URL}/dashboard/client/onboarding/review?success=true`,
          cancel_url: `${env.CLIENT_URL}/dashboard/client/onboarding/payment?canceled=true`,
          metadata: {
            userId,
            plan,
          },
        });
        
        return session;
      } else {
        throw new Error(`No active prices found for product ${priceId}`);
      }
    } catch (error) {
      console.error('Error retrieving product prices:', error);
      throw new Error(`Invalid price configuration for ${plan} plan. Please check your Stripe price IDs.`);
    }
  }

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${env.CLIENT_URL}/dashboard/client/onboarding/review?success=true`,
    cancel_url: `${env.CLIENT_URL}/dashboard/client/onboarding/payment?canceled=true`,
    metadata: {
      userId,
      plan,
    },
  });

  return session;
};

export const handleSubscriptionCreated = async (subscriptionId: string) => {
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  const userId = stripeSubscription.metadata.userId;
  const plan = stripeSubscription.metadata.plan as PlanType;

  if (!userId || !plan) {
    throw new Error("Invalid subscription metadata");
  }

  // Create subscription in database
  const subscription = await prisma.subscription.create({
    data: {
      userId,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: stripeSubscription.customer as string,
      plan,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
    },
  });

  // Update user status
  await updateUserStatusBasedOnSubscription(userId);

  return subscription;
};

export const handleSubscriptionPaymentFailed = async (subscriptionId: string) => {
  const subscription = await prisma.subscription.update({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      status: SubscriptionStatus.PAST_DUE,
    },
  });

  // Start grace period (7 days from now)
  const gracePeriodEnd = new Date();
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

  await prisma.user.update({
    where: { id: subscription.userId },
    data: {
      status: ClientStatus.SUSPENDED,
      gracePeriodEnd,
    },
  });

  // Create alert for user
  await createAlert(subscription.userId, "PAYMENT_FAILURE", "Payment Failed", "Your subscription payment has failed. Please update your payment method.", "HIGH");

  return subscription;
};

export const handleSubscriptionDeleted = async (subscriptionId: string) => {
  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  // Update subscription status
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: SubscriptionStatus.CANCELED,
    },
  });

  // Deactivate user
  await prisma.user.update({
    where: { id: subscription.userId },
    data: {
      status: ClientStatus.INACTIVE,
    },
  });

  // Create alert for user
  await createAlert(subscription.userId, "SUBSCRIPTION_EXPIRED", "Subscription Canceled", "Your subscription has been canceled and your service has been deactivated.", "CRITICAL");

  return subscription;
};

export const handleInvoicePaymentFailed = async (invoiceId: string) => {
  // This function is called by webhook handler
  // The actual logic is in the webhook handler
  console.log(`Invoice payment failed: ${invoiceId}`);
};

export const getUserSubscription = async (userId: string) => {
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // DEBUG: Log subscription from database
  console.log('🔍 DEBUG - getUserSubscription:');
  console.log('User ID:', userId);
  console.log('Raw subscription from DB:', subscription);
  console.log('Plan from DB:', subscription?.plan);
  
  if (!subscription) {
    console.log('No subscription found, returning null');
    return null;
  }

  // Calculate price based on plan type
  const getPriceForPlan = (plan: string): string => {
    console.log('Calculating price for plan:', plan);
    switch (plan) {
      case 'FREE':
        return '$0/month';
      case 'PRO':
        return '$99/month';
      case 'ENTERPRISE':
        return '$299/month';
      default:
        return '$0/month';
    }
  };

  // Add calculated price to subscription object
  const subscriptionWithPrice = {
    ...subscription,
    price: getPriceForPlan(subscription.plan)
  };

  console.log('Final subscription with price:', subscriptionWithPrice);
  return subscriptionWithPrice;
};

export const cancelSubscription = async (userId: string, immediate: boolean = false) => {
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
  });

  if (!subscription) {
    throw new Error("No active subscription found");
  }

  if (immediate) {
    // Cancel immediately
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
  } else {
    // Cancel at period end
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
      },
    });
  }

  return subscription;
};

export const reactivateSubscription = async (userId: string) => {
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
  });

  if (!subscription) {
    throw new Error("No subscription found");
  }

  // Update Stripe subscription
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  // Update database
  const updatedSubscription = await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: false,
    },
  });

  // Update user status
  await updateUserStatusBasedOnSubscription(userId);

  return updatedSubscription;
};

export const updateUserStatusBasedOnSubscription = async (userId: string) => {
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) {
    await prisma.user.update({
      where: { id: userId },
      data: { status: ClientStatus.NEW },
    });
    return;
  }

  const now = new Date();
  let userStatus: ClientStatus;

  if (subscription.status === SubscriptionStatus.ACTIVE && subscription.currentPeriodEnd > now) {
    userStatus = ClientStatus.ACTIVE;
  } else if (subscription.status === SubscriptionStatus.PAST_DUE) {
    userStatus = ClientStatus.SUSPENDED;
  } else {
    userStatus = ClientStatus.INACTIVE;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { 
      status: userStatus,
      subscriptionEnd: subscription.currentPeriodEnd,
    },
  });
};

export const getSubscriptionPlans = () => {
  return [
    {
      id: "FREE",
      name: "Free Plan",
      price: 0,
      features: [
        "1 API key",
        "100 API calls/month",
        "Email support",
        "Basic configuration",
      ],
      stripePriceId: env.STRIPE_FREE_PRICE_ID,
    },
    {
      id: "PRO",
      name: "Pro Plan",
      price: 29.99,
      features: [
        "5 API keys",
        "1000 API calls/month",
        "Priority email support",
        "Advanced configuration",
        "Device tracking",
      ],
      stripePriceId: env.STRIPE_PRO_PRICE_ID,
    },
    {
      id: "ENTERPRISE",
      name: "Enterprise Plan",
      price: 99.99,
      features: [
        "Unlimited API keys",
        "Unlimited API calls",
        "Priority phone support",
        "Custom configurations",
        "Advanced analytics",
        "Dedicated support",
      ],
      stripePriceId: env.STRIPE_ENTERPRISE_PRICE_ID,
    },
  ];
};

// Helper function to create alerts
const createAlert = async (userId: string, type: any, title: string, message: string, severity: any) => {
  return prisma.alert.create({
    data: {
      userId,
      type,
      title,
      message,
      severity,
    },
  });
};
