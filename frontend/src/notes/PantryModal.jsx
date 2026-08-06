import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Package, Plus, X, Trash2, Search, Calendar, ShoppingCart, AlertTriangle,
  CheckCircle2, Clock, Filter, Edit3, Refrigerator, Snowflake, Wheat, ScanBarcode,
} from "lucide-react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import QuickGuideButton from "../quickguide/QuickGuideButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import StorageService from "../storage/storageService";
import { haptic } from "../utils/haptic";
import BarcodeScannerModal from "./BarcodeScannerModal";
import ProductInfoAccordion from "../components/ProductInfoAccordion";
import { hasNotableWarning } from "../data/additives";

const STORAGE_ZONES = [
  { key: "fridge",  label: "Fridge",  icon: Refrigerator, color: "#38bdf8" }, // sky
  { key: "freezer", label: "Freezer", icon: Snowflake,    color: "#a5f3fc" }, // cyan
  { key: "pantry",  label: "Pantry",  icon: Wheat,        color: "#facc15" }, // yellow
];

const UNITS = ["", "pcs", "kg", "g", "lb", "oz", "L", "mL", "cup", "tbsp", "tsp", "pack", "can", "bottle"];

/**
 * Pantry Inventory Manager.
 *
 * Track everything in your kitchen — expiration-date aware, quantity aware.
 * "Use" an item to decrement its quantity; when qty hits 0 you get an
 * option to send it back to your shopping list. Items nearing expiration
 * show badges (yellow ≤3d, orange ≤1d, red past-due) and can trigger a
 * notification on app open.
 *
 * All data lives 100% offline in settings.pantry_items[].
 */
