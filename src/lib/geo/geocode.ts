import "server-only";
import { prisma } from "@/lib/prisma";

interface LatLng {
  lat: number;
  lng: number;
}

// Process-local cache so repeated lookups for the same ZIP within a
// server's lifetime don't re-hit the network. Location rows also persist
// resolved coordinates (see geocodeAndCacheZip), so this is a secondary,
// short-lived optimization on top of that.
const memoryCache = new Map<string, LatLng | null>();

/**
 * Resolves a US ZIP code to approximate coordinates using Zippopotam.us, a
 * free, keyless public geocoding API. No API key/credentials are configured
 * for this environment, so this is the "works out of the box" default.
 * For production-scale traffic or non-US coverage, swap this out for a
 * provider with an SLA (Google Geocoding, Mapbox, or a licensed ZIP
 * database) — everything downstream only depends on this function's shape.
 * Never throws: geocoding failures degrade to "no radius filtering" rather
 * than breaking search or listing creation.
 */
export async function geocodeZip(zip: string): Promise<LatLng | null> {
  const clean = zip.trim().slice(0, 5);
  if (!/^\d{5}$/.test(clean)) return null;

  if (memoryCache.has(clean)) return memoryCache.get(clean)!;

  try {
    const res = await fetch(`https://api.zippopotam.us/us/${clean}`, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: false },
    });
    if (!res.ok) {
      memoryCache.set(clean, null);
      return null;
    }
    const data = (await res.json()) as { places?: { latitude: string; longitude: string }[] };
    const place = data.places?.[0];
    if (!place) {
      memoryCache.set(clean, null);
      return null;
    }
    const result = { lat: parseFloat(place.latitude), lng: parseFloat(place.longitude) };
    memoryCache.set(clean, result);
    return result;
  } catch (err) {
    console.warn(`geocodeZip(${clean}) failed:`, err instanceof Error ? err.message : err);
    memoryCache.set(clean, null);
    return null;
  }
}

/** Geocodes a Location's ZIP (if it has one and isn't already geocoded) and persists the result. Best-effort. */
export async function backfillLocationCoordinates(locationId: string): Promise<void> {
  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location || !location.zip || (location.lat && location.lng)) return;

  const coords = await geocodeZip(location.zip);
  if (!coords) return;

  await prisma.location.update({ where: { id: locationId }, data: { lat: coords.lat, lng: coords.lng } }).catch(() => {});
}
