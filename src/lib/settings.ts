import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

// Admin-configurable platform settings, stored in the PlatformSetting table
// and cached in-process for a short time so hot paths (posting flow, search)
// don't hit the DB on every request. The defaults below match the spec:
// $1.00 / 45 days.

export const SETTINGS_KEYS = {
  LISTING_PRICE_CENTS: "listing_price_cents",
  LISTING_DURATION_DAYS: "listing_duration_days",
  EXPIRING_SOON_DAYS_BEFORE: "expiring_soon_days_before", // e.g. [7, 1]
  FEATURED_LISTINGS_ENABLED: "featured_listings_enabled",
  HOMEPAGE_TAGLINE: "homepage_tagline",
  HOMEPAGE_SUBTITLE: "homepage_subtitle",
} as const;

type SettingsShape = {
  listing_price_cents: number;
  listing_duration_days: number;
  expiring_soon_days_before: number[];
  featured_listings_enabled: boolean;
  homepage_tagline: string;
  homepage_subtitle: string;
};

const DEFAULTS: SettingsShape = {
  listing_price_cents: env.DEFAULT_LISTING_PRICE_CENTS,
  listing_duration_days: env.DEFAULT_LISTING_DURATION_DAYS,
  expiring_soon_days_before: [7, 1],
  featured_listings_enabled: true,
  homepage_tagline: "Buy. Sell. Find. For Just $1.",
  homepage_subtitle: "Post your listing for $1 and keep it live for 45 days.",
};

let cache: { value: SettingsShape; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getPlatformSettings(): Promise<SettingsShape> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;

  const rows = await prisma.platformSetting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const value: SettingsShape = {
    listing_price_cents: (map.get(SETTINGS_KEYS.LISTING_PRICE_CENTS) as number) ?? DEFAULTS.listing_price_cents,
    listing_duration_days: (map.get(SETTINGS_KEYS.LISTING_DURATION_DAYS) as number) ?? DEFAULTS.listing_duration_days,
    expiring_soon_days_before:
      (map.get(SETTINGS_KEYS.EXPIRING_SOON_DAYS_BEFORE) as number[]) ?? DEFAULTS.expiring_soon_days_before,
    featured_listings_enabled:
      (map.get(SETTINGS_KEYS.FEATURED_LISTINGS_ENABLED) as boolean) ?? DEFAULTS.featured_listings_enabled,
    homepage_tagline: (map.get(SETTINGS_KEYS.HOMEPAGE_TAGLINE) as string) ?? DEFAULTS.homepage_tagline,
    homepage_subtitle: (map.get(SETTINGS_KEYS.HOMEPAGE_SUBTITLE) as string) ?? DEFAULTS.homepage_subtitle,
  };

  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

export async function setPlatformSetting(key: keyof SettingsShape, value: unknown) {
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value: value as never },
    update: { value: value as never },
  });
  cache = null;
}

export function invalidateSettingsCache() {
  cache = null;
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
