import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

// Constructed lazily, on first real use, rather than at module scope: Next's
// build-time page-data collection imports every route module without
// invoking it, and Docker builds commonly don't have secrets (like
// STRIPE_SECRET_KEY) available in the build stage at all — only the running
// container gets them. Eagerly constructing here would crash `next build`
// itself whenever the key isn't present at build time.
let stripeClient: Stripe | null = null;
function getStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return stripeClient;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripeClient(), prop, receiver);
  },
});
