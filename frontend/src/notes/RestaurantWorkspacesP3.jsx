// Restaurants Galore™ — Phase 3 workspace modals.
//   • RestaurantReviewsModal     — 11-metric 5-star reviews
//   • RestaurantDeliveryModal    — delivery tracker
//   • RestaurantStaffModal       — favorite staff directory
//   • RestaurantWishlistModal    — restaurants I want to try
//   • RestaurantPhotosModal      — offline photo gallery

import React, { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";
import {
  Star, Truck, Users, ClipboardList, Camera, Plus, Trash2, Edit3,
  Check, X, Thermometer, Clock, Phone, Mail, Cake, Award, MapPin,
} from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RestaurantsService from "../storage/restaurantsService";
import { PhotoAttachPanel } from "./rg/PhotoAttachPanel";

// ------------ shared helpers ------------
const Field = ({ label, children, isDark }) => (
  <div>
    <label className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>{label}</label>
    <div className="mt-1">{children}</div>
  </div>
);
const inputCls = (isDark) => `h-9 ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500" : ""}`;
const selectCls = (isDark) => `h-9 w-full rounded-md border px-2 text-sm ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`;

function RestaurantPicker({ restaurants, value, onChange, isDark, includeAll = true, testid }) {
  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value)} className={selectCls(isDark)} data-testid={testid}>
      {includeAll && <option value="">All restaurants</option>}
      {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
    </select>
  );
}

