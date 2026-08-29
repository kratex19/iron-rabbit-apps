/**
 * Screenshot mode helper.
 *
 * When Iron Rabbit detects that the current visitor is likely a screenshot
 * bot (Emergent contest crawler, App-Store screenshot session, Googlebot,
 * OpenGraph scrapers, Playwright / headless Chrome, etc.), we automatically
 * suppress the onboarding chrome that would otherwise cover screenshots —
 * specifically:
 *
 *   • QuickGuide auto-open (the first-visit welcome carousel)
 *   • ThemeChooserModal auto-open (the "Choose your theme" modal)
 *   • FirstRunTour + InstallPrompt (any auto-appearing overlay)
 *
 * Detection is a union of three signals:
 *
 *   1. `?screenshot=1`, `?ss=1`, or `?listing=1` in the URL (manual opt-in
 *      for App-Store screenshot sessions and contest re-scrapes).
 *   2. `navigator.webdriver === true` — Playwright, Puppeteer, Selenium.
 *   3. A user-agent string matching common bots / headless browsers
 *      (Googlebot, Bingbot, Twitterbot, facebookexternalhit, LinkedInBot,
 *      Slackbot, Discordbot, WhatsApp, Telegram, HeadlessChrome, Emergent).
 *
 * Any positive signal returns true. All other app behaviour, colours,
 * layouts, and functionality remain identical.
 */

const CRAWLER_UA_RE = new RegExp(
  [
    "Googlebot",
    "Bingbot",
    "Slurp",              // Yahoo
    "DuckDuckBot",
    "Baiduspider",
    "YandexBot",
    "Twitterbot",
    "facebookexternalhit",
    "LinkedInBot",
    "Slackbot",
    "TelegramBot",
    "Discordbot",
    "WhatsApp",
    "Applebot",
    "PetalBot",
    "SkypeUriPreview",
    "Pinterestbot",
    "MetaInspector",
    "HeadlessChrome",
    "PhantomJS",
    "Puppeteer",
    "Playwright",
    "Selenium",
    "Chrome-Lighthouse",
    "Emergent",           // Emergent's own scrapers/screenshotters
    "Prerender",
  ].join("|"),
  "i"
);

export function isScreenshotMode() {
  if (typeof window === "undefined") return false;
  try {
    // 1. Query-param opt-in (App-Store screenshots, manual contest re-scrape URL)
    const p = new URLSearchParams(window.location.search);
    const v = (p.get("screenshot") || p.get("ss") || p.get("listing") || "").toLowerCase();
    if (v === "1" || v === "true" || v === "yes") return true;

    // 2. Automation-driver hint (Playwright / Puppeteer / Selenium set this)
    if (typeof navigator !== "undefined" && navigator.webdriver === true) return true;

    // 3. Known crawler / social-preview / headless UA strings
    const ua = (navigator && navigator.userAgent) || "";
    if (CRAWLER_UA_RE.test(ua)) return true;
  } catch (e) {
    return false;
  }
  return false;
}

