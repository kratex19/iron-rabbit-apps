// Shared attach-photo panel for Restaurants Galore editors.
// Used by Order / Review / Recipe / Coupon editors.

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import RestaurantsService from "../../storage/restaurantsService";

/**
 * Props:
 *   isDark, restaurantId, link: { orderId? reviewId? recipeId? couponId? },
 *   caption (optional), label (default "Photos"), disabled (default false)
 */
export function PhotoAttachPanel({ isDark, restaurantId, link, caption = "", label = "Photos", disabled = false }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef(null);

  const linkKey = link.orderId || link.reviewId || link.recipeId || link.couponId;

  const load = async () => {
    setLoading(true);
    const list = await RestaurantsService.listPhotos(link);
    setPhotos(list);
    setLoading(false);
  };
  useEffect(() => { if (linkKey) load(); else setLoading(false); }, [linkKey]);

  const handleFile = async (file) => {
    if (!file) return;
    if (disabled) { toast.error("Save this record first, then attach photos"); return; }
    // Convert camelCase alias props to snake_case fields consistent with storage schema
    const linkFields = {};
    if (link.orderId) linkFields.order_id = link.orderId;
    if (link.reviewId) linkFields.review_id = link.reviewId;
    if (link.recipeId) linkFields.recipe_id = link.recipeId;
    if (link.couponId) linkFields.coupon_id = link.couponId;

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
        await RestaurantsService.savePhoto({
          restaurant_id: restaurantId || null,
          ...linkFields,
          data_url,
          caption,
          taken_at: new Date().toISOString(),
        });
        toast.success("Photo attached");
        load();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = async (id) => {
    await RestaurantsService.deletePhoto(id);
    setPhotos(photos.filter(p => p.id !== id));
  };

  return (
    <div className={`rounded-lg p-2 border ${isDark ? "border-white/10 bg-white/[0.02]" : "border-gray-200 bg-white"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          <Camera className="w-3 h-3 inline mr-1" /> {label} ({photos.length})
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={(e) => handleFile(e.target.files?.[0])} className="hidden" data-testid="attach-photo-input" />
        <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={disabled || loading} className="h-7 text-xs" data-testid="attach-photo-btn">
          <Plus className="w-3 h-3 mr-1" /> Attach
        </Button>
      </div>
      {disabled && (
        <div className={`text-[10px] italic ${isDark ? "text-slate-500" : "text-gray-400"}`}>Save first, then attach photos.</div>
      )}
      {!disabled && photos.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid="attach-photos-grid">
          {photos.map(p => (
            <div key={p.id} className="relative w-16 h-16 rounded-md overflow-hidden border border-white/10 group">
              <img src={p.data_url} alt="Attached" className="w-full h-full object-cover" />
              <button type="button" onClick={() => handleRemove(p.id)} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`attach-photo-remove-${p.id}`}>
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