// ------------ 5-star widget ------------
function StarRow({ label, value, onChange, isDark, testid }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-24 text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`}>{label}</div>
      <div className="flex gap-0.5" data-testid={testid}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n === value ? 0 : n)} className="p-0.5" data-testid={`${testid}-${n}`}>
            <Star className={`w-4 h-4 ${n <= value ? "text-amber-400 fill-current" : isDark ? "text-slate-600" : "text-gray-300"}`} />
          </button>
        ))}
      </div>
      <div className={`text-[10px] w-6 ${isDark ? "text-slate-500" : "text-gray-400"}`}>{value || "-"}</div>
    </div>
  );
}

// =========================================================================
// REVIEWS
// =========================================================================
const REVIEW_METRICS = [
  ["food", "Food"], ["service", "Service"], ["cleanliness", "Cleanliness"],
  ["atmosphere", "Atmosphere"], ["noise", "Noise"], ["portions", "Portions"],
  ["parking", "Parking"], ["value", "Value"], ["packaging", "Packaging"],
  ["accuracy", "Accuracy"], ["overall", "Overall"],
];

export function RestaurantReviewsModal({ isOpen, onClose, isDark }) {
  const [restaurants, setRestaurants] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [selectedR, setSelectedR] = useState("");
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const [rs, rv] = await Promise.all([RestaurantsService.listRestaurants(), RestaurantsService.listReviews()]);
    setRestaurants(rs); setReviews(rv); setLoading(false);
  };
  useEffect(() => { if (isOpen) reload(); }, [isOpen]);

  const filtered = useMemo(() => reviews.filter(r => !selectedR || r.restaurant_id === selectedR), [reviews, selectedR]);

  const handleSave = async (payload) => {
    await RestaurantsService.saveReview(payload);
    reload();
    toast.success(payload.id ? "Review updated" : "Review saved");
    setEditing(null);
  };
  const handleDelete = async (id) => {
    await RestaurantsService.deleteReview(id);
    setReviews(reviews.filter(r => r.id !== id));
    toast.success("Removed");
  };

  const avgOf = (ratings) => {
    const vals = Object.values(ratings || {}).filter(v => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-3xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="reviews-modal">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}><Star className="w-5 h-5 text-amber-400" /> Reviews</DialogTitle>
            <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Rate every dining experience across 11 dimensions.</DialogDescription>
          </DialogHeader>
          {loading ? <div className="py-10 text-center text-sm text-slate-400">Loading…</div> : (
            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <RestaurantPicker restaurants={restaurants} value={selectedR} onChange={setSelectedR} isDark={isDark} testid="reviews-restaurant-picker" />
                <div className="flex-1" />
                <Button className="h-9 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setEditing({ restaurant_id: selectedR || restaurants[0]?.id, ratings: {} })} disabled={restaurants.length === 0} data-testid="reviews-add-btn">
                  <Plus className="w-4 h-4 mr-1" /> New review
                </Button>
              </div>
              {filtered.length === 0 ? (
                <div className={`text-center py-10 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>No reviews logged yet.</div>
              ) : (
                <div className="space-y-1.5" data-testid="reviews-list">
                  {filtered.map(r => {
                    const rest = restaurants.find(x => x.id === r.restaurant_id);
                    const avg = avgOf(r.ratings);
                    return (
                      <div key={r.id} className={`rounded-lg border p-3 ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`} data-testid={`review-row-${r.id}`}>
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{rest?.name || "Unknown"}</div>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map(n => (
                                  <Star key={n} className={`w-3 h-3 ${n <= Math.round(avg) ? "text-amber-400 fill-current" : isDark ? "text-slate-600" : "text-gray-300"}`} />
                                ))}
                              </div>
                              <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>{avg.toFixed(1)}</div>
                            </div>
                            {r.comment && <div className={`text-[11px] mt-1 italic ${isDark ? "text-slate-400" : "text-gray-600"}`}>&ldquo;{r.comment}&rdquo;</div>}
                            <div className={`text-[10px] mt-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>{r.created_at ? format(new Date(r.created_at), "MMM d, yyyy") : ""}</div>
                          </div>
                          <button type="button" onClick={() => setEditing(r)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`} data-testid={`review-edit-${r.id}`}><Edit3 className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleDelete(r.id)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`} data-testid={`review-delete-${r.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
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
      {editing && <ReviewEditor restaurants={restaurants} item={editing.id ? editing : null} defaultRestaurantId={editing.restaurant_id} isDark={isDark} onClose={() => setEditing(null)} onSave={handleSave} />}
    </>
  );
}

function ReviewEditor({ restaurants, item, defaultRestaurantId, isDark, onClose, onSave }) {
  const isEdit = !!item;
  const [f, setF] = useState({
    id: item?.id, restaurant_id: item?.restaurant_id || defaultRestaurantId || "",
    ratings: { ...(item?.ratings || {}) },
    comment: item?.comment || "",
  });
  const setRating = (k, v) => setF({ ...f, ratings: { ...f.ratings, [k]: v } });
  const canSave = f.restaurant_id;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={`max-w-md max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="review-editor">
        <DialogHeader>
          <DialogTitle className={isDark ? "text-white" : "text-gray-900"}>{isEdit ? "Edit review" : "New review"}</DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Tap a star to rate, tap again to clear.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (canSave) onSave(f); }} className="space-y-3">
          <Field label="Restaurant*" isDark={isDark}>
            <select value={f.restaurant_id} onChange={(e) => setF({ ...f, restaurant_id: e.target.value })} className={selectCls(isDark)} data-testid="review-editor-restaurant">
              <option value="">— Select —</option>{restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <div className="space-y-1">
            {REVIEW_METRICS.map(([k, label]) => (
              <StarRow key={k} label={label} value={f.ratings[k] || 0} onChange={(v) => setRating(k, v)} isDark={isDark} testid={`stars-${k}`} />
            ))}
          </div>
          <Field label="Comment" isDark={isDark}>
            <Textarea value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} rows={3} className={isDark ? "bg-white/5 border-white/10 text-white" : ""} data-testid="review-comment" />
          </Field>
          <PhotoAttachPanel
            isDark={isDark}
            restaurantId={f.restaurant_id}
            link={{ reviewId: f.id }}
            label="Review photos"
            disabled={!f.id}
          />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={!canSave} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" data-testid="review-editor-save"><Check className="w-4 h-4 mr-1" /> {isEdit ? "Save" : "Save review"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================================
// DELIVERY TRACKER
// =========================================================================
export function RestaurantDeliveryModal({ isOpen, onClose, isDark }) {
  const [restaurants, setRestaurants] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const [rs, ds] = await Promise.all([RestaurantsService.listRestaurants(), RestaurantsService.listDeliveries()]);
    setRestaurants(rs); setDeliveries(ds); setLoading(false);
  };
  useEffect(() => { if (isOpen) reload(); }, [isOpen]);

  const handleSave = async (p) => { await RestaurantsService.saveDelivery(p); reload(); toast.success(p.id ? "Delivery updated" : "Delivery logged"); setEditing(null); };
  const handleDelete = async (id) => { await RestaurantsService.deleteDelivery(id); setDeliveries(deliveries.filter(d => d.id !== id)); toast.success("Removed"); };

  const stats = useMemo(() => {
    if (!deliveries.length) return null;
    const mins = deliveries.map(d => Number(d.minutes) || 0).filter(v => v > 0);
    const ratings = deliveries.map(d => Number(d.driver_rating) || 0).filter(v => v > 0);
    return {
      avgMin: mins.length ? mins.reduce((a, b) => a + b, 0) / mins.length : 0,
      avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
    };
  }, [deliveries]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-3xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="delivery-modal">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}><Truck className="w-5 h-5 text-amber-400" /> Delivery Tracker</DialogTitle>
            <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Track drivers, times, temps and packaging quality.</DialogDescription>
          </DialogHeader>
          {loading ? <div className="py-10 text-center text-sm text-slate-400">Loading…</div> : (
            <div className="space-y-3">
              {stats && (
                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded-lg border p-2 ${isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-200"}`}><div className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>Avg delivery</div><div className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{stats.avgMin.toFixed(0)} min</div></div>
                  <div className={`rounded-lg border p-2 ${isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-200"}`}><div className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>Avg driver ★</div><div className={`text-xl font-bold ${isDark ? "text-amber-300" : "text-amber-700"}`}>{stats.avgRating.toFixed(1)}</div></div>
                </div>
              )}
              <div className="flex justify-end">
                <Button className="h-9 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setEditing({ restaurant_id: restaurants[0]?.id })} disabled={restaurants.length === 0} data-testid="delivery-add-btn">
                  <Plus className="w-4 h-4 mr-1" /> Log delivery
                </Button>
              </div>
              {deliveries.length === 0 ? (
                <div className={`text-center py-10 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>No deliveries tracked yet.</div>
              ) : (
                <div className="space-y-1.5" data-testid="delivery-list">
                  {deliveries.map(d => {
                    const r = restaurants.find(x => x.id === d.restaurant_id);
                    const tempIcon = { hot: "🔥", warm: "😐", cold: "🥶" }[d.food_temp] || "";
                    return (
                      <div key={d.id} className={`rounded-lg border p-2.5 ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`} data-testid={`delivery-row-${d.id}`}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                              {r?.name || "Unknown"}
                              {d.driver_name && <span className={`text-[10px] font-normal ml-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}> · {d.driver_name}</span>}
                              {d.driver_phone && (
                                <a href={`tel:${d.driver_phone.replace(/\s+/g, "")}`} className={`text-[10px] ml-1 inline-flex items-center gap-0.5 hover:underline ${isDark ? "text-sky-400" : "text-sky-600"}`} data-testid={`delivery-dial-${d.id}`}>
                                  <Phone className="w-2.5 h-2.5" /> {d.driver_phone}
                                </a>
                              )}
                            </div>
                            <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                              {d.minutes ? `${d.minutes} min` : ""} {tempIcon} {d.packaging_quality ? `· pack ${d.packaging_quality}/5` : ""} {d.accuracy ? `· acc ${d.accuracy}/5` : ""}
                            </div>
                          </div>
                          <div className={`text-right shrink-0 mr-1`}>
                            {d.driver_rating > 0 && (
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map(n => <Star key={n} className={`w-3 h-3 ${n <= d.driver_rating ? "text-amber-400 fill-current" : isDark ? "text-slate-600" : "text-gray-300"}`} />)}
                              </div>
                            )}
                          </div>
                          <button type="button" onClick={() => setEditing(d)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`} data-testid={`delivery-edit-${d.id}`}><Edit3 className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleDelete(d.id)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`} data-testid={`delivery-delete-${d.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
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
      {editing && <DeliveryEditor restaurants={restaurants} item={editing.id ? editing : null} defaultRestaurantId={editing.restaurant_id} isDark={isDark} onClose={() => setEditing(null)} onSave={handleSave} />}
    </>
  );
}

function DeliveryEditor({ restaurants, item, defaultRestaurantId, isDark, onClose, onSave }) {
  const isEdit = !!item;
  const [f, setF] = useState({
    id: item?.id, restaurant_id: item?.restaurant_id || defaultRestaurantId || "", driver_name: item?.driver_name || "",
    driver_phone: item?.driver_phone || "",
    order_time: item?.order_time || "", delivery_time: item?.delivery_time || "",
    arrival_time: item?.arrival_time || "", minutes: item?.minutes ?? "",
    food_temp: item?.food_temp || "hot", packaging_quality: item?.packaging_quality ?? 0,
    accuracy: item?.accuracy ?? 0, driver_rating: item?.driver_rating ?? 0, notes: item?.notes || "",
  });
  const canSave = f.restaurant_id;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={`max-w-md max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="delivery-editor">
        <DialogHeader><DialogTitle className={isDark ? "text-white" : "text-gray-900"}>{isEdit ? "Edit delivery" : "New delivery"}</DialogTitle><DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Every detail that matters.</DialogDescription></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (canSave) onSave({ ...f, minutes: Number(f.minutes) || null, packaging_quality: Number(f.packaging_quality) || 0, accuracy: Number(f.accuracy) || 0, driver_rating: Number(f.driver_rating) || 0 }); }} className="space-y-2">
          <Field label="Restaurant*" isDark={isDark}>
            <select value={f.restaurant_id} onChange={(e) => setF({ ...f, restaurant_id: e.target.value })} className={selectCls(isDark)}>
              <option value="">— Select —</option>{restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <Field label="Driver name" isDark={isDark}><Input value={f.driver_name} onChange={(e) => setF({ ...f, driver_name: e.target.value })} className={inputCls(isDark)} data-testid="delivery-driver" /></Field>
          <Field label="Driver phone (for tap-to-call)" isDark={isDark}>
            <Input type="tel" value={f.driver_phone} onChange={(e) => setF({ ...f, driver_phone: e.target.value })} placeholder="+1 555 0100" className={inputCls(isDark)} data-testid="delivery-driver-phone" />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Order time" isDark={isDark}><Input type="time" value={f.order_time} onChange={(e) => setF({ ...f, order_time: e.target.value })} className={inputCls(isDark)} /></Field>
            <Field label="Arrival" isDark={isDark}><Input type="time" value={f.arrival_time} onChange={(e) => setF({ ...f, arrival_time: e.target.value })} className={inputCls(isDark)} /></Field>
            <Field label="Minutes" isDark={isDark}><Input type="number" min="0" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} className={inputCls(isDark)} data-testid="delivery-minutes" /></Field>
          </div>
          <Field label="Food temperature" isDark={isDark}>
            <select value={f.food_temp} onChange={(e) => setF({ ...f, food_temp: e.target.value })} className={selectCls(isDark)}>
              <option value="hot">Hot 🔥</option><option value="warm">Warm 😐</option><option value="cold">Cold 🥶</option>
            </select>
          </Field>
          <div className="space-y-1">
            <StarRow label="Packaging" value={f.packaging_quality} onChange={(v) => setF({ ...f, packaging_quality: v })} isDark={isDark} testid="delivery-packaging" />
            <StarRow label="Accuracy" value={f.accuracy} onChange={(v) => setF({ ...f, accuracy: v })} isDark={isDark} testid="delivery-accuracy" />
            <StarRow label="Driver" value={f.driver_rating} onChange={(v) => setF({ ...f, driver_rating: v })} isDark={isDark} testid="delivery-driver-rating" />
          </div>
          <Field label="Notes" isDark={isDark}><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} rows={2} className={isDark ? "bg-white/5 border-white/10 text-white" : ""} /></Field>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={!canSave} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" data-testid="delivery-editor-save">{isEdit ? "Save" : "Log delivery"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================================
