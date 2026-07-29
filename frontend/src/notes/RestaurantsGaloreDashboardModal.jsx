import React, { useEffect, useState } from "react";
import {
  Utensils, Store, Heart, DollarSign, Star, Ticket, Cake, Clock,
  ChefHat, Menu as MenuIcon, Receipt, Truck, Users, Camera,
  Mic, MessageCircle, ClipboardList, Coffee, Cookie, Search,
  AlertCircle, TrendingUp, Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import RestaurantsService from "../storage/restaurantsService";

/**
 * Restaurants Galore™ — Command Center Dashboard.
 *
 * Aggregates every KPI across restaurants, orders, reviews, coupons, birthdays
 * and exposes launcher buttons for each workspace tile. Phase-1 wires only the
 * Restaurant Directory; the rest of the launcher buttons are stubbed with a
 * "Coming in Phase N" tooltip so future work has a clear surface to slot into.
 */
export default function RestaurantsGaloreDashboardModal({
  isOpen, onClose, isDark, onOpenDirectory,
}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      const s = await RestaurantsService.computeDashboardStats();
      setStats(s);
      setLoading(false);
    })();
  }, [isOpen]);

  const kpiCard = (label, value, sub, color = "text-white") => (
    <div className={`rounded-xl p-3 border ${isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-white shadow-sm"}`}>
      <div className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>{label}</div>
      <div className={`text-2xl font-bold ${isDark ? color : "text-gray-900"}`}>{value}</div>
      {sub && <div className={`text-[11px] mt-0.5 ${isDark ? "text-slate-500" : "text-gray-500"}`}>{sub}</div>}
    </div>
  );

  const launcher = (icon, label, onClick, disabled = false, testid) => {
    const Icon = icon;
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`p-3 rounded-xl border text-left transition-all ${
          disabled
            ? isDark ? "border-white/5 bg-white/[0.01] text-slate-600 cursor-not-allowed" : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
            : isDark ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 text-white" : "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-900"
        }`}
        data-testid={testid}
        title={disabled ? "Coming in a future phase" : label}
      >
        <Icon className="w-5 h-5 mb-1.5 text-amber-400" />
        <div className="text-xs font-medium">{label}</div>
        {disabled && <div className={`text-[9px] mt-0.5 ${isDark ? "text-slate-600" : "text-gray-400"}`}>Coming soon</div>}
      </button>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-4xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`}
        data-testid="restaurants-galore-modal"
      >
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <Utensils className="w-5 h-5 text-amber-400" />
            Restaurants Galore
            <span className="text-[10px] font-normal uppercase tracking-widest text-amber-400/70 ml-1">™</span>
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            Your complete dining companion — organized, remembered, elegant. 100% offline.
          </DialogDescription>
        </DialogHeader>

        {loading || !stats ? (
          <div className={`py-16 text-center text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Loading…</div>
        ) : (
          <div className="space-y-3">
            {/* KPI row 1 — money */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {kpiCard("This month", `$${stats.monthly_spend.toFixed(2)}`, `${stats.total_orders} orders total`, "text-emerald-400")}
              {kpiCard("This year", `$${stats.yearly_spend.toFixed(2)}`, "across all restaurants", "text-emerald-400")}
              {kpiCard("Avg meal price", `$${stats.avg_meal_price.toFixed(2)}`, "lifetime average", "text-white")}
              {kpiCard("Restaurants", stats.total_restaurants, `${stats.total_favorites} favorites`, "text-white")}
            </div>

            {/* KPI row 2 — reminders */}
            {(stats.needs_review.length > 0 || stats.expiring_coupons.length > 0 || stats.upcoming_birthdays.length > 0) && (
              <div className={`rounded-xl p-3 border ${isDark ? "border-amber-500/20 bg-amber-500/[0.03]" : "border-amber-200 bg-amber-50"}`} data-testid="galore-reminders">
                <div className={`flex items-center gap-1.5 mb-2 text-sm font-semibold ${isDark ? "text-amber-300" : "text-amber-800"}`}>
                  <AlertCircle className="w-4 h-4" /> Smart reminders
                </div>
                <div className="space-y-1.5">
                  {stats.needs_review.length > 0 && (
                    <div className={`text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      <Star className="w-3 h-3 inline mr-1 text-amber-400" />
                      <b>{stats.needs_review.length}</b> restaurants need reviews: <span className="italic">{stats.needs_review.map(r => r.name).join(", ")}</span>
                    </div>
                  )}
                  {stats.expiring_coupons.length > 0 && (
                    <div className={`text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      <Ticket className="w-3 h-3 inline mr-1 text-fuchsia-400" />
                      <b>{stats.expiring_coupons.length}</b> coupons expire soon
                    </div>
                  )}
                  {stats.upcoming_birthdays.map((b, i) => (
                    <div key={i} className={`text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      <Cake className="w-3 h-3 inline mr-1 text-pink-400" />
                      <b>{b.name}</b>&apos;s birthday in {b.days}d — consider <i>{b.restaurant}</i>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent + Favorites */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className={`rounded-xl p-3 border ${isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-white shadow-sm"}`}>
                <div className={`flex items-center gap-1.5 mb-2 text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  <Clock className="w-4 h-4 text-sky-400" /> Recently visited
                </div>
                {stats.recent_visits.length === 0 ? (
                  <div className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>Log an order to see recent visits here.</div>
                ) : (
                  <div className="space-y-1">
                    {stats.recent_visits.map((r, i) => (
                      <div key={i} className={`text-xs truncate ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                        {r.favorite && <Heart className="w-2.5 h-2.5 inline mr-1 text-pink-400 fill-current" />}
                        {r.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className={`rounded-xl p-3 border ${isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-white shadow-sm"}`}>
                <div className={`flex items-center gap-1.5 mb-2 text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  <Heart className="w-4 h-4 text-pink-400 fill-current" /> Favorites
                </div>
                {stats.favorites.length === 0 ? (
                  <div className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>Star restaurants you love to see them here.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-1">
                    {stats.favorites.map((r, i) => (
                      <div key={i} className={`text-xs truncate ${isDark ? "text-slate-300" : "text-gray-700"}`}>{r.name}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Workspace tile launcher grid */}
            <div>
              <div className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                Workspaces
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {launcher(Store, "Directory", onOpenDirectory, false, "launcher-directory")}
                {launcher(MenuIcon, "Menus", () => {}, true, "launcher-menus")}
                {launcher(ChefHat, "Favorite meals", () => {}, true, "launcher-favmeals")}
                {launcher(Receipt, "Order history", () => {}, true, "launcher-orders")}
                {launcher(Star, "Reviews", () => {}, true, "launcher-reviews")}
                {launcher(Truck, "Delivery", () => {}, true, "launcher-delivery")}
                {launcher(TrendingUp, "Spending", () => {}, true, "launcher-spending")}
                {launcher(Ticket, "Coupons", () => {}, true, "launcher-coupons")}
                {launcher(Camera, "Photos", () => {}, true, "launcher-photos")}
                {launcher(Mic, "Voice journal", () => {}, true, "launcher-voice")}
                {launcher(Sparkles, "Smart assistant", () => {}, true, "launcher-assistant")}
                {launcher(Users, "Favorite staff", () => {}, true, "launcher-staff")}
                {launcher(ClipboardList, "Wish list", () => {}, true, "launcher-wishlist")}
                {launcher(Coffee, "Beverages", () => {}, true, "launcher-beverages")}
                {launcher(Cookie, "Desserts", () => {}, true, "launcher-desserts")}
                {launcher(Search, "Search all", () => {}, true, "launcher-search")}
                {launcher(MessageCircle, "AI insights", () => {}, true, "launcher-ai")}
                {launcher(DollarSign, "Tip calc", () => {}, true, "launcher-tip")}
              </div>
              <div className={`text-[10px] mt-2 ${isDark ? "text-slate-600" : "text-gray-400"}`}>
                <b>{stats.total_restaurants}</b> restaurants · <b>{stats.total_orders}</b> orders · <b>{stats.total_reviews}</b> reviews stored offline
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
