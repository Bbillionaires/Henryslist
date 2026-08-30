import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { CATEGORY_SEED } from "../../../../../prisma/seed-data";

// TEMPORARY, one-time production bootstrap endpoint. Seeds categories,
// platform settings, static legal/help pages, and a single real admin
// account - deliberately NOT the full prisma/seed.ts (which also creates
// demo users/listings with hardcoded passwords, unsuitable for a real
// production database). Guarded by CRON_SECRET since it's already a
// required, already-configured production secret. Delete after running once.

const STATIC_PAGES: { slug: string; title: string; body: string }[] = [
  {
    slug: "terms",
    title: "Terms of Service",
    body: `<h2>1. Acceptance of Terms</h2><p>By using Henry's List, you agree to these Terms of Service. If you do not agree, please do not use the platform.</p><h2>2. The $1 Listing Fee</h2><p>Every listing costs $1.00 USD to publish and remains active for 45 days from the date payment is confirmed. Listings do not automatically renew; you may renew an expired listing for another $1.00 / 45 days at any time.</p><h2>3. Acceptable Use</h2><p>You agree not to post prohibited, illegal, fraudulent, or misleading content. See our Prohibited Items and Community Guidelines pages for details.</p><h2>4. Payments</h2><p>Payments are processed by Stripe. We do not store your card details. All fees are non-refundable except as described in our Refund Policy.</p><h2>5. Account Termination</h2><p>We may suspend or terminate accounts that violate these terms.</p><h2>6. Disclaimer</h2><p>Henry's List is a venue for buyers and sellers to connect. We are not a party to any transaction between users and do not guarantee the accuracy of listings.</p>`,
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    body: `<h2>Information We Collect</h2><p>We collect the information you provide when creating an account and posting listings (name, email, phone, location, listing content, images) and payment metadata from Stripe (we never see or store your card number).</p><h2>How We Use It</h2><p>To operate the marketplace: displaying listings, facilitating messages between buyers and sellers, sending transactional notifications, and preventing fraud and abuse.</p><h2>Location & Contact Info</h2><p>Your exact address is never shown publicly unless you explicitly opt in. Your email is never shown to other users by default — messaging happens through our in-app system.</p><h2>Your Rights</h2><p>You can review, update, or delete your account and personal data at any time from Account Settings, subject to records we must retain for legal, tax, or fraud-prevention purposes.</p><h2>Data Sharing</h2><p>We share data with service providers (payments, email, hosting) strictly to operate the service, and with law enforcement when legally required.</p>`,
  },
  {
    slug: "community-guidelines",
    title: "Community Guidelines",
    body: `<h2>Be honest</h2><p>Describe items and services accurately. Use real photos of the actual item.</p><h2>Be respectful</h2><p>Harassment, hate speech, and threats are never allowed, in listings or messages.</p><h2>Meet safely</h2><p>See our Safety Guidelines for tips on meeting buyers/sellers in person.</p><h2>One listing per item</h2><p>Don't post duplicate listings for the same item to game visibility.</p><h2>Report bad actors</h2><p>Use the Report button on any listing, message, or profile that violates these guidelines.</p>`,
  },
  {
    slug: "prohibited-items",
    title: "Prohibited Items & Content",
    body: `<p>The following may not be posted on Henry's List:</p><ul><li>Weapons, ammunition, and explosives</li><li>Illegal drugs and drug paraphernalia</li><li>Stolen goods</li><li>Counterfeit goods</li><li>Recalled products</li><li>Live animals in violation of local law, or animal fighting</li><li>Adult services or sexually explicit content</li><li>Human remains or body parts</li><li>Government IDs, documents, or credentials</li><li>Hacking tools, malware, or unauthorized access services</li><li>Multi-level marketing / pyramid schemes</li><li>Anything else illegal under local, state, or federal law</li></ul><p>Listings that appear to violate this policy may be automatically flagged for review by our moderation team. We do not auto-delete ambiguous listings — a human moderator reviews flagged content before any removal.</p>`,
  },
  {
    slug: "refund-policy",
    title: "Refund Policy",
    body: `<p>The $1 listing fee is generally non-refundable once a listing is published, since it purchases 45 days of visibility that begins immediately.</p><p>Exceptions where a refund may be issued at our discretion:</p><ul><li>A duplicate or accidental charge</li><li>A technical error prevented your listing from publishing after payment</li><li>Your listing was removed by moderation in error</li></ul><p>Contact support to request a refund review — approved refunds are processed back to your original payment method via Stripe within 5–10 business days.</p>`,
  },
  {
    slug: "safety-guidelines",
    title: "Safety Guidelines",
    body: `<h2>Meeting in person</h2><ul><li>Meet in a public place during daylight hours.</li><li>Bring a friend if possible.</li><li>Tell someone where you're going.</li></ul><h2>Payments</h2><ul><li>Prefer cash or in-person payment apps for local deals.</li><li>Never wire money or send gift cards to a stranger.</li><li>Be wary of buyers who overpay and ask for a refund of the difference — a classic scam.</li></ul><h2>Online</h2><ul><li>Keep communication inside Henry's List messaging until you're comfortable.</li><li>Never share passwords, verification codes, or bank details.</li></ul>`,
  },
  {
    slug: "contact",
    title: "Contact & Support",
    body: `<p>Need help? Reach our support team:</p><ul><li>Email: support@henryslist.example</li><li>Report a listing, user, or message directly using the Report button wherever you see it — this routes straight to our moderation queue.</li></ul><p>We aim to respond to all support requests within 1–2 business days.</p>`,
  },
];

