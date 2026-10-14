const { expect, test } = require("@playwright/test");

test("home page renders through the link edge", async ({ page }) => {
  await page.goto("./");

  await expect(page).toHaveTitle(/Dingocoin NFT Platform/i);
  await expect(
    page.getByRole("heading", { name: "Dingocoin NFT Platform" })
  ).toBeVisible();
  await expect(page.getByText("Hot collections")).toBeVisible();
  await expect(page.getByText("Dev Dingos")).toBeVisible();
});

test("explore and global search routes use the API proxy", async ({ page }) => {
  await page.goto("collections");
  await expect(
    page.getByRole("heading", { name: "Explore Collections" })
  ).toBeVisible();
  await expect(page.getByText("Dev Dingos")).toBeVisible();

  await page.goto("search?query=does-not-exist");
  await expect(page.getByRole("heading", { name: "Search 🔍" })).toBeVisible();
  await expect(page.getByText("No matching NFTs")).toBeVisible();

  await page.getByRole("tab", { name: "Collections" }).click();
  await expect(page.getByText("No matching collection")).toBeVisible();

  await page.getByRole("tab", { name: "Profiles" }).click();
  await expect(page.getByText("No matching profile")).toBeVisible();
});

test("create flow prompts when no browser wallet is installed", async ({ page }) => {
  await page.goto("create");
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "original.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("deterministic NFT fixture"),
  });

  const createButton = page.getByRole("button", { name: "Create NFT" });
  await expect(createButton).toBeEnabled();
  await createButton.click();
  await expect(
    page.getByRole("dialog").getByText("Browser Wallet required")
  ).toBeVisible();
});

test("deep links receive route-specific Open Graph metadata", async ({
  request,
}) => {
  const nft = "DdevNftAlpha1111111111111111111111";
  const response = await request.get(`nft/${nft}`);
  expect(response.ok()).toBeTruthy();

  const html = await response.text();
  expect(html).toContain('property="og:title" content="Alpha Dingo"');
  expect(html).toContain(
    `property="og:url" content="http://localhost:3020/testing-nft-platform/nft/${nft}"`
  );
  expect(html).toContain("dingo-nftc-0-preview");
  expect(html).not.toContain("%%_OG_");
});

test("unknown metadata routes fail without serving misleading previews", async ({
  request,
}) => {
  const response = await request.get("nft/does-not-exist");
  expect(response.status()).toBe(404);
  expect(await response.text()).toBe("Error: unknown path or asset");
});

test("Open Graph values from stored metadata are HTML-escaped", async ({
  request,
}) => {
  const response = await request.get("nft/DdevNftMarkup44444444444444444444");
  expect(response.ok()).toBeTruthy();

  const html = await response.text();
  expect(html).not.toContain("<script>window.__ogInjected");
  expect(html).not.toContain("<img src=x");
  expect(html).toContain(
    'property="og:title" content="Markup &quot;&gt;&lt;script&gt;window.__ogInjected=1&lt;/script&gt; $&amp;"'
  );
  expect(html).toContain(
    'property="og:description" content="&lt;img src=x onerror=alert(1)&gt; &amp; &#39;quotes&#39; | Dingocoin NFT Platform"'
  );
});

test("Open Graph values from route params are HTML-escaped", async ({
  request,
}) => {
  const address = '"><script>window.__ogInjected=1</script>';
  const response = await request.get(`profile/${encodeURIComponent(address)}`);
  expect(response.ok()).toBeTruthy();

  const html = await response.text();
  expect(html).not.toContain("<script>window.__ogInjected");
  expect(html).toContain(
    "<title>&quot;&gt;&lt;script&gt;window.__ogInjected=1&lt;/script&gt;</title>"
  );
});
