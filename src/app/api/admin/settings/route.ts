import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, HttpError } from "@/lib/rbac";
import { getPlatformSettings, setPlatformSetting } from "@/lib/settings";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

export async function GET() {
  try {
    await requireAdmin("settings.manage");
    const settings = await getPlatformSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

const bodySchema = z.object({
  listing_price_cents: z.number().int().min(0).max(1_000_00).optional(),
  listing_duration_days: z.number().int().min(1).max(365).optional(),
  featured_listings_enabled: z.boolean().optional(),
  homepage_tagline: z.string().trim().max(200).optional(),
  homepage_subtitle: z.string().trim().max(300).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin("settings.manage");
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) await setPlatformSetting(key as keyof typeof parsed.data, value);
    }

    await auditLog({ actorId: admin.id, action: "settings.update", entityType: "PlatformSetting", metadata: parsed.data });
    const settings = await getPlatformSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
