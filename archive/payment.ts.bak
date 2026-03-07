/**
 * Stripe Payment Service (V1 - Reserved Structure)
 *
 * This module provides a basic structure for Stripe integration.
 * Full payment functionality will be implemented in a future version.
 *
 * Planned features:
 * - Premium membership subscriptions
 * - Team boost/promotion payments
 * - Commission handling for paid teams
 */

import Stripe from "stripe";

// Stripe configuration
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Validate configuration (warnings only for V1)
if (!STRIPE_SECRET_KEY) {
  console.warn(
    "STRIPE_SECRET_KEY is not configured. Payment features are disabled."
  );
}

if (!STRIPE_WEBHOOK_SECRET) {
  console.warn(
    "STRIPE_WEBHOOK_SECRET is not configured. Webhook handling is disabled."
  );
}

// Initialize Stripe client (only if secret key is available)
export const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia", // Use latest API version
      typescript: true,
    })
  : null;

// Payment configuration
export const paymentConfig = {
  // Currency settings
  currency: "usd",

  // Price IDs (to be configured when products are created)
  prices: {
    premiumMonthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
    premiumYearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY,
    teamBoost: process.env.STRIPE_PRICE_TEAM_BOOST,
  },

  // Subscription tiers
  tiers: {
    free: {
      name: "Free",
      features: [
        "Create up to 3 teams",
        "Join unlimited teams",
        "Basic profile",
      ],
    },
    premium: {
      name: "Premium",
      monthlyPrice: 9.99,
      yearlyPrice: 99.99,
      features: [
        "Unlimited team creation",
        "Priority listing",
        "Advanced analytics",
        "Custom team branding",
        "Priority support",
      ],
    },
  },
};

// Customer types
export interface CreateCustomerInput {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface SubscriptionInput {
  customerId: string;
  priceId: string;
  metadata?: Record<string, string>;
}

// Payment result types
export interface PaymentResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
  return !!stripe && !!STRIPE_SECRET_KEY;
}

/**
 * Create a Stripe customer (V1 - placeholder)
 */
export async function createCustomer(
  input: CreateCustomerInput
): Promise<PaymentResult> {
  if (!stripe) {
    return {
      success: false,
      error: "Stripe is not configured",
    };
  }

  try {
    const customer = await stripe.customers.create({
      email: input.email,
      name: input.name,
      metadata: input.metadata,
    });

    return {
      success: true,
      data: customer,
    };
  } catch (error) {
    console.error("Failed to create Stripe customer:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error creating customer",
    };
  }
}

/**
 * Create a subscription (V1 - placeholder)
 */
export async function createSubscription(
  input: SubscriptionInput
): Promise<PaymentResult> {
  if (!stripe) {
    return {
      success: false,
      error: "Stripe is not configured",
    };
  }

  try {
    const subscription = await stripe.subscriptions.create({
      customer: input.customerId,
      items: [{ price: input.priceId }],
      metadata: input.metadata,
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });

    return {
      success: true,
      data: subscription,
    };
  } catch (error) {
    console.error("Failed to create subscription:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error creating subscription",
    };
  }
}

/**
 * Create a checkout session (V1 - placeholder)
 */
export async function createCheckoutSession(params: {
  customerId?: string;
  customerEmail?: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  mode?: "subscription" | "payment";
  metadata?: Record<string, string>;
}): Promise<PaymentResult> {
  if (!stripe) {
    return {
      success: false,
      error: "Stripe is not configured",
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      customer: params.customerId,
      customer_email: params.customerEmail,
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      mode: params.mode || "subscription",
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
    });

    return {
      success: true,
      data: session,
    };
  } catch (error) {
    console.error("Failed to create checkout session:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error creating checkout session",
    };
  }
}

/**
 * Verify webhook signature (V1 - placeholder)
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): PaymentResult {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return {
      success: false,
      error: "Stripe webhook is not configured",
    };
  }

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      STRIPE_WEBHOOK_SECRET
    );

    return {
      success: true,
      data: event,
    };
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error verifying webhook",
    };
  }
}

/**
 * Handle webhook events (V1 - placeholder)
 *
 * This function should be called in your webhook handler route
 */
export async function handleWebhookEvent(
  event: Stripe.Event
): Promise<PaymentResult> {
  switch (event.type) {
    case "customer.subscription.created":
      // Handle subscription creation
      console.log("Subscription created:", event.data.object);
      break;

    case "customer.subscription.updated":
      // Handle subscription update
      console.log("Subscription updated:", event.data.object);
      break;

    case "customer.subscription.deleted":
      // Handle subscription cancellation
      console.log("Subscription deleted:", event.data.object);
      break;

    case "invoice.payment_succeeded":
      // Handle successful payment
      console.log("Payment succeeded:", event.data.object);
      break;

    case "invoice.payment_failed":
      // Handle failed payment
      console.log("Payment failed:", event.data.object);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return {
    success: true,
    data: { received: true, type: event.type },
  };
}

// Export Stripe types for use in other modules
export type { Stripe };
