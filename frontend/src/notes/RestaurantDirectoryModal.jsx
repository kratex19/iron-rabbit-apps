import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Store, Plus, Search, Heart, EyeOff, Archive, Phone, Globe, MapPin,
  Sparkles,
  Mail, Clock, Utensils, Edit3, Trash2, X, Check, ArrowLeft, Car, Truck,
  ShoppingBag, Calendar, Users, Accessibility, Baby, Dog, ExternalLink,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import RestaurantsService from "../storage/restaurantsService";
import { haptic } from "../utils/haptic";
import { MapsPickerModal } from "./RestaurantWorkspacesP5";
import { PreVisitBriefingModal } from "./rg/PreVisitBriefing";

const AMENITY_TAGS = [
  { key: "drive_thru", label: "Drive-Thru", icon: Car },
  { key: "delivery", label: "Delivery", icon: Truck },
  { key: "pickup", label: "Pickup", icon: ShoppingBag },
  { key: "reservations", label: "Reservations", icon: Calendar },
  { key: "outdoor_seating", label: "Outdoor Seating", icon: Users },
  { key: "wheelchair", label: "Wheelchair", icon: Accessibility },
  { key: "kid_friendly", label: "Kid Friendly", icon: Baby },
  { key: "pet_friendly", label: "Pet Friendly", icon: Dog },
];

const CUISINES = [
  "American", "Italian", "Mexican", "Chinese", "Japanese", "Thai", "Indian",
  "Mediterranean", "French", "Greek", "Korean", "Vietnamese", "BBQ", "Seafood",
  "Steakhouse", "Pizza", "Burger", "Sushi", "Deli", "Cafe", "Bakery", "Diner",
  "Fast Food", "Buffet", "Vegan", "Vegetarian", "Fusion", "Other",
];