// FAVORITE STAFF
// =========================================================================
export function RestaurantStaffModal({ isOpen, onClose, isDark }) {
  const [restaurants, setRestaurants] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selectedR, setSelectedR] = useState("");
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const [rs, sf] = await Promise.all([RestaurantsService.listRestaurants(), RestaurantsService.listStaff()]);
    setRestaurants(rs); setStaff(sf); setLoading(false);
  };
  useEffect(() => { if (isOpen) reload(); }, [isOpen]);

  const filtered = useMemo(() => staff.filter(s => !selectedR || s.restaurant_id === selectedR), [staff, selectedR]);
  const handleSave = async (p) => { await RestaurantsService.saveStaff(p); reload(); toast.success("Saved"); setEditing(null); };
  const handleDelete = async (id) => { await RestaurantsService.deleteStaff(id); setStaff(staff.filter(x => x.id !== id)); toast.success("Removed"); };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-3xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="staff-modal">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}><Users className="w-5 h-5 text-amber-400" /> Favorite Staff</DialogTitle>
            <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Remember the servers, hosts, and bartenders who make it special.</DialogDescription>
          </DialogHeader>
          {loading ? <div className="py-10 text-center text-sm text-slate-400">Loading…</div> : (
            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <RestaurantPicker restaurants={restaurants} value={selectedR} onChange={setSelectedR} isDark={isDark} testid="staff-restaurant-picker" />
                <div className="flex-1" />
                <Button className="h-9 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setEditing({ restaurant_id: selectedR || restaurants[0]?.id })} disabled={restaurants.length === 0} data-testid="staff-add-btn">
                  <Plus className="w-4 h-4 mr-1" /> Add person
                </Button>
              </div>
              {filtered.length === 0 ? (
                <div className={`text-center py-10 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>No staff saved yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5" data-testid="staff-list">
                  {filtered.map(s => {
                    const r = restaurants.find(x => x.id === s.restaurant_id);
                    return (
                      <div key={s.id} className={`rounded-lg border p-2.5 ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`} data-testid={`staff-row-${s.id}`}>
                        <div className="flex items-start gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isDark ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700"}`}>{s.name?.[0]?.toUpperCase() || "?"}</div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{s.name || "—"}{s.favorite ? <Award className="w-3 h-3 inline ml-1 text-amber-400" /> : null}</div>
                            <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>{s.role || "Staff"} · {r?.name}</div>
                            <div className={`text-[11px] mt-0.5 space-y-0.5 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                              {s.phone && <div><Phone className="w-2.5 h-2.5 inline mr-1" />{s.phone}</div>}
                              {s.email && <div><Mail className="w-2.5 h-2.5 inline mr-1" />{s.email}</div>}
                              {s.birthday && <div><Cake className="w-2.5 h-2.5 inline mr-1" />{s.birthday}</div>}
                              {s.notes && <div className="italic">{s.notes}</div>}
                            </div>
                          </div>
                          <button type="button" onClick={() => setEditing(s)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`} data-testid={`staff-edit-${s.id}`}><Edit3 className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleDelete(s.id)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`} data-testid={`staff-delete-${s.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
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
      {editing && <StaffEditor restaurants={restaurants} item={editing.id ? editing : null} defaultRestaurantId={editing.restaurant_id} isDark={isDark} onClose={() => setEditing(null)} onSave={handleSave} />}
    </>
  );
}

function StaffEditor({ restaurants, item, defaultRestaurantId, isDark, onClose, onSave }) {
  const isEdit = !!item;
  const [f, setF] = useState({
    id: item?.id, restaurant_id: item?.restaurant_id || defaultRestaurantId || "",
    name: item?.name || "", role: item?.role || "Server",
    phone: item?.phone || "", email: item?.email || "", birthday: item?.birthday || "",
    favorite: !!item?.favorite, notes: item?.notes || "",
  });
  const canSave = f.name.trim() && f.restaurant_id;
  const ROLES = ["Server", "Bartender", "Host", "Manager", "Chef", "Delivery driver", "Owner", "Other"];
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={`max-w-md ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="staff-editor">
        <DialogHeader><DialogTitle className={isDark ? "text-white" : "text-gray-900"}>{isEdit ? "Edit staff" : "New staff member"}</DialogTitle><DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Personal touches build loyalty.</DialogDescription></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (canSave) onSave(f); }} className="space-y-2">
          <Field label="Restaurant*" isDark={isDark}>
            <select value={f.restaurant_id} onChange={(e) => setF({ ...f, restaurant_id: e.target.value })} className={selectCls(isDark)}>
              <option value="">— Select —</option>{restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Name*" isDark={isDark}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls(isDark)} data-testid="staff-editor-name" autoFocus /></Field>
            <Field label="Role" isDark={isDark}>
              <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} className={selectCls(isDark)}>{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select>
            </Field>
            <Field label="Phone" isDark={isDark}><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={inputCls(isDark)} /></Field>
            <Field label="Email" isDark={isDark}><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={inputCls(isDark)} /></Field>
          </div>
          <Field label="Birthday (MM-DD)" isDark={isDark}><Input value={f.birthday} onChange={(e) => setF({ ...f, birthday: e.target.value })} placeholder="03-14" className={inputCls(isDark)} /></Field>
          <Field label="Notes" isDark={isDark}><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} rows={2} className={isDark ? "bg-white/5 border-white/10 text-white" : ""} /></Field>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={f.favorite} onChange={(e) => setF({ ...f, favorite: e.target.checked })} /><span className={`text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`}>Favorite staff member</span></label>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={!canSave} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" data-testid="staff-editor-save">{isEdit ? "Save" : "Add"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================================
// WISH LIST
// =========================================================================
const PRIORITY_LABEL = { 1: "🔥 Must try", 2: "⭐ High", 3: "🟢 Someday" };

export function RestaurantWishlistModal({ isOpen, onClose, isDark }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const reload = async () => { setLoading(true); setItems(await RestaurantsService.listWishlist()); setLoading(false); };
  useEffect(() => { if (isOpen) reload(); }, [isOpen]);

  const handleSave = async (p) => { await RestaurantsService.saveWishlistItem(p); reload(); toast.success("Saved"); setEditing(null); };
  const handleDelete = async (id) => { await RestaurantsService.deleteWishlistItem(id); setItems(items.filter(i => i.id !== id)); toast.success("Removed"); };
  const toggleVisited = async (w) => { await RestaurantsService.saveWishlistItem({ ...w, visited: !w.visited, visited_at: !w.visited ? new Date().toISOString() : null }); reload(); };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-2xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="wishlist-modal">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}><ClipboardList className="w-5 h-5 text-amber-400" /> Wish List</DialogTitle>
            <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Restaurants you want to try — organized by priority.</DialogDescription>
          </DialogHeader>
          {loading ? <div className="py-10 text-center text-sm text-slate-400">Loading…</div> : (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button className="h-9 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setEditing({})} data-testid="wishlist-add-btn">
                  <Plus className="w-4 h-4 mr-1" /> Add wish
                </Button>
              </div>
              {items.length === 0 ? (
                <div className={`text-center py-10 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>Wish list is empty.</div>
              ) : (
                <div className="space-y-1.5" data-testid="wishlist-list">
                  {items.map(w => (
                    <div key={w.id} className={`rounded-lg border p-2.5 ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"} ${w.visited ? "opacity-60" : ""}`} data-testid={`wishlist-row-${w.id}`}>
                      <div className="flex items-start gap-2">
                        <button type="button" onClick={() => toggleVisited(w)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 ${w.visited ? "bg-emerald-500 border-emerald-500 text-white" : isDark ? "border-white/20 hover:border-emerald-500" : "border-gray-300 hover:border-emerald-500"}`} data-testid={`wishlist-toggle-${w.id}`}>{w.visited && <Check className="w-3 h-3" />}</button>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"} ${w.visited ? "line-through" : ""}`}>{w.name}</div>
                          <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>{PRIORITY_LABEL[w.priority] || ""}{w.cuisine ? ` · ${w.cuisine}` : ""}{w.location ? ` · ${w.location}` : ""}</div>
                          {w.notes && <div className={`text-[11px] mt-0.5 italic ${isDark ? "text-slate-400" : "text-gray-600"}`}>{w.notes}</div>}
                        </div>
                        <button type="button" onClick={() => setEditing(w)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`} data-testid={`wishlist-edit-${w.id}`}><Edit3 className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => handleDelete(w.id)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`} data-testid={`wishlist-delete-${w.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {editing && <WishlistEditor item={editing.id ? editing : null} isDark={isDark} onClose={() => setEditing(null)} onSave={handleSave} />}
    </>
  );
}

function WishlistEditor({ item, isDark, onClose, onSave }) {
  const isEdit = !!item;
  const [f, setF] = useState({
    id: item?.id, name: item?.name || "", cuisine: item?.cuisine || "",
    location: item?.location || "", priority: item?.priority || 2, notes: item?.notes || "",
  });
  const canSave = f.name.trim();
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={`max-w-md ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="wishlist-editor">
        <DialogHeader><DialogTitle className={isDark ? "text-white" : "text-gray-900"}>{isEdit ? "Edit wish" : "New wish"}</DialogTitle><DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Somewhere you want to eat.</DialogDescription></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (canSave) onSave({ ...f, priority: Number(f.priority) }); }} className="space-y-2">
          <Field label="Restaurant*" isDark={isDark}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls(isDark)} data-testid="wishlist-editor-name" autoFocus /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Cuisine" isDark={isDark}><Input value={f.cuisine} onChange={(e) => setF({ ...f, cuisine: e.target.value })} className={inputCls(isDark)} /></Field>
            <Field label="Location" isDark={isDark}><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Neighborhood, city…" className={inputCls(isDark)} /></Field>
          </div>
          <Field label="Priority" isDark={isDark}>
            <select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} className={selectCls(isDark)}>
              <option value={1}>🔥 Must try</option><option value={2}>⭐ High</option><option value={3}>🟢 Someday</option>
            </select>
          </Field>
          <Field label="Notes" isDark={isDark}><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} rows={2} className={isDark ? "bg-white/5 border-white/10 text-white" : ""} /></Field>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={!canSave} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" data-testid="wishlist-editor-save">{isEdit ? "Save" : "Add"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================================
// PHOTOS
// =========================================================================
export function RestaurantPhotosModal({ isOpen, onClose, isDark }) {
  const [restaurants, setRestaurants] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [selectedR, setSelectedR] = useState("");
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [pendingR, setPendingR] = useState("");
  const fileRef = useRef(null);

  const reload = async () => {
    setLoading(true);
    const [rs, ps] = await Promise.all([RestaurantsService.listRestaurants(), RestaurantsService.listPhotos()]);
    setRestaurants(rs); setPhotos(ps); setLoading(false);
  };
  useEffect(() => { if (isOpen) reload(); }, [isOpen]);

  const filtered = useMemo(() => photos.filter(p => !selectedR || p.restaurant_id === selectedR), [photos, selectedR]);

  const handleFile = async (file) => {
    if (!file) return;
    // Resize on client side to keep IndexedDB fast — target max 1200px longest side
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (ev) => {
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        await RestaurantsService.savePhoto({
          restaurant_id: pendingR || selectedR || restaurants[0]?.id || "",
          data_url: dataUrl,
          caption,
          taken_at: new Date().toISOString(),
        });
        setCaption(""); setPendingR("");
        reload();
        toast.success("Photo saved");
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id) => {
    await RestaurantsService.deletePhoto(id);
    setPhotos(photos.filter(p => p.id !== id));
    setPreview(null);
    toast.success("Deleted");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-3xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="photos-modal">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}><Camera className="w-5 h-5 text-amber-400" /> Photos</DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Every dish, receipt, and menu — stored offline in your device.</DialogDescription>
        </DialogHeader>
        {loading ? <div className="py-10 text-center text-sm text-slate-400">Loading…</div> : (
          <div className="space-y-3">
            <div className="flex gap-2 items-center flex-wrap">
              <RestaurantPicker restaurants={restaurants} value={selectedR} onChange={setSelectedR} isDark={isDark} testid="photos-restaurant-picker" />
              <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (optional)" className={inputCls(isDark) + " flex-1 min-w-[150px]"} data-testid="photos-caption" />
              <select value={pendingR} onChange={(e) => setPendingR(e.target.value)} className={selectCls(isDark) + " w-auto"} data-testid="photos-assign-restaurant">
                <option value="">Assign to…</option>
                {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={(e) => handleFile(e.target.files?.[0])} className="hidden" data-testid="photos-file-input" />
              <Button className="h-9 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => fileRef.current?.click()} disabled={restaurants.length === 0} data-testid="photos-add-btn">
                <Plus className="w-4 h-4 mr-1" /> Add photo
              </Button>
            </div>

            {filtered.length === 0 ? (
              <div className={`text-center py-16 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                <Camera className={`w-10 h-10 mx-auto mb-2 ${isDark ? "text-slate-600" : "text-gray-300"}`} />
                No photos yet. Add one to start your gallery.
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2" data-testid="photos-grid">
                {filtered.map(p => {
                  const r = restaurants.find(x => x.id === p.restaurant_id);
                  return (
                    <button key={p.id} type="button" onClick={() => setPreview(p)} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group" data-testid={`photo-tile-${p.id}`}>
                      <img src={p.data_url} alt={p.caption || "Restaurant photo"} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                        <div className="text-[9px] text-white truncate">{r?.name}{p.caption ? ` · ${p.caption}` : ""}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {preview && (
              <Dialog open onOpenChange={() => setPreview(null)}>
                <DialogContent className={`max-w-3xl ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="photo-preview">
                  <DialogHeader>
                    <DialogTitle className={isDark ? "text-white" : "text-gray-900"}>{restaurants.find(x => x.id === preview.restaurant_id)?.name || "Photo"}</DialogTitle>
                    {preview.caption && <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>{preview.caption}</DialogDescription>}
                  </DialogHeader>
                  <img src={preview.data_url} alt={preview.caption || ""} className="w-full rounded-lg" />
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={() => handleDelete(preview.id)} className="text-red-500 hover:text-red-600" data-testid="photo-preview-delete"><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