export default function PantryModal({ isOpen, onClose, isDark, onSendToShoppingList }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [expFilter, setExpFilter] = useState("all"); // all | soon | expired
  const [editing, setEditing] = useState(null); // item | { id: null } for new
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      const list = await StorageService.getPantryItems();
      setItems(list);
      setLoading(false);
    })();
  }, [isOpen]);

  const enriched = useMemo(() => {
    const now = new Date();
    return items.map(it => {
      let daysLeft = null;
      let expState = "none";
      if (it.expires_at) {
        try {
          const exp = parseISO(it.expires_at);
          daysLeft = differenceInCalendarDays(exp, now);
          if (daysLeft < 0) expState = "expired";
          else if (daysLeft <= 1) expState = "critical";
          else if (daysLeft <= 3) expState = "soon";
          else expState = "ok";
        } catch { /* ignore */ }
      }
      return { ...it, daysLeft, expState };
    });
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enriched.filter(it => {
      if (zoneFilter !== "all" && it.zone !== zoneFilter) return false;
      if (expFilter === "soon" && !(it.expState === "soon" || it.expState === "critical")) return false;
      if (expFilter === "expired" && it.expState !== "expired") return false;
      if (q && !(it.name || "").toLowerCase().includes(q) && !(it.dept || "").toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => {
      // Expiring soonest first
      if (a.daysLeft === null && b.daysLeft === null) return (a.name || "").localeCompare(b.name || "");
      if (a.daysLeft === null) return 1;
      if (b.daysLeft === null) return -1;
      return a.daysLeft - b.daysLeft;
    });
  }, [enriched, query, zoneFilter, expFilter]);

  const stats = useMemo(() => {
    const total = enriched.length;
    const expiring = enriched.filter(it => it.expState === "soon" || it.expState === "critical").length;
    const expired = enriched.filter(it => it.expState === "expired").length;
    return { total, expiring, expired };
  }, [enriched]);

  const handleUse = async (it) => {
    const qty = Number(it.qty) || 0;
    if (qty <= 1) {
      // Prompt to send to shopping list
      if (window.confirm(`"${it.name}" is out. Add to your shopping list?`)) {
        if (typeof onSendToShoppingList === "function") {
          onSendToShoppingList(it);
        }
      }
      await StorageService.deletePantryItem(it.id);
      setItems(items.filter(x => x.id !== it.id));
      haptic("tap");
    } else {
      const next = { ...it, qty: qty - 1 };
      await StorageService.updatePantryItem(it.id, { qty: next.qty });
      setItems(items.map(x => x.id === it.id ? next : x));
      haptic("tap");
    }
  };

  const handleAddOne = async (it) => {
    const qty = (Number(it.qty) || 0) + 1;
    await StorageService.updatePantryItem(it.id, { qty });
    setItems(items.map(x => x.id === it.id ? { ...x, qty } : x));
    haptic("tap");
  };

  const handleDelete = async (id) => {
    await StorageService.deletePantryItem(id);
    setItems(items.filter(x => x.id !== id));
    toast.success("Removed from pantry");
    setConfirmDelete(null);
  };

  const handleSave = async (payload) => {
    const saved = await StorageService.savePantryItem(payload);
    const exists = items.find(x => x.id === saved.id);
    if (exists) setItems(items.map(x => x.id === saved.id ? saved : x));
    else setItems([saved, ...items]);
    toast.success(exists ? "Updated" : `Added "${saved.name}"`);
    setEditing(null);
  };

  const expBadge = (state, daysLeft) => {
    if (state === "expired") return { cls: "bg-red-500/20 text-red-300 border-red-500/30", text: `Expired ${Math.abs(daysLeft)}d ago`, icon: AlertTriangle };
    if (state === "critical") return { cls: "bg-orange-500/20 text-orange-300 border-orange-500/30", text: daysLeft === 0 ? "Expires today" : "Expires tomorrow", icon: Clock };
    if (state === "soon") return { cls: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", text: `Expires in ${daysLeft}d`, icon: Clock };
    if (state === "ok") return { cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", text: `${daysLeft}d left`, icon: CheckCircle2 };
    return null;
  };

  const cardCls = isDark ? "rounded-xl border border-white/10 bg-white/[0.03] p-3" : "rounded-xl border border-gray-200 bg-white p-3 shadow-sm";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className={`max-w-3xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`}
          data-testid="pantry-modal"
        >
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              <Package className="w-5 h-5 text-amber-400" /> Pantry Inventory
              <span className="ml-auto"><QuickGuideButton resourceId="IRR-1300" origin="pantry" isDark={isDark} size="sm" /></span>
            </DialogTitle>
            <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
              Everything in your kitchen. Track quantities, watch expiration dates, restock in one tap.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className={`text-center py-16 text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Loading…</div>
          ) : (
            <div className="space-y-3">
              {/* KPI strip */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className={cardCls}>
                  <div className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>Total items</div>
                  <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{stats.total}</div>
                </div>
                <div className={cardCls}>
                  <div className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>Expiring soon</div>
                  <div className="text-2xl font-bold text-yellow-400" data-testid="pantry-stat-expiring">{stats.expiring}</div>
                </div>
                <div className={cardCls}>
                  <div className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>Past due</div>
                  <div className="text-2xl font-bold text-red-400" data-testid="pantry-stat-expired">{stats.expired}</div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search pantry…"
                    className={`pl-8 h-9 ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500" : ""}`}
                    data-testid="pantry-search"
                  />
                </div>
                <ZoneChip active={zoneFilter === "all"} onClick={() => setZoneFilter("all")} label="All" isDark={isDark} testid="pantry-zone-all" />
                {STORAGE_ZONES.map(z => (
                  <ZoneChip
                    key={z.key}
                    active={zoneFilter === z.key}
                    onClick={() => setZoneFilter(z.key)}
                    label={z.label}
                    icon={z.icon}
                    color={z.color}
                    isDark={isDark}
                    testid={`pantry-zone-${z.key}`}
                  />
                ))}
                <div className="w-px h-6 mx-1 bg-white/10" />
                <ZoneChip active={expFilter === "all"} onClick={() => setExpFilter("all")} label="Any age" isDark={isDark} testid="pantry-exp-all" />
                <ZoneChip active={expFilter === "soon"} onClick={() => setExpFilter("soon")} label="Expiring" color="#fbbf24" isDark={isDark} testid="pantry-exp-soon" />
                <ZoneChip active={expFilter === "expired"} onClick={() => setExpFilter("expired")} label="Expired" color="#ef4444" isDark={isDark} testid="pantry-exp-expired" />
                <div className="flex-1" />
                <Button
                  onClick={() => setEditing({})}
                  className="h-9 bg-amber-500 hover:bg-amber-600 text-white"
                  data-testid="pantry-add-btn"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add item
                </Button>
              </div>

              {/* Items list */}
              {filtered.length === 0 ? (
                <div className={`text-center py-12 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  <Package className={`w-10 h-10 mx-auto mb-2 ${isDark ? "text-slate-600" : "text-gray-300"}`} />
                  <div className="text-sm font-medium mb-1">
                    {items.length === 0 ? "Your pantry is empty" : "No matches"}
                  </div>
                  <div className="text-xs">
                    {items.length === 0 ? "Tap Add item to start tracking what you have." : "Try clearing filters or search."}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5" data-testid="pantry-list">
                  {filtered.map(it => {
                    const badge = expBadge(it.expState, it.daysLeft);
                    const zone = STORAGE_ZONES.find(z => z.key === it.zone);
                    const ZoneIcon = zone?.icon;
                    const notable = it.productInfo && hasNotableWarning(it.productInfo.additives || [], it.productInfo.ingredients_text || "");
                    return (
                      <div key={it.id} className="space-y-0" data-testid={`pantry-item-wrap-${it.id}`}>
                      <div
                        className={`flex items-center gap-2 rounded-lg border p-2.5 ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"} ${it.expState === "expired" ? "border-red-500/40" : ""}`}
                        data-testid={`pantry-item-${it.id}`}
                      >
                        {it.productInfo?.image ? (
                          <div
                            className={`relative w-8 h-8 rounded-lg overflow-hidden shrink-0 ${isDark ? "bg-white/5 border border-white/10" : "bg-white border border-gray-200"}`}
                            title={zone ? `${zone.label} · ${it.productInfo.brand || it.productInfo.name || ""}`.trim() : (it.productInfo.brand || it.productInfo.name || "")}
                            data-testid={`pantry-item-photo-${it.id}`}
                          >
                            <img
                              src={it.productInfo.image}
                              alt=""
                              loading="lazy"
                              className="w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                            {ZoneIcon && (
                              <div
                                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center shadow ring-1 ring-black/20"
                                style={{ background: zone.color, color: "#fff" }}
                              >
                                <ZoneIcon className="w-2 h-2" />
                              </div>
                            )}
                          </div>
                        ) : ZoneIcon ? (
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `${zone.color}22`, color: zone.color }}
                            title={zone.label}
                          >
                            <ZoneIcon className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDark ? "bg-white/5 text-slate-500" : "bg-gray-100 text-gray-400"}`}>
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                            {it.name}
                            {it.productInfo?.brand && <span className={`ml-2 text-[10px] font-normal ${isDark ? "text-slate-500" : "text-gray-500"}`}>· {it.productInfo.brand}</span>}
                            {it.dept && <span className={`ml-2 text-[10px] font-normal ${isDark ? "text-slate-500" : "text-gray-500"}`}>· {it.dept}</span>}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {badge && (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge.cls}`}>
                                <badge.icon className="w-2.5 h-2.5" />
                                {badge.text}
                              </span>
                            )}
                            {notable && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-500/15 text-red-500" title="Notable ingredients — tap Product Info below">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Notable
                              </span>
                            )}
                            {it.notes && (
                              <span className={`text-[10px] truncate ${isDark ? "text-slate-500" : "text-gray-500"}`}>{it.notes}</span>
                            )}
                          </div>
                        </div>
                        <div className={`flex items-center gap-0.5 text-xs font-mono px-2 py-1 rounded ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
                          <button
                            type="button"
                            onClick={() => handleUse(it)}
                            className={`w-5 h-5 rounded flex items-center justify-center ${isDark ? "hover:bg-white/10 text-slate-300" : "hover:bg-gray-200 text-gray-600"}`}
                            aria-label={`Use one ${it.name}`}
                            data-testid={`pantry-use-${it.id}`}
                          >
                            −
                          </button>
                          <span className={`min-w-[36px] text-center ${isDark ? "text-white" : "text-gray-900"}`}>
                            {it.qty || 0}
                            {it.unit ? <span className={`ml-0.5 text-[10px] font-normal ${isDark ? "text-slate-500" : "text-gray-500"}`}>{it.unit}</span> : null}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddOne(it)}
                            className={`w-5 h-5 rounded flex items-center justify-center ${isDark ? "hover:bg-white/10 text-slate-300" : "hover:bg-gray-200 text-gray-600"}`}
                            aria-label={`Add one ${it.name}`}
                            data-testid={`pantry-plus-${it.id}`}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditing(it)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
                          aria-label={`Edit ${it.name}`}
                          data-testid={`pantry-edit-${it.id}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(it)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}
                          aria-label={`Delete ${it.name}`}
                          data-testid={`pantry-delete-${it.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {it.productInfo && (
                        <ProductInfoAccordion product={it.productInfo} isDark={isDark} defaultOpen={notable} />
                      )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {editing !== null && (
        <PantryEditModal
          item={editing.id ? editing : null}
          isDark={isDark}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent data-testid="pantry-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this item?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{confirmDelete?.name}&quot; will be removed from your pantry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => confirmDelete && handleDelete(confirmDelete.id)}
              data-testid="pantry-delete-confirm-btn"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ZoneChip({ active, onClick, label, icon: Icon, color, isDark, testid }) {
  const activeCls = isDark
    ? "bg-white/15 text-white border-white/25"
    : "bg-gray-900 text-white border-gray-900";
  const inactiveCls = isDark
    ? "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${active ? activeCls : inactiveCls}`}
      data-testid={testid}
    >
      {Icon && <Icon className="w-3 h-3" style={color ? { color } : undefined} />}
      {label}
    </button>
  );
}

