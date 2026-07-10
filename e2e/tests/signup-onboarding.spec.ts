import { test, expect, Page } from "@playwright/test";

/**
 * E2E: sign-up with referral -> onboarding -> provisioning (spec 5.2, M5).
 * Requires a running stack (frontend + backend + DB). The provisioning step
 * asserts the status card appears; the EasierProp side should point at a
 * sandbox or mock in staging.
 */

const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const EMAIL = `e2e-${unique}@example.com`;
const PASSWORD = "E2e-password-123!";
const REF_CODE = process.env.E2E_REF_CODE;

const register = async (page: Page, withReferral: boolean) => {
  const path = withReferral && REF_CODE ? `/register?ref=${REF_CODE}` : "/register";
  await page.goto(path);

  await page.getByLabel("First Name").fill("E2E");
  await page.getByLabel("Last Name").fill("Tester");
  await page.getByLabel("Email Address").fill(EMAIL);
  await page.getByLabel("Phone Number").fill("+391234567890");
  await page.getByLabel("Country").selectOption("Italy");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm Password").fill(PASSWORD);
  await page.locator("#terms").check();
  await page.locator("#privacy").check();
  await page.getByRole("button", { name: /create account/i }).click();
};

test.describe("sign-up with referral -> onboarding", () => {
  test("registers, lands on the onboarding wizard and saves broker + prop credentials", async ({ page }) => {
    await register(page, true);

    // Auto-login lands the client on the wizard (payment first)
    await page.waitForURL(/\/dashboard\/client/, { timeout: 20_000 });
    await page.goto("/dashboard/client/onboarding");
    await page.waitForURL(/onboarding\/(payment|broker|prop|review)/);

    // Payment step is completed by the billing webhook; without a checkout we
    // continue to the broker step directly to verify per-step saving.
    await page.goto("/dashboard/client/onboarding/broker");
    await expect(page.getByRole("heading", { name: /broker account/i })).toBeVisible();

    await page.getByLabel("Broker Name *").fill("IC Markets");
    await page.getByLabel("MT5 Server *").fill("ICMarkets-Live01");
    await page.getByLabel("MT5 Account Number *").fill("1234567");
    await page.getByLabel("MT5 Password *").fill("broker-secret");
    await page.getByRole("button", { name: /save & continue/i }).click();

    // Prop step
    await page.waitForURL(/onboarding\/prop/);
    await page.getByLabel("Prop Firm Name *").fill("FTMO");
    await page.getByLabel("MT5 Server *").fill("FTMO-Server");
    await page.getByLabel("MT5 Account Number *").fill("7654321");
    await page.getByLabel("MT5 Password *").fill("prop-secret");
    await page.getByRole("button", { name: /save & continue/i }).click();

    // Review shows both steps saved with masked passwords
    await page.waitForURL(/onboarding\/review/);
    await expect(page.getByText("IC Markets")).toBeVisible();
    await expect(page.getByText("FTMO")).toBeVisible();
    await expect(page.getByText("broker-secret")).toHaveCount(0); // never plaintext (D1)

    // Wizard is resumable: revisiting the index goes back to the first
    // incomplete step (payment), not to the beginning
    await page.goto("/dashboard/client/onboarding");
    await page.waitForURL(/onboarding\/payment/);
  });

  test("referral attribution is visible on the /join landing page", async ({ page }) => {
    test.skip(!REF_CODE, "E2E_REF_CODE not configured");
    await page.goto(`/join?ref=${REF_CODE}`);
    await expect(page.getByText(/invited/i)).toBeVisible();
    await expect(page.getByText(REF_CODE!)).toBeVisible();
    await page.getByRole("button", { name: /create your account/i }).click();
    await page.waitForURL(new RegExp(`/register\\?ref=${REF_CODE}`));
  });
});

test.describe("provisioning status", () => {
  test("dashboard shows the service status card once payment completes", async ({ page }) => {
    test.skip(process.env.E2E_STRIPE !== "1", "Requires Stripe test mode (E2E_STRIPE=1)");

    // Assumes the account from the first test completed checkout; in a full
    // staging run the Stripe test card flow drives this (see checkout.spec).
    await page.goto("/dashboard/client");
    await expect(page.getByText(/service status/i)).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText(/setup in progress|active/i)).toBeVisible();
  });
});
