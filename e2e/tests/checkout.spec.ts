import { test, expect, Page } from "@playwright/test";

/**
 * E2E: checkout on both providers (spec 5.2 / M3 acceptance).
 * - Card: Stripe test mode (E2E_STRIPE=1) with the 4242 test card.
 * - Crypto: CoinGate sandbox (E2E_COINGATE=1) - asserts the redirect;
 *   sandbox payment confirmation is manual or via the sandbox API.
 */

const EMAIL = process.env.E2E_USER_EMAIL;
const PASSWORD = process.env.E2E_USER_PASSWORD;

const login = async (page: Page) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(EMAIL!);
  await page.getByLabel(/password/i).fill(PASSWORD!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/);
};

test.describe("card checkout (Stripe test mode)", () => {
  test.skip(!EMAIL || !PASSWORD, "E2E_USER_EMAIL / E2E_USER_PASSWORD not configured");
  test.skip(process.env.E2E_STRIPE !== "1", "E2E_STRIPE=1 not set");

  test("selects a plan and completes the Stripe hosted checkout", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard/client/onboarding/payment");

    await page.getByRole("button", { name: /pay with card/i }).click();
    await page.getByRole("button", { name: /choose/i }).first().click();

    // Stripe hosted checkout
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
    await page.getByLabel(/email/i).fill(EMAIL!);
    await page.getByPlaceholder("1234 1234 1234 1234").fill("4242424242424242");
    await page.getByPlaceholder("MM / YY").fill("12/34");
    await page.getByPlaceholder("CVC").fill("123");
    await page.getByLabel(/name on card/i).fill("E2E Tester");
    await page.getByTestId("hosted-payment-submit-button").click();

    // Back on the review page; the webhook completes the payment step
    await page.waitForURL(/onboarding\/review\?success=true/, { timeout: 60_000 });
    await expect(page.getByText(/active|confirming your payment/i)).toBeVisible({ timeout: 90_000 });
  });
});

test.describe("crypto checkout (CoinGate sandbox)", () => {
  test.skip(!EMAIL || !PASSWORD, "E2E_USER_EMAIL / E2E_USER_PASSWORD not configured");
  test.skip(process.env.E2E_COINGATE !== "1", "E2E_COINGATE=1 not set");

  test("selects crypto and is redirected to the CoinGate payment page", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard/client/onboarding/payment");

    await page.getByRole("button", { name: /pay with crypto/i }).click();
    await expect(page.getByText(/redirected to coingate/i)).toBeVisible();
    await page.getByRole("button", { name: /choose/i }).first().click();

    await page.waitForURL(/coingate\.com/, { timeout: 30_000 });
  });
});
