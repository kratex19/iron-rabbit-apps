// Auto-offer of the Restaurants Galore Year Wrap on the first cold-start
// of a new calendar year. Silent no-op the rest of the year, and after the
// user has already been shown the offer for that year.
//
// Fires a toast with a "View wrap" action that broadcasts an event
// `rg:open-year-wrap` with `{ year }` — NotesApp listens and opens the
// modal.
import { toast } from "sonner";
import restaurantsService from "../storage/restaurantsService";

const SHOWN_KEY = "iron_rabbit_rg_year_wrap_shown_v1";

export async function maybeOfferYearWrap() {
  try {
    const now = new Date();
    const wrapYear = now.getFullYear() - 1;

    // Already offered this wrap year? Skip.
    let shown = {};
    try {
      const raw = localStorage.getItem(SHOWN_KEY);
      shown = raw ? JSON.parse(raw) || {} : {};
    } catch { /* private mode */ }
    if (shown[String(wrapYear)]) return;

    // Any orders from last year? If not, there's nothing to wrap.
    const orders = await restaurantsService.listOrders().catch(() => []);
    const yStart = new Date(wrapYear, 0, 1).getTime();
    const yEnd = new Date(wrapYear + 1, 0, 1).getTime();
    const hadYear = (orders || []).some((o) => {
      const t = new Date(o.date || o.created_at || 0).getTime();
      return t >= yStart && t < yEnd;
    });
    if (!hadYear) return;

    toast(`🎁 Your ${wrapYear} Year Wrap is ready`, {
      description: "Six slides — spend, top spots, longest streak, freezes, and more.",
      duration: 10000,
      action: {
        label: "View wrap",
        onClick: () => {
          window.dispatchEvent(new CustomEvent("rg:open-year-wrap", { detail: { year: wrapYear } }));
        },
      },
    });

    // Remember we offered it — we still allow manual re-opens from the
    // dashboard, but no more auto-toasts for this year.
    shown[String(wrapYear)] = { offered_at: new Date().toISOString() };
    try { localStorage.setItem(SHOWN_KEY, JSON.stringify(shown)); } catch { /* noop */ }
  } catch (err) {
    console.warn("Year wrap offer error:", err);
  }
}
