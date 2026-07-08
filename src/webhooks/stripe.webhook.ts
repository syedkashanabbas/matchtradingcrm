import { Request, Response } from "express";
import Stripe from "stripe";
import {
  handleSubscriptionCreated,
  handleSubscriptionPaymentFailed,
  handleSubscriptionDeleted,
} from "../modules/subscription/subscription.service";
import { createAuditEvent } from "../services/audit.service";
import { createAlert } from "../services/notification.service";
import { prisma } from "../config/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return res.status(400).json({ message: "Missing webhook signature" });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  // Log the received event
  console.log(`Received Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      // Subscription events
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object.id);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object.id);
        break;

      case "customer.subscription.paused":
        await handleSubscriptionPaused(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.resumed":
        await handleSubscriptionResumed(event.data.object as Stripe.Subscription);
        break;

      // Invoice events
      case "invoice.created":
        await handleInvoiceCreated(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        console.log(`Invoice payment failed: ${event.data.object.id}`);
        break;

      case "invoice.payment_action_required":
        await handleInvoicePaymentActionRequired(event.data.object as Stripe.Invoice);
        break;

      case "invoice.upcoming":
        await handleInvoiceUpcoming(event.data.object as Stripe.Invoice);
        break;

      case "invoice.marked_uncollectible":
        await handleInvoiceMarkedUncollectible(event.data.object as Stripe.Invoice);
        break;

      // Payment intent events
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      // Customer events
      case "customer.created":
        await handleCustomerCreated(event.data.object as Stripe.Customer);
        break;

      case "customer.updated":
        await handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;

      case "customer.deleted":
        await handleCustomerDeleted(event.data.object as Stripe.Customer);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Create audit log for webhook processing
    await createAuditEvent({
      action: "WEBHOOK_PROCESSED",
      resource: "STRIPE",
      details: {
        eventType: event.type,
        eventId: event.id,
        processedAt: new Date(),
      },
      severity: "LOW",
    });

    res.json({ received: true });
  } catch (error: any) {
    console.error(`Error handling webhook ${event.type}:`, error);
    
    // Create audit log for webhook error
    await createAuditEvent({
      action: "WEBHOOK_ERROR",
      resource: "STRIPE",
      details: {
        eventType: event.type,
        eventId: event.id,
        error: error.message,
        processedAt: new Date(),
      },
      severity: "HIGH",
    });

    res.status(500).json({ message: "Webhook processing failed" });
  }
};

// Additional webhook handlers
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Update subscription in database
  // This would update the subscription status and other details
  
  await createAuditEvent({
    action: "SUBSCRIPTION_UPDATED",
    resource: "SUBSCRIPTION",
    details: {
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    },
    severity: "MEDIUM",
  });
}

async function handleSubscriptionPaused(subscription: Stripe.Subscription) {
  // Handle subscription pause
  
  await createAuditEvent({
    action: "SUBSCRIPTION_PAUSED",
    resource: "SUBSCRIPTION",
    details: {
      subscriptionId: subscription.id,
      pauseCollection: subscription.pause_collection,
    },
    severity: "MEDIUM",
  });
}

async function handleSubscriptionResumed(subscription: Stripe.Subscription) {
  // Handle subscription resume
  
  await createAuditEvent({
    action: "SUBSCRIPTION_RESUMED",
    resource: "SUBSCRIPTION",
    details: {
      subscriptionId: subscription.id,
      status: subscription.status,
    },
    severity: "MEDIUM",
  });
}

async function handleInvoiceCreated(invoice: Stripe.Invoice) {
  // Handle invoice creation
  
  await createAuditEvent({
    action: "INVOICE_CREATED",
    resource: "INVOICE",
    details: {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_due,
      currency: invoice.currency,
    },
    severity: "LOW",
  });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Handle successful payment
  
  await createAuditEvent({
    action: "PAYMENT_SUCCEEDED",
    resource: "INVOICE",
    details: {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_paid,
      currency: invoice.currency,
    },
    severity: "MEDIUM",
  });
}

async function handleInvoicePaymentActionRequired(invoice: Stripe.Invoice) {
  // Handle payment action required (3D Secure, etc.)
  
  if (invoice.customer) {
    await createAlert(
      invoice.customer as string,
      "PAYMENT_FAILURE",
      "Payment Action Required",
      "Your payment requires additional authentication. Please complete the payment process.",
      "HIGH"
    );
  }
  
  await createAuditEvent({
    action: "PAYMENT_ACTION_REQUIRED",
    resource: "INVOICE",
    details: {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_due,
    },
    severity: "HIGH",
  });
}

async function handleInvoiceUpcoming(invoice: Stripe.Invoice) {
  // Handle upcoming invoice (send reminder)
  
  if (invoice.customer) {
    await createAlert(
      invoice.customer as string,
      "PAYMENT_FAILURE",
      "Upcoming Payment",
      `Your payment of ${invoice.amount_due / 100} ${invoice.currency?.toUpperCase()} is due on ${new Date(invoice.due_date! * 1000).toLocaleDateString()}.`,
      "MEDIUM"
    );
  }
}

async function handleInvoiceMarkedUncollectible(invoice: Stripe.Invoice) {
  // Handle uncollectible invoice
  
  await createAuditEvent({
    action: "INVOICE_UNCOLLECTIBLE",
    resource: "INVOICE",
    details: {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_due,
    },
    severity: "HIGH",
  });
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // Handle successful payment intent
  
  await createAuditEvent({
    action: "PAYMENT_INTENT_SUCCEEDED",
    resource: "PAYMENT_INTENT",
    details: {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      customerId: paymentIntent.customer,
    },
    severity: "MEDIUM",
  });
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  // Handle failed payment intent
  
  await createAuditEvent({
    action: "PAYMENT_INTENT_FAILED",
    resource: "PAYMENT_INTENT",
    details: {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      customerId: paymentIntent.customer,
      lastPaymentError: paymentIntent.last_payment_error,
    },
    severity: "HIGH",
  });
}

async function handleCustomerCreated(customer: Stripe.Customer) {
  // Handle customer creation
  
  await createAuditEvent({
    action: "CUSTOMER_CREATED",
    resource: "CUSTOMER",
    details: {
      customerId: customer.id,
      email: customer.email,
    },
    severity: "LOW",
  });
}

async function handleCustomerUpdated(customer: Stripe.Customer) {
  // Handle customer update
  
  await createAuditEvent({
    action: "CUSTOMER_UPDATED",
    resource: "CUSTOMER",
    details: {
      customerId: customer.id,
      email: customer.email,
    },
    severity: "LOW",
  });
}

async function handleCustomerDeleted(customer: Stripe.Customer) {
  // Handle customer deletion
  
  await createAuditEvent({
    action: "CUSTOMER_DELETED",
    resource: "CUSTOMER",
    details: {
      customerId: customer.id,
      email: customer.email,
    },
    severity: "MEDIUM",
  });
}