export default function RestaurantDirectoryModal({ isOpen, onClose, isDark }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | favorites | hidden | archived
  const [editing, setEditing] = useState(null); // {} for new, item for edit, null closed
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [mapsFor, setMapsFor] = useState(null); // restaurant to open in Maps picker
  const [briefingFor, setBriefingFor] = useState(null); // restaurant to open in Pre-Visit briefing

  const reload = async () => {
    setLoading(true);
    const list = await RestaurantsService.listRestaurants({ includeArchived: true });
    setItems(list);
    setLoading(false);
  };

  useEffect(() => { if (isOpen) reload(); }, [isOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(r => {
      if (filter === "favorites" && !r.favorite) return false;
      if (filter === "hidden" && !r.hidden) return false;
      if (filter === "archived" && !r.archived) return false;
      if (filter === "all" && (r.archived || r.hidden)) return false;
      if (!q) return true;
      return (r.name || "").toLowerCase().includes(q)
        || (r.nickname || "").toLowerCase().includes(q)
        || (r.cuisine || "").toLowerCase().includes(q)
        || (r.category || "").toLowerCase().includes(q);
    });
  }, [items, query, filter]);

  const toggleFavorite = async (r) => {
    const saved = await RestaurantsService.saveRestaurant({ ...r, favorite: !r.favorite });
    setItems(items.map(x => x.id === saved.id ? saved : x));
    haptic("tap");
  };

  const handleSave = async (payload) => {
    const saved = await RestaurantsService.saveRestaurant(payload);
    const exists = items.find(x => x.id === saved.id);
    if (exists) setItems(items.map(x => x.id === saved.id ? saved : x));
    else setItems([saved, ...items]);
    toast.success(exists ? "Updated" : `Added "${saved.name}"`);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    await RestaurantsService.deleteRestaurant(id);
    setItems(items.filter(x => x.id !== id));
    toast.success("Restaurant removed (with cascading data)");
    setConfirmDelete(null);
  };

  const filterChip = (val, label, count) => {
    const active = filter === val;
    const activeCls = isDark ? "bg-white/15 text-white border-white/25" : "bg-gray-900 text-white border-gray-900";
    const inactiveCls = isDark ? "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50";
    return (
      <button
        key={val}
        type="button"
        onClick={() => setFilter(val)}
        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${active ? activeCls : inactiveCls}`}
        data-testid={`directory-filter-${val}`}
      >
        {label}
        <span className={`text-[10px] ${active ? "opacity-70" : "opacity-50"}`}>{count}</span>
      </button>
    );
  };

  const counts = {
    all: items.filter(r => !r.archived && !r.hidden).length,
    favorites: items.filter(r => r.favorite).length,
    hidden: items.filter(r => r.hidden).length,
    archived: items.filter(r => r.archived).length,
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className={`max-w-3xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`}
          data-testid="restaurant-directory-modal"
        >
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              <Store className="w-5 h-5 text-amber-400" /> Restaurant Directory
            </DialogTitle>
            <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
              Unlimited restaurants. Everything you need to remember, in one place.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className={`py-16 text-center text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Loading…</div>
          ) : (
            <div className="space-y-3">
              {/* Search + filter chips */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search restaurants…"
                    className={`pl-8 h-9 ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500" : ""}`}
                    data-testid="directory-search"
                  />
                </div>
                {filterChip("all", "Active", counts.all)}
                {filterChip("favorites", "Favorites", counts.favorites)}
                {filterChip("hidden", "Hidden", counts.hidden)}
                {filterChip("archived", "Archived", counts.archived)}
                <Button
                  onClick={() => setEditing({})}
                  className="h-9 bg-amber-500 hover:bg-amber-600 text-white"
                  data-testid="directory-add-btn"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add restaurant
                </Button>
              </div>

              {/* Empty / list */}
              {filtered.length === 0 ? (
                <div className={`text-center py-12 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  <Utensils className={`w-10 h-10 mx-auto mb-2 ${isDark ? "text-slate-600" : "text-gray-300"}`} />
                  <div className="text-sm font-medium mb-1">
                    {items.length === 0 ? "No restaurants yet" : "No matches"}
                  </div>
                  <div className="text-xs">
                    {items.length === 0 ? "Tap Add restaurant to start building your directory." : "Try clearing the search or filters."}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5" data-testid="directory-list">
                  {filtered.map(r => {
                    const activeTags = AMENITY_TAGS.filter(t => r.tags?.[t.key]);
                    return (
                      <div
                        key={r.id}
                        className={`rounded-lg border p-3 ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"} ${r.archived ? "opacity-60" : ""}`}
                        data-testid={`directory-row-${r.id}`}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => toggleFavorite(r)}
                            className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${r.favorite ? "text-pink-400" : isDark ? "text-slate-600 hover:text-pink-400" : "text-gray-300 hover:text-pink-400"}`}
                            aria-label={r.favorite ? "Remove favorite" : "Mark favorite"}
                            data-testid={`directory-favorite-${r.id}`}
                          >
                            <Heart className={`w-4 h-4 ${r.favorite ? "fill-current" : ""}`} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{r.name}</div>
                              {r.nickname && <span className={`text-[11px] italic ${isDark ? "text-slate-400" : "text-gray-500"}`}>&ldquo;{r.nickname}&rdquo;</span>}
                              {r.hidden && <span className={`text-[9px] px-1.5 py-0.5 rounded ${isDark ? "bg-white/10 text-slate-400" : "bg-gray-100 text-gray-500"}`}>Hidden</span>}
                              {r.archived && <span className={`text-[9px] px-1.5 py-0.5 rounded ${isDark ? "bg-white/10 text-slate-400" : "bg-gray-100 text-gray-500"}`}>Archived</span>}
                            </div>
                            <div className={`flex items-center gap-2 mt-0.5 text-[11px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                              {r.cuisine && <span>{r.cuisine}</span>}
                              {r.category && <span>· {r.category}</span>}
                            </div>
                            <div className={`flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                              {(r.phones?.[0]) && (
                                <a href={`tel:${r.phones[0]}`} className="inline-flex items-center gap-1 hover:underline">
                                  <Phone className="w-2.5 h-2.5" /> {r.phones[0]}
                                </a>
                              )}
                              {r.website && (
                                <a href={r.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
                                  <Globe className="w-2.5 h-2.5" /> Website
                                  <ExternalLink className="w-2 h-2" />
                                </a>
                              )}
                              {r.address && (
                                <button type="button" onClick={() => setMapsFor(r)} className="inline-flex items-center gap-1 hover:underline" data-testid={`directory-maps-${r.id}`}>
                                  <MapPin className="w-2.5 h-2.5" /> Directions
                                </button>
                              )}
                              <button type="button" onClick={() => setBriefingFor(r)} className={`inline-flex items-center gap-1 hover:underline ${isDark ? "text-amber-300" : "text-amber-700"}`} data-testid={`directory-brief-${r.id}`}>
                                <Sparkles className="w-2.5 h-2.5" /> Brief
                              </button>
                              {r.email && (
                                <span className="inline-flex items-center gap-1"><Mail className="w-2.5 h-2.5" /> {r.email}</span>
                              )}
                              {r.hours && (
                                <span className="inline-flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {r.hours}</span>
                              )}
                            </div>
                            {activeTags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {activeTags.map(t => (
                                  <span
                                    key={t.key}
                                    className={`inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded ${isDark ? "bg-amber-500/15 text-amber-300 border border-amber-500/25" : "bg-amber-50 text-amber-700 border border-amber-200"}`}
                                  >
                                    <t.icon className="w-2.5 h-2.5" /> {t.label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setEditing(r)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
                              aria-label={`Edit ${r.name}`}
                              data-testid={`directory-edit-${r.id}`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(r)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}
                              aria-label={`Delete ${r.name}`}
                              data-testid={`directory-delete-${r.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {editing !== null && (
        <RestaurantEditModal
          item={editing.id ? editing : null}
          isDark={isDark}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent data-testid="directory-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this restaurant?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{confirmDelete?.name}&quot; and all its menus, favorite meals, orders, reviews, deliveries, and coupons will be permanently removed. Consider Archive instead if you might come back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => confirmDelete && handleDelete(confirmDelete.id)}
              data-testid="directory-delete-confirm-btn"
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {mapsFor && (
        <MapsPickerModal
          isOpen={!!mapsFor}
          onClose={() => setMapsFor(null)}
          isDark={isDark}
          address={mapsFor.address}
          name={mapsFor.name}
        />
      )}

      {briefingFor && (
        <PreVisitBriefingModal
          isOpen={!!briefingFor}
          onClose={() => setBriefingFor(null)}
          isDark={isDark}
          restaurant={briefingFor}
        />
      )}
    </>
  );
}

function RestaurantEditModal({ item, isDark, onClose, onSave }) {
  const isEdit = !!item;
  const [f, setF] = useState({
    name: item?.name || "",
    nickname: item?.nickname || "",
    category: item?.category || "",
    cuisine: item?.cuisine || "",
    phones: item?.phones?.length ? [...item.phones] : [""],
    website: item?.website || "",
    online_url: item?.online_url || "",
    email: item?.email || "",
    hours: item?.hours || "",
    holiday_hours: item?.holiday_hours || "",
    address: item?.address || "",
    parking_notes: item?.parking_notes || "",
    tags: { ...(item?.tags || {}) },
    notes: item?.notes || "",
    favorite: !!item?.favorite,
    hidden: !!item?.hidden,
    archived: !!item?.archived,
  });
  const set = (k, v) => setF({ ...f, [k]: v });
  const setTag = (k, v) => setF({ ...f, tags: { ...f.tags, [k]: v } });
  const setPhone = (i, v) => {
    const next = [...f.phones]; next[i] = v; setF({ ...f, phones: next });
  };
  const addPhone = () => setF({ ...f, phones: [...f.phones, ""] });
  const rmPhone = (i) => setF({ ...f, phones: f.phones.filter((_, ix) => ix !== i) });

  const submit = (e) => {
    e?.preventDefault();
    if (!f.name.trim()) return;
    onSave({
      ...item,
      ...f,
      name: f.name.trim(),
      phones: f.phones.map(p => p.trim()).filter(Boolean),
    });
  };

  const inputCls = `h-9 ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500" : ""}`;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className={`max-w-lg max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`}
        data-testid="restaurant-edit-modal"
      >
        <DialogHeader>
          <DialogTitle className={isDark ? "text-white" : "text-gray-900"}>
            {isEdit ? `Edit ${item.name}` : "New restaurant"}
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            All fields save locally &mdash; nothing leaves this device.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-2">
          <Field label="Restaurant name*" isDark={isDark}>
            <Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. The Corner Bistro" className={inputCls} data-testid="rest-edit-name" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Nickname" isDark={isDark}>
              <Input value={f.nickname} onChange={(e) => set("nickname", e.target.value)} placeholder="e.g. Our spot" className={inputCls} data-testid="rest-edit-nickname" />
            </Field>
            <Field label="Category" isDark={isDark}>
              <Input value={f.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Fine dining, Casual" className={inputCls} />
            </Field>
          </div>
          <Field label="Cuisine" isDark={isDark}>
            <Input value={f.cuisine} onChange={(e) => set("cuisine", e.target.value)} placeholder="e.g. Italian, Thai…" list="cuisine-suggestions" className={inputCls} data-testid="rest-edit-cuisine" />
            <datalist id="cuisine-suggestions">
              {CUISINES.map(c => <option key={c} value={c} />)}
            </datalist>
          </Field>

          <Field label="Phone numbers" isDark={isDark}>
            <div className="space-y-1.5">
              {f.phones.map((p, i) => (
                <div key={i} className="flex gap-1.5">
                  <Input type="tel" value={p} onChange={(e) => setPhone(i, e.target.value)} placeholder="(555) 123-4567" className={inputCls + " flex-1"} data-testid={`rest-edit-phone-${i}`} />
                  {f.phones.length > 1 && (
                    <button type="button" onClick={() => rmPhone(i)} className={`w-9 h-9 rounded flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}>
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addPhone} className={`text-[11px] ${isDark ? "text-slate-400 hover:text-white" : "text-gray-500 hover:text-gray-800"}`}>
                + Add another phone
              </button>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Website" isDark={isDark}>
              <Input type="url" value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" className={inputCls} />
            </Field>
            <Field label="Online ordering" isDark={isDark}>
              <Input type="url" value={f.online_url} onChange={(e) => set("online_url", e.target.value)} placeholder="https://…" className={inputCls} />
            </Field>
          </div>
          <Field label="Email" isDark={isDark}>
            <Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="info@…" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Hours" isDark={isDark}>
              <Input value={f.hours} onChange={(e) => set("hours", e.target.value)} placeholder="Mon-Fri 11a-10p" className={inputCls} />
            </Field>
            <Field label="Holiday hours" isDark={isDark}>
              <Input value={f.holiday_hours} onChange={(e) => set("holiday_hours", e.target.value)} placeholder="Closed on major holidays" className={inputCls} />
            </Field>
          </div>
          <Field label="Address" isDark={isDark}>
            <Input value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="123 Main St, City, ST" className={inputCls} data-testid="rest-edit-address" />
          </Field>
          <Field label="Parking notes" isDark={isDark}>
            <Input value={f.parking_notes} onChange={(e) => set("parking_notes", e.target.value)} placeholder="Free lot behind building" className={inputCls} />
          </Field>

          <Field label="Amenities" isDark={isDark}>
            <div className="grid grid-cols-2 gap-1.5">
              {AMENITY_TAGS.map(t => (
                <label key={t.key} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border cursor-pointer text-xs ${
                  f.tags[t.key]
                    ? isDark ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-amber-300 bg-amber-50 text-amber-800"
                    : isDark ? "border-white/10 text-slate-400 hover:bg-white/5" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`} data-testid={`rest-edit-tag-${t.key}`}>
                  <input type="checkbox" checked={!!f.tags[t.key]} onChange={(e) => setTag(t.key, e.target.checked)} className="hidden" />
                  <t.icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                  {f.tags[t.key] && <Check className="w-3 h-3 ml-auto" />}
                </label>
              ))}
            </div>
          </Field>

          <Field label="Notes" isDark={isDark}>
            <Textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any personal notes…" rows={2} className={`${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500" : ""}`} />
          </Field>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={f.favorite} onChange={(e) => set("favorite", e.target.checked)} />
              <span className={`text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`}>Favorite</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={f.hidden} onChange={(e) => set("hidden", e.target.checked)} />
              <span className={`text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`}>Hidden from dashboard</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={f.archived} onChange={(e) => set("archived", e.target.checked)} />
              <span className={`text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`}>Archived</span>
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              type="submit"
              disabled={!f.name.trim()}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              data-testid="rest-edit-save"
            >
              <Check className="w-4 h-4 mr-1" /> {isEdit ? "Save changes" : "Add restaurant"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, isDark }) {
  return (
    <div>
      <label className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