async function seedCategories() {
  for (let i = 0; i < CATEGORY_SEED.length; i++) {
    const cat = CATEGORY_SEED[i]!;
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      create: { name: cat.name, slug: cat.slug, description: cat.description, icon: cat.icon, sortOrder: i },
      update: { name: cat.name, description: cat.description, icon: cat.icon, sortOrder: i },
    });

    for (let j = 0; j < cat.subcategories.length; j++) {
      const sub = cat.subcategories[j]!;
      await prisma.subcategory.upsert({
        where: { categoryId_slug: { categoryId: category.id, slug: sub.slug } },
        create: { categoryId: category.id, name: sub.name, slug: sub.slug, sortOrder: j },
        update: { name: sub.name, sortOrder: j },
      });
    }

    for (let k = 0; k < (cat.fields?.length ?? 0); k++) {
      const field = cat.fields![k]!;
      const existing = await prisma.categoryField.findFirst({ where: { categoryId: category.id, key: field.key } });
      const data = {
        categoryId: category.id,
        key: field.key,
        label: field.label,
        type: field.type,
        required: field.required ?? false,
        options: field.options ?? undefined,
        unit: field.unit,
        sortOrder: k,
      };
      if (existing) {
        await prisma.categoryField.update({ where: { id: existing.id }, data });
      } else {
        await prisma.categoryField.create({ data });
      }
    }
  }
  return CATEGORY_SEED.length;
}

async function seedPlatformSettings() {
  const settings: Array<{ key: string; value: unknown }> = [
    { key: "listing_price_cents", value: 100 },
    { key: "listing_duration_days", value: 45 },
    { key: "expiring_soon_days_before", value: [7, 1] },
    { key: "featured_listings_enabled", value: true },
    { key: "homepage_tagline", value: "Buy. Sell. Find. For Just $1." },
    { key: "homepage_subtitle", value: "Post your listing for $1 and keep it live for 45 days." },
  ];
  for (const s of settings) {
    await prisma.platformSetting.upsert({ where: { key: s.key }, create: { key: s.key, value: s.value as never }, update: {} });
  }
}

async function seedStaticPages() {
  for (const page of STATIC_PAGES) {
    await prisma.staticPage.upsert({ where: { slug: page.slug }, create: page, update: { title: page.title, body: page.body } });
  }
  return STATIC_PAGES.length;
}

async function seedAdmin(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  const adminUser = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Henry (Admin)",
      passwordHash,
      emailVerified: new Date(),
      profile: { create: { displayName: "Henry (Admin)" } },
      notificationPref: { create: {} },
    },
    update: {},
  });
  await prisma.adminUser.upsert({
    where: { userId: adminUser.id },
    create: { userId: adminUser.id, role: "SUPER_ADMIN" },
    update: { role: "SUPER_ADMIN", active: true },
  });
  return adminUser.email;
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const adminEmail = typeof body.adminEmail === "string" ? body.adminEmail : null;
  const adminPassword = typeof body.adminPassword === "string" ? body.adminPassword : null;
  if (!adminEmail || !adminPassword) {
    return NextResponse.json({ error: "adminEmail and adminPassword are required in the request body" }, { status: 400 });
  }

  const categoryCount = await seedCategories();
  await seedPlatformSettings();
  const pageCount = await seedStaticPages();
  const admin = await seedAdmin(adminEmail, adminPassword);

  return NextResponse.json({ categoryCount, pageCount, admin });
}