function PantryEditModal({ item, isDark, onClose, onSave }) {
  const isEdit = !!item;
  const [scannerOpen, setScannerOpen] = useState(false);
  const [form, setForm] = useState({
    id: item?.id,
    name: item?.name || "",
    qty: item?.qty ?? 1,
    unit: item?.unit || "",
    zone: item?.zone || "pantry",
    dept: item?.dept || "",
    expires_at: item?.expires_at ? item.expires_at.slice(0, 10) : "",
    notes: item?.notes || "",
    barcode: item?.barcode || "",
    productInfo: item?.productInfo || null,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleScanCapture = ({ code, name, brand, product }) => {
    setForm(f => ({
      ...f,
      barcode: code,
      name: name || f.name,
      productInfo: product || null,
      // Auto-suggest zone from categories (dairy/meat → fridge, frozen → freezer)
      zone: (() => {
        const cats = (product?.categories || []).join(" ").toLowerCase();
        if (cats.includes("frozen")) return "freezer";
        if (cats.includes("dairy") || cats.includes("meat") || cats.includes("cheese") || cats.includes("yogurt")) return "fridge";
        return f.zone;
      })(),
    }));
    setScannerOpen(false);
    if (product) toast.success(`Loaded ${product.name || code}`);
    else toast.info(`Scanned ${code} — no product info found`);
  };

  const canSave = form.name.trim() && Number(form.qty) >= 0;

  const submit = (e) => {
    e?.preventDefault();
    if (!canSave) return;
    const payload = {
      ...form,
      name: form.name.trim(),
      qty: Number(form.qty),
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };
    onSave(payload);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className={`max-w-md max-h-[85vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`}
        data-testid="pantry-edit-modal"
      >
        <DialogHeader>
          <DialogTitle className={isDark ? "text-white" : "text-gray-900"}>
            {isEdit ? "Edit item" : "Add to pantry"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-2">
          {/* Scan barcode CTA — top of form so users can populate everything at once */}
          {!isEdit && (
            <Button
              type="button"
              onClick={() => setScannerOpen(true)}
              className={`w-full h-10 gap-2 font-semibold ${isDark ? "bg-indigo-500 hover:bg-indigo-400 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"}`}
              data-testid="pantry-edit-scan-btn"
            >
              <ScanBarcode className="w-4 h-4" />
              Scan barcode / QR
            </Button>
          )}
          {form.productInfo && (
            <div className={`flex items-center gap-2 rounded-md p-2 ${isDark ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-200" : "bg-emerald-50 border border-emerald-200 text-emerald-800"} text-xs`} data-testid="pantry-edit-product-loaded">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 min-w-0 truncate">
                Loaded: <b>{form.productInfo.name || "Unknown"}</b>
                {form.productInfo.brand && ` · ${form.productInfo.brand}`}
              </span>
              <button
                type="button"
                onClick={() => set("productInfo", null)}
                className="opacity-60 hover:opacity-100"
                aria-label="Clear product info"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <Field label="Name" isDark={isDark}>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Whole milk"
              className={`h-9 ${isDark ? "bg-white/5 border-white/10 text-white" : ""}`}
              autoFocus
              data-testid="pantry-edit-name"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Quantity" isDark={isDark}>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={form.qty}
                onChange={(e) => set("qty", e.target.value)}
                className={`h-9 ${isDark ? "bg-white/5 border-white/10 text-white" : ""}`}
                data-testid="pantry-edit-qty"
              />
            </Field>
            <Field label="Unit" isDark={isDark}>
              <Select value={form.unit || "__none"} onValueChange={(v) => set("unit", v === "__none" ? "" : v)}>
                <SelectTrigger className={`h-9 ${isDark ? "bg-white/5 border-white/10 text-white" : ""}`} data-testid="pantry-edit-unit">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="__none" value="__none">—</SelectItem>
                  {UNITS.filter(u => u).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Storage zone" isDark={isDark}>
            <div className="flex gap-1.5">
              {STORAGE_ZONES.map(z => {
                const active = form.zone === z.key;
                return (
                  <button
                    key={z.key}
                    type="button"
                    onClick={() => set("zone", z.key)}
                    className={`flex-1 h-9 rounded-md border text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                      active
                        ? isDark ? "border-white/30 bg-white/10 text-white" : "border-gray-900 bg-gray-900 text-white"
                        : isDark ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    data-testid={`pantry-edit-zone-${z.key}`}
                  >
                    <z.icon className="w-3.5 h-3.5" style={{ color: z.color }} />
                    {z.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Expiration date" isDark={isDark}>
            <Input
              type="date"
              value={form.expires_at}
              onChange={(e) => set("expires_at", e.target.value)}
              className={`h-9 ${isDark ? "bg-white/5 border-white/10 text-white" : ""}`}
              data-testid="pantry-edit-expires"
            />
          </Field>

          <Field label="Aisle / department (optional)" isDark={isDark}>
            <Input
              value={form.dept}
              onChange={(e) => set("dept", e.target.value)}
              placeholder="e.g. Dairy"
              className={`h-9 ${isDark ? "bg-white/5 border-white/10 text-white" : ""}`}
              data-testid="pantry-edit-dept"
            />
          </Field>

          <Field label="Notes (optional)" isDark={isDark}>
            <Input
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="e.g. opened Feb 1"
              className={`h-9 ${isDark ? "bg-white/5 border-white/10 text-white" : ""}`}
              data-testid="pantry-edit-notes"
            />
          </Field>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              type="submit"
              disabled={!canSave}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              data-testid="pantry-edit-save"
            >
              {isEdit ? "Save changes" : "Add to pantry"}
            </Button>
          </div>
        </form>
      </DialogContent>
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onCapture={handleScanCapture}
        isDark={isDark}
      />
    </Dialog>
  );
}

function Field({ label, children, isDark }) {
  return (
    <div>
      <label className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
