// Central, validated access to environment variables. Import from here
// instead of reading `process.env` directly, so a missing required var fails
// fast and loudly at startup rather than causing a confusing runtime bug
// three layers deep (e.g. a payment silently not verifying).
import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be a long random string"),
  AUTH_TRUST_HOST: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),

  EMAIL_PROVIDER: z.enum(["console", "smtp", "resend"]).default("console"),
  EMAIL_FROM: z.string().default("Henry's List <notifications@henryslist.example>"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  RESEND_API_KEY: z.string().optional(),

  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  LOCAL_STORAGE_DIR: z.string().default("./public/uploads"),
  LOCAL_STORAGE_PUBLIC_PATH: z.string().default("/uploads"),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),

  CRON_SECRET: z.string().min(16, "CRON_SECRET must be a long random string"),

  DEFAULT_LISTING_PRICE_CENTS: z.coerce.number().default(100),
  DEFAULT_LISTING_DURATION_DAYS: z.coerce.number().default(45),

  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  TURNSTILE_SECRET_KEY: z.string().optional(),

  VAPID_PRIVATE_KEY: z.string().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_SITE_NAME: z.string().default("Henry's List"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().default(""),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
});

function loadServerEnv() {
  // Only parse on the server. Skip during `next build`'s client bundling
  // pass where process.env may be partially defined.
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const isBuildLint = process.env.SKIP_ENV_VALIDATION === "true";
    if (isBuildLint) return serverSchema.partial().parse({}) as z.infer<typeof serverSchema>;
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables. See above for details. Copy .env.example to .env and fill in required values.");
  }
  return parsed.data;
}

export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
});

export const env = typeof window === "undefined" ? loadServerEnv() : (undefined as never);
