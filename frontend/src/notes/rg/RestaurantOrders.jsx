// Restaurants Galore — Order History workspace (line items, tips, split-bill).
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Receipt, Plus, Trash2, Edit3, DollarSign, Percent, Users, Calculator, X, Camera } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RestaurantsService from "../../storage/restaurantsService";
import { Field, inputCls, cardCls, RestaurantPicker } from "./_shared";
import { haptic } from "../../utils/haptic";

// =========================================================================
// 3. ORDER HISTORY + TIP CALCULATOR + SPLIT BILL
// =========================================================================
export function RestaurantOrdersModal({ isOpen, onClose, isDark }) {
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedR, setSelectedR] = useState("");
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const [rs, os] = await Promise.all([RestaurantsService.listRestaurants(), RestaurantsService.listOrders()]);
    setRestaurants(rs); setOrders(os); setLoading(false);
  };
  useEffect(() => { if (isOpen) reload(); }, [isOpen]);

  const filtered = useMemo(() => orders.filter(o => !selectedR || o.restaurant_id === selectedR), [orders, selectedR]);

  const handleSave = async (payload) => {
    await RestaurantsService.saveOrder(payload);
    reload();
    toast.success(payload.id ? "Order updated" : "Order logged");
    setEditing(null);
  };
  const handleDelete = async (id) => {
    await RestaurantsService.deleteOrder(id);
    setOrders(orders.filter(o => o.id !== id));
    toast.success("Removed");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-3xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="orders-modal">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}><Receipt className="w-5 h-5 text-amber-400" /> Order History</DialogTitle>
            <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Every meal, every dollar, forever. Tip calc + split bill built in.</DialogDescription>
          </DialogHeader>
          {loading ? <div className="py-10 text-center text-sm text-slate-400">Loading…</div> : (
            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <RestaurantPicker restaurants={restaurants} value={selectedR} onChange={setSelectedR} isDark={isDark} testid="orders-restaurant-picker" />
                <div className="flex-1" />
                <Button className="h-9 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setEditing({ restaurant_id: selectedR || restaurants[0]?.id })} disabled={restaurants.length === 0} data-testid="orders-add-btn">
                  <Plus className="w-4 h-4 mr-1" /> Log order
                </Button>
              </div>
              {filtered.length === 0 ? (
                <div className={`text-center py-10 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>No orders logged.</div>
              ) : (
                <div className="space-y-1.5" data-testid="orders-list">
                  {filtered.map(o => {
                    const r = restaurants.find(x => x.id === o.restaurant_id);
                    return (
                      <div key={o.id} className={`rounded-lg border p-2.5 ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`} data-testid={`order-row-${o.id}`}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                              {r?.name || "Unknown"}
                              <span className={`ml-2 text-[10px] font-normal ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                                {o.date ? format(new Date(o.date), "MMM d, yyyy") : "—"}{o.time ? ` · ${o.time}` : ""}
                              </span>
                            </div>
                            <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                              {(o.items || []).length} items{o.payment_method ? ` · ${o.payment_method}` : ""}{o.who_paid ? ` · ${o.who_paid} paid` : ""}
                            </div>
                          </div>
                          <div className={`text-right shrink-0 mr-2`}>
                            <div className={`text-base font-mono font-semibold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>${Number(o.total || 0).toFixed(2)}</div>
                            {o.tip > 0 && <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>tip ${Number(o.tip).toFixed(2)}</div>}
                          </div>
                          <button type="button" onClick={() => setEditing(o)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}><Edit3 className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleDelete(o.id)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}><Trash2 className="w-3.5 h-3.5" /></button>
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
      {editing && <OrderEditor restaurants={restaurants} item={editing.id ? editing : null} defaultRestaurantId={editing.restaurant_id} isDark={isDark} onClose={() => setEditing(null)} onSave={handleSave} />}
    </>
  );
}

function OrderEditor({ restaurants, item, defaultRestaurantId, isDark, onClose, onSave }) {
  const isEdit = !!item;
  const fileInputRef = React.useRef(null);
  const [attachedPhotos, setAttachedPhotos] = useState([]);
  const [f, setF] = useState({
    id: item?.id, restaurant_id: item?.restaurant_id || defaultRestaurantId || "",
    date: item?.date ? item.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    time: item?.time || "", order_number: item?.order_number || "",
    subtotal: item?.subtotal ?? "", tax: item?.tax ?? "", tip: item?.tip ?? "",
    delivery_fee: item?.delivery_fee ?? "", discount: item?.discount ?? "",
    total: item?.total ?? "", who_paid: item?.who_paid || "",
    payment_method: item?.payment_method || "", notes: item?.notes || "",
    items: item?.items?.length ? [...item.items] : [{ name: "", qty: 1, price: "" }],
    split_bill: item?.split_bill?.length ? [...item.split_bill] : [],
    tip_pct: "",
    split_count: item?.split_bill?.length || 1,
  });
  const set = (k, v) => setF({ ...f, [k]: v });
  const setItem = (i, k, v) => setF({ ...f, items: f.items.map((it, ix) => ix === i ? { ...it, [k]: v } : it) });
  const addItem = () => setF({ ...f, items: [...f.items, { name: "", qty: 1, price: "" }] });
  const rmItem = (i) => setF({ ...f, items: f.items.filter((_, ix) => ix !== i) });

  // Auto-calc subtotal from items
  const computedSubtotal = f.items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 1), 0);
  const effectiveSubtotal = Number(f.subtotal) || computedSubtotal;
  const total = effectiveSubtotal + (Number(f.tax) || 0) + (Number(f.tip) || 0) + (Number(f.delivery_fee) || 0) - (Number(f.discount) || 0);

  // Tip calculator helpers
  const applyTipPct = (pct) => {
    const tip = Number((effectiveSubtotal * pct / 100).toFixed(2));
    setF({ ...f, tip });
  };
  const roundUp = () => setF({ ...f, tip: Math.ceil(total) - (total - (Number(f.tip) || 0)) });
  const roundDown = () => setF({ ...f, tip: Math.max(0, Math.floor(total) - (total - (Number(f.tip) || 0))) });

  // Split-bill preview
  const splitCount = Math.max(1, Number(f.split_count) || 1);
  const perPerson = total / splitCount;

  // Load attached photos when editing existing order
  React.useEffect(() => {
    if (!item?.id) return;
    (async () => {
      const list = await RestaurantsService.listPhotos({ orderId: item.id });
      setAttachedPhotos(list);
    })();
  }, [item?.id]);

  const handleAttachPhoto = async (file) => {
    if (!file) return;
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (ev) => {
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        const data_url = canvas.toDataURL("image/jpeg", 0.85);
        const saved = await RestaurantsService.savePhoto({
          restaurant_id: f.restaurant_id,
          order_id: item?.id || null,
          data_url,
          caption: "Order photo",
          taken_at: new Date().toISOString(),
        });
        setAttachedPhotos([saved, ...attachedPhotos]);
        toast.success("Photo attached");
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async (id) => {
    await RestaurantsService.deletePhoto(id);
    setAttachedPhotos(attachedPhotos.filter(p => p.id !== id));
  };

  const canSave = f.restaurant_id;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={`max-w-lg max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="order-editor">
        <DialogHeader>
          <DialogTitle className={isDark ? "text-white" : "text-gray-900"}>{isEdit ? "Edit order" : "Log a new order"}</DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Tip calculator + split bill included.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (canSave) onSave({ ...f, subtotal: Number(effectiveSubtotal.toFixed(2)), total: Number(total.toFixed(2)), split_bill: splitCount > 1 ? Array.from({ length: splitCount }, (_, i) => ({ label: `Person ${i+1}`, amount: Number(perPerson.toFixed(2)) })) : [] }); }} className="space-y-2">
          <Field label="Restaurant*" isDark={isDark}>
            <select value={f.restaurant_id} onChange={(e) => set("restaurant_id", e.target.value)} className={`h-9 w-full rounded-md border px-2 text-sm ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
              <option value="">— Select —</option>{restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Date" isDark={isDark}><Input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className={inputCls(isDark)} /></Field>
            <Field label="Time" isDark={isDark}><Input type="time" value={f.time} onChange={(e) => set("time", e.target.value)} className={inputCls(isDark)} /></Field>
            <Field label="Order #" isDark={isDark}><Input value={f.order_number} onChange={(e) => set("order_number", e.target.value)} className={inputCls(isDark)} /></Field>
          </div>

          <Field label="Items" isDark={isDark}>
            <div className="space-y-1.5">
              {f.items.map((it, i) => (
                <div key={i} className="flex gap-1.5">
                  <Input value={it.name} onChange={(e) => setItem(i, "name", e.target.value)} placeholder="Item" className={inputCls(isDark) + " flex-1"} data-testid={`order-item-name-${i}`} />
                  <Input type="number" min="1" value={it.qty} onChange={(e) => setItem(i, "qty", e.target.value)} className={inputCls(isDark) + " w-14"} data-testid={`order-item-qty-${i}`} />
                  <Input type="number" step="0.01" value={it.price} onChange={(e) => setItem(i, "price", e.target.value)} placeholder="$" className={inputCls(isDark) + " w-20"} data-testid={`order-item-price-${i}`} />
                  {f.items.length > 1 && <button type="button" onClick={() => rmItem(i)} className={`w-8 h-9 rounded flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}><X className="w-3.5 h-3.5" /></button>}
                </div>
              ))}
              <button type="button" onClick={addItem} className={`text-[11px] ${isDark ? "text-slate-400 hover:text-white" : "text-gray-500 hover:text-gray-800"}`}>+ Add item</button>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label={`Subtotal (auto: $${computedSubtotal.toFixed(2)})`} isDark={isDark}><Input type="number" step="0.01" value={f.subtotal} onChange={(e) => set("subtotal", e.target.value)} placeholder={computedSubtotal.toFixed(2)} className={inputCls(isDark)} /></Field>
            <Field label="Tax" isDark={isDark}><Input type="number" step="0.01" value={f.tax} onChange={(e) => set("tax", e.target.value)} className={inputCls(isDark)} /></Field>
            <Field label="Delivery fee" isDark={isDark}><Input type="number" step="0.01" value={f.delivery_fee} onChange={(e) => set("delivery_fee", e.target.value)} className={inputCls(isDark)} /></Field>
            <Field label="Discount" isDark={isDark}><Input type="number" step="0.01" value={f.discount} onChange={(e) => set("discount", e.target.value)} className={inputCls(isDark)} /></Field>
          </div>

          {/* Tip calculator */}
          <div className={`rounded-lg p-2 border ${isDark ? "border-amber-500/20 bg-amber-500/[0.03]" : "border-amber-200 bg-amber-50"}`}>
            <div className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${isDark ? "text-amber-300" : "text-amber-800"}`}>
              <Calculator className="w-3 h-3 inline mr-1" /> Tip calculator
            </div>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {[10, 15, 18, 20, 25].map(p => (
                <button key={p} type="button" onClick={() => applyTipPct(p)} className={`text-[11px] px-2 py-0.5 rounded-md border ${isDark ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}`} data-testid={`tip-btn-${p}`}>{p}%</button>
              ))}
              <button type="button" onClick={roundUp} className={`text-[11px] px-2 py-0.5 rounded-md border ${isDark ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}`}>Round up</button>
              <button type="button" onClick={roundDown} className={`text-[11px] px-2 py-0.5 rounded-md border ${isDark ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}`}>Round down</button>
              <Input type="number" step="0.01" value={f.tip} onChange={(e) => set("tip", e.target.value)} placeholder="Tip $" className={inputCls(isDark) + " w-20 ml-auto h-7 text-xs"} data-testid="tip-amount" />
            </div>
          </div>

          {/* Split bill */}
          <div className={`rounded-lg p-2 border ${isDark ? "border-white/10 bg-white/[0.02]" : "border-gray-200 bg-white"}`}>
            <div className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              <Users className="w-3 h-3 inline mr-1" /> Split bill
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className={isDark ? "text-slate-300" : "text-gray-700"}>Divide by</span>
              <Input type="number" min="1" value={f.split_count} onChange={(e) => set("split_count", e.target.value)} className={inputCls(isDark) + " w-14 h-7"} data-testid="split-count" />
              <span className={isDark ? "text-slate-300" : "text-gray-700"}>=</span>
              <span className={`font-mono font-semibold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>${perPerson.toFixed(2)}/person</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Who paid" isDark={isDark}><Input value={f.who_paid} onChange={(e) => set("who_paid", e.target.value)} className={inputCls(isDark)} /></Field>
            <Field label="Payment method" isDark={isDark}><Input value={f.payment_method} onChange={(e) => set("payment_method", e.target.value)} className={inputCls(isDark)} /></Field>
          </div>
          <Field label="Notes" isDark={isDark}><Textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={isDark ? "bg-white/5 border-white/10 text-white" : ""} /></Field>

          {/* Photos */}
          {isEdit && (
            <div className={`rounded-lg p-2 border ${isDark ? "border-white/10 bg-white/[0.02]" : "border-gray-200 bg-white"}`}>
              <div className={`flex items-center justify-between mb-2`}>
                <div className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  <Camera className="w-3 h-3 inline mr-1" /> Photos ({attachedPhotos.length})
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => handleAttachPhoto(e.target.files?.[0])} className="hidden" data-testid="order-photo-input" />
                <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="h-7 text-xs" data-testid="order-attach-photo">
                  <Plus className="w-3 h-3 mr-1" /> Attach
                </Button>
              </div>
              {attachedPhotos.length > 0 && (
                <div className="flex flex-wrap gap-1.5" data-testid="order-photos-grid">
                  {attachedPhotos.map(p => (
                    <div key={p.id} className="relative w-16 h-16 rounded-md overflow-hidden border border-white/10 group">
                      <img src={p.data_url} alt="Order" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => handleRemovePhoto(p.id)} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`order-photo-remove-${p.id}`}>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {attachedPhotos.length === 0 && (
                <div className={`text-[10px] italic ${isDark ? "text-slate-500" : "text-gray-400"}`}>No photos attached yet. Save the order first, then attach.</div>
              )}
            </div>
          )}

          <div className={`rounded-lg p-3 flex items-center justify-between ${isDark ? "bg-emerald-500/10 border border-emerald-500/25" : "bg-emerald-50 border border-emerald-200"}`}>
            <span className={`text-xs uppercase tracking-wider font-semibold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>Total</span>
            <span className={`text-2xl font-bold font-mono ${isDark ? "text-emerald-300" : "text-emerald-700"}`} data-testid="order-total">${total.toFixed(2)}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={!canSave} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" data-testid="order-editor-save">{isEdit ? "Save order" : "Log order"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

