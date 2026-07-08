import { stripe } from "../../config/stripe";
import { env } from "../../config/env-validation";

export const createCheckoutSession = async () => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [
      {
        price: env.STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    success_url: `${env.CLIENT_URL}/success`,
    cancel_url: `${env.CLIENT_URL}/cancel`,
    metadata: {
      userId: "test-user",
    },
  });

  return session;
};
