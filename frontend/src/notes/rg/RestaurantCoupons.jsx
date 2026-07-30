// Restaurants Galore — Coupons & Rewards workspace (expiration alerts).
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Ticket, Plus, Trash2, Edit3, Check, Clock, AlertCircle } from "lucide-react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RestaurantsService from "../../storage/restaurantsService";
import { Field, inputCls } from "./_shared";
import { haptic } from "../../utils/haptic";
import { PhotoAttachPanel } from "./PhotoAttachPanel";

// =========================================================================
// 5. COUPONS & REWARDS
// =========================================================================
export function RestaurantCouponsModal({ isOpen, onClose, isDark }) {
  const [restaurants, setRestaurants] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const [rs, cs] = await Promise.all([RestaurantsService.listRestaurants(), RestaurantsService.listCoupons()]);
    setRestaurants(rs); setCoupons(cs); setLoading(false);
  };
  useEffect(() => { if (isOpen) reload(); }, [isOpen]);

  const now = new Date();
  const enriched = coupons.map(c => {
    let daysLeft = null, state = "ok";
    if (c.used) state = "used";
    else if (c.expires_at) {
      try {
        daysLeft = differenceInCalendarDays(parseISO(c.expires_at), now);
        if (daysLeft < 0) state = "expired";
        else if (daysLeft <= 3) state = "critical";
        else if (daysLeft <= 7) state = "soon";
      } catch { /* ignore */ }
    }
    return { ...c, daysLeft, state };
  });

  const handleSave = async (payload) => {
    await RestaurantsService.saveCoupon(payload);
    reload();
    toast.success(payload.id ? "Coupon updated" : "Coupon saved");
    setEditing(null);
  };
  const handleDelete = async (id) => {
    await RestaurantsService.deleteCoupon(id);
    setCoupons(coupons.filter(c => c.id !== id));
    toast.success("Removed");
  };
  const toggleUsed = async (c) => {
    await RestaurantsService.saveCoupon({ ...c, used: !c.used, used_at: !c.used ? new Date().toISOString() : null });
    reload();
    haptic("tap");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-2xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="coupons-modal">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}><Ticket className="w-5 h-5 text-amber-400" /> Coupons & Rewards</DialogTitle>
            <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Every promo code, gift card, and reward — with expiration alerts.</DialogDescription>
          </DialogHeader>
          {loading ? <div className="py-10 text-center text-sm text-slate-400">Loading…</div> : (
            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <div className="flex-1" />
                <Button className="h-9 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setEditing({ restaurant_id: restaurants[0]?.id })} disabled={restaurants.length === 0} data-testid="coupons-add-btn">
                  <Plus className="w-4 h-4 mr-1" /> Add coupon
                </Button>
              </div>
              {enriched.length === 0 ? (
                <div className={`text-center py-10 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>No coupons yet.</div>
              ) : (
                <div className="space-y-1.5" data-testid="coupons-list">
                  {enriched.map(c => {
                    const r = restaurants.find(x => x.id === c.restaurant_id);
                    const badge = c.state === "expired" ? { cls: "bg-red-500/20 text-red-300 border-red-500/30", txt: `Expired ${Math.abs(c.daysLeft)}d ago` }
                      : c.state === "critical" ? { cls: "bg-orange-500/20 text-orange-300 border-orange-500/30", txt: c.daysLeft === 0 ? "Expires today" : `${c.daysLeft}d left` }
                      : c.state === "soon" ? { cls: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", txt: `${c.daysLeft}d left` }
                      : c.state === "used" ? { cls: "bg-slate-500/20 text-slate-400 border-slate-500/30", txt: "Used" }
                      : c.expires_at ? { cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", txt: `${c.daysLeft}d left` }
                      : null;
                    return (
                      <div key={c.id} className={`rounded-lg border p-2.5 ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"} ${c.used ? "opacity-60" : ""}`} data-testid={`coupon-row-${c.id}`}>
                        <div className="flex items-start gap-2">
                          <button type="button" onClick={() => toggleUsed(c)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${c.used ? "bg-emerald-500 border-emerald-500 text-white" : isDark ? "border-white/20 hover:border-emerald-500" : "border-gray-300 hover:border-emerald-500"}`}>{c.used && <Check className="w-3 h-3" />}</button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className={`text-sm font-mono font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{c.code || c.description || "—"}</div>
                              {badge && <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded border ${badge.cls}`}><Clock className="w-2.5 h-2.5" />{badge.txt}</span>}
                            </div>
                            {r && <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>@ {r.name}</div>}
                            <div className={`text-[11px] mt-0.5 ${isDark ? "text-slate-400" : "text-gray-600"}`}>{c.description}{c.discount ? ` · ${c.discount}` : ""}{c.loyalty_number ? ` · Loyalty: ${c.loyalty_number}` : ""}</div>
                          </div>
                          <button type="button" onClick={() => setEditing(c)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`} aria-label="Edit coupon" data-testid={`coupon-edit-${c.id}`}><Edit3 className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleDelete(c.id)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`} aria-label="Delete coupon" data-testid={`coupon-delete-${c.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {editing && <CouponEditor restaurants={restaurants} item={editing.id ? editing : null} defaultRestaurantId={editing.restaurant_id} isDark={isDark} onClose={() => setEditing(null)} onSave={handleSave} />}
    </>
  );
}

function CouponEditor({ restaurants, item, defaultRestaurantId, isDark, onClose, onSave }) {
  const isEdit = !!item;
  const [f, setF] = useState({
    id: item?.id, restaurant_id: item?.restaurant_id || defaultRestaurantId || "", code: item?.code || "",
    description: item?.description || "", discount: item?.discount || "",
    expires_at: item?.expires_at ? item.expires_at.slice(0, 10) : "",
    loyalty_number: item?.loyalty_number || "",
  });
  const set = (k, v) => setF({ ...f, [k]: v });
  const canSave = f.code.trim() || f.description.trim();
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={`max-w-md ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="coupon-editor">
        <DialogHeader><DialogTitle className={isDark ? "text-white" : "text-gray-900"}>{isEdit ? "Edit coupon" : "New coupon"}</DialogTitle><DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Never lose a promo code again.</DialogDescription></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (canSave) onSave({ ...f, expires_at: f.expires_at ? new Date(f.expires_at).toISOString() : null }); }} className="space-y-2">
          <Field label="Restaurant" isDark={isDark}>
            <select value={f.restaurant_id} onChange={(e) => set("restaurant_id", e.target.value)} className={`h-9 w-full rounded-md border px-2 text-sm ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
              <option value="">Any</option>{restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Code" isDark={isDark}><Input value={f.code} onChange={(e) => set("code", e.target.value)} placeholder="SAVE20" className={inputCls(isDark)} data-testid="coupon-code" /></Field>
            <Field label="Discount" isDark={isDark}><Input value={f.discount} onChange={(e) => set("discount", e.target.value)} placeholder="20% off" className={inputCls(isDark)} /></Field>
          </div>
          <Field label="Description" isDark={isDark}><Input value={f.description} onChange={(e) => set("description", e.target.value)} className={inputCls(isDark)} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Expires" isDark={isDark}><Input type="date" value={f.expires_at} onChange={(e) => set("expires_at", e.target.value)} className={inputCls(isDark)} data-testid="coupon-expires" /></Field>
            <Field label="Loyalty #" isDark={isDark}><Input value={f.loyalty_number} onChange={(e) => set("loyalty_number", e.target.value)} className={inputCls(isDark)} /></Field>
          </div>
          <PhotoAttachPanel
            isDark={isDark}
            restaurantId={f.restaurant_id}
            link={{ couponId: f.id }}
            label="Coupon photo"
            disabled={!f.id}
          />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={!canSave} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" data-testid="coupon-editor-save">{isEdit ? "Save" : "Add"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
