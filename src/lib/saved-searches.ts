import "server-only";
import { prisma } from "@/lib/prisma";
import { searchListings, type SearchParams } from "@/lib/search";
import { notify } from "@/lib/notifications";
import { emailTemplates } from "@/lib/email/templates";
import { listingSearchSchema } from "@/lib/validation/listing";

export interface SavedSearchSweepResult {
  checked: number;
  notified: number;
}

/**
 * Runs every saved (non-paused) search and, for any that turn up listings
 * published since the search's last run, emails the owner a summary. Meant
 * to be called from the same scheduled job as listing expiration.
 */
export async function runSavedSearchSweep(now: Date = new Date()): Promise<SavedSearchSweepResult> {
  const savedSearches = await prisma.savedSearch.findMany({ where: { isPaused: false } });

  let notified = 0;
  for (const saved of savedSearches) {
    const parsed = listingSearchSchema.safeParse(saved.query);
    if (!parsed.success) continue;

    const params: SearchParams = { ...parsed.data, sort: "newest", page: 1, pageSize: 20 };
    const since = saved.lastRunAt ?? saved.createdAt;

    const results = await searchListings(params);
    const freshMatches = results.listings.filter((l) => l.publishedAt && l.publishedAt > since);

    if (freshMatches.length > 0 && saved.notifyByEmail) {
      const template = emailTemplates.savedSearchMatch(saved.name, freshMatches.length, saved.id);
      await notify({
        userId: saved.userId,
        type: "SAVED_SEARCH_MATCH",
        title: `${freshMatches.length} new match${freshMatches.length === 1 ? "" : "es"} for "${saved.name}"`,
        body: `We found ${freshMatches.length} new listing(s) matching your saved search.`,
        link: `/search?savedSearch=${saved.id}`,
        email: template,
      });
      notified++;
    }

    await prisma.savedSearch.update({
      where: { id: saved.id },
      data: { lastRunAt: now, ...(freshMatches.length > 0 ? { lastNotifiedAt: now } : {}) },
    });
  }

  return { checked: savedSearches.length, notified };
}
