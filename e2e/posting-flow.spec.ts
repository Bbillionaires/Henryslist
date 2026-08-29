import { test, expect } from "@playwright/test";

// Exercises the browsable surface of the critical acceptance scenario end to
// end through a real browser: registration, email verification banner,
// and the multi-step posting wizard through to the $1/45-day pricing
// shown on the preview step. Completing an actual Stripe payment isn't
// exercised here (that requires live Stripe test-mode credentials this
// environment doesn't have) — the payment/webhook/activation logic is
// covered by the integration tests in src/lib/listings/*.integration.test.ts,
// and was additionally verified manually against a running server using a
// correctly HMAC-signed webhook payload (see project notes).

test.describe("account creation and listing posting flow", () => {
  test("a new user can register, then create a listing draft through to the payment step", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;

    await page.goto("/register");
    await page.getByLabel("Full name").fill("Playwright Test User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("Password123");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText("Check your email")).toBeVisible({ timeout: 10_000 });

    // Step 1: category + location
    await page.goto("/post");
    await expect(page.getByText(/\$1\.00 to post/)).toBeVisible();
    await page.getByLabel("Category").selectOption({ label: "For Sale" });
    await page.getByPlaceholder("Austin").fill("Austin");
    await page.getByPlaceholder("TX", { exact: true }).fill("TX");
    await page.getByPlaceholder("78701").fill("78701");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2: details
    await page.waitForURL(/\/post\/.+\/details/, { timeout: 20_000 });
    await page.getByLabel("Title").fill("Playwright Test Listing");
    await page.getByLabel("Description").fill("A listing created by an automated end-to-end test.");
    await page.getByRole("button", { name: "Continue to photos" }).click();

    // Step 3: photos (skip — not required). Dev-mode on-demand compilation of
    // a route visited for the first time can take a few seconds, so give
    // navigation more room than the default 5s assertion timeout.
    await page.waitForURL(/\/post\/.+\/photos/, { timeout: 20_000 });
    await page.getByRole("button", { name: "Continue to preview" }).click();

    // Step 4: preview shows the $1 / 45-day pricing box required by the spec
    await page.waitForURL(/\/post\/.+\/preview/, { timeout: 20_000 });
    await expect(page.getByText("Playwright Test Listing")).toBeVisible();
    await expect(page.getByText("Publishing fee")).toBeVisible();
    await expect(page.getByText("$1.00", { exact: true })).toBeVisible();
    await expect(page.getByText("Active for")).toBeVisible();
    await expect(page.getByText("45 days", { exact: true })).toBeVisible();
    await expect(page.getByText("Expiration date")).toBeVisible();
    await expect(page.getByRole("button", { name: /Continue to payment/ })).toBeVisible();
  });

  test("logged-out users can browse and search without an account", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Buy\. Sell\. Find\. For Just \$1\./, level: 1 })).toBeVisible();

    await page.getByPlaceholder("What are you looking for?").fill("sofa");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(/\/search\?q=sofa/);
  });

  test("unauthenticated users are redirected to log in before posting", async ({ page }) => {
    await page.goto("/post");
    await expect(page).toHaveURL(/\/login/);
  });
});
