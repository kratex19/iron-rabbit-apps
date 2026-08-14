/**
 * Screenshot mode helper.
 *
 * When Iron Rabbit is opened with `?screenshot=1` (or `?ss=1`) in the URL,
 * we automatically suppress the onboarding chrome that would otherwise
 * cover screenshots taken for the App Store / Play Store — specifically:
 *
 *   • QuickGuide auto-open (the first-visit welcome carousel)
 *   • ThemeChooserModal auto-open (the "Choose your theme" modal)
 *
 * The flag has no other side-effects. All other app behaviour, colours,
 * layouts, and functionality remain identical.
 *
 * Usage:
 *   isScreenshotMode()  →  true when either query param is present with a
 *                          truthy value ("1", "true", "yes").
 */
export function isScreenshotMode() {
  if (typeof window === "undefined") return false;
  try {
    const p = new URLSearchParams(window.location.search);
    const v = (p.get("screenshot") || p.get("ss") || "").toLowerCase();
    return v === "1" || v === "true" || v === "yes";
  } catch (e) {
    return false;
  }
}
