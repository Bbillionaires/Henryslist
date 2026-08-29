// Pure, environment-independent formatting helpers safe to import from both
// Client and Server Components. Kept separate from lib/settings.ts, which
// reads server-only env vars at module scope — importing that from a client
// component (even just for this function) crashes the client bundle.
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
