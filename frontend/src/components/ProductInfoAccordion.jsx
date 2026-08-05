import React, { useState } from "react";
import { ChevronDown, AlertTriangle, Info, ShieldCheck } from "lucide-react";
import { getAdditiveWarnings, NUTRISCORE_META, NOVA_META, ECOSCORE_META } from "../data/additives";

/**
 * Collapsible "Product Health & Info" panel for a pantry item.
 * Displays Nutri-Score, NOVA classification, Eco-Score, ingredients,
 * allergens, additives with warnings, and where the product is sold.
 * All data comes from the item's `productInfo` (OpenFoodFacts payload).
 */
export default function ProductInfoAccordion({ product, isDark, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  if (!product) return null;

  const warnings = getAdditiveWarnings(product.additives || [], product.ingredients_text || "");
  const warningCount = warnings.filter(w => w.level === "warning").length;
  const cautionCount = warnings.filter(w => w.level === "caution").length;
  const nutri = product.nutriscore ? NUTRISCORE_META[product.nutriscore] : null;
  const nova = product.nova_group ? NOVA_META[product.nova_group] : null;
  const eco = product.ecoscore ? ECOSCORE_META[product.ecoscore] : null;

  return (
    <div
      className={`rounded-xl overflow-hidden border ${isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-white"} mt-2`}
      data-testid="product-info-accordion"
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"} transition-colors`}
        aria-expanded={open}
        data-testid="product-info-toggle"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ShieldCheck className={`w-4 h-4 shrink-0 ${warningCount > 0 ? "text-red-500" : cautionCount > 0 ? "text-orange-500" : isDark ? "text-emerald-400" : "text-emerald-600"}`} />
          <div className="flex flex-col items-start min-w-0">
            <span className={`text-xs font-semibold ${isDark ? "text-slate-100" : "text-gray-900"}`}>Product Health & Info</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {nutri && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${nutri.bg} text-white`}>Nutri {product.nutriscore}</span>}
              {nova && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${nova.bg} text-white`}>NOVA {product.nova_group}</span>}
              {warningCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white inline-flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" />{warningCount} warning{warningCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""} ${isDark ? "text-slate-400" : "text-gray-500"}`} />
      </button>

      {open && (
        <div className={`px-3 pb-3 pt-1 text-xs space-y-3 border-t ${isDark ? "border-white/10 text-slate-200" : "border-gray-100 text-gray-700"}`}>
          {/* Score row */}
          <div className="grid grid-cols-3 gap-2">
            <ScoreCard label="Nutri-Score" meta={nutri} value={product.nutriscore} isDark={isDark} />
            <ScoreCard label="Processing" meta={nova} value={product.nova_group ? `Level ${product.nova_group}` : null} isDark={isDark} desc={nova?.desc} />
            <ScoreCard label="Eco-Score" meta={eco} value={product.ecoscore} isDark={isDark} />
          </div>

          {/* Warnings & Cautions */}
          {warnings.length > 0 && (
            <div>
              <div className="font-semibold mb-1 uppercase tracking-wide opacity-60 text-[10px]">Notable ingredients</div>
              <ul className="space-y-1">
                {warnings.map((w, i) => (
                  <li
                    key={i}
                    className={`flex items-start gap-1.5 rounded px-2 py-1.5 ${
                      w.level === "warning" ? (isDark ? "bg-red-500/10" : "bg-red-50") :
                      w.level === "caution" ? (isDark ? "bg-amber-500/10" : "bg-amber-50") :
                      (isDark ? "bg-white/5" : "bg-gray-50")
                    }`}
                  >
                    {w.level === "warning"
                      ? <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-red-500" />
                      : w.level === "caution"
                        ? <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
                        : <Info className="w-3 h-3 shrink-0 mt-0.5 opacity-60" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        {w.code ? `${w.code} — ` : ""}{w.name}
                      </div>
                      <div className="opacity-70 text-[11px] leading-snug">
                        {w.tags.join(" · ")}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Ingredients */}
          {product.ingredients_text && (
            <div>
              <div className="font-semibold mb-1 uppercase tracking-wide opacity-60 text-[10px]">Ingredients</div>
              <p className={`text-[11px] leading-snug ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                {product.ingredients_text}
              </p>
            </div>
          )}

          {/* Allergens */}
          {(product.allergens?.length > 0 || product.traces?.length > 0) && (
            <div>
              <div className="font-semibold mb-1 uppercase tracking-wide opacity-60 text-[10px]">Allergens</div>
              <div className="flex flex-wrap gap-1">
                {(product.allergens || []).map(a => (
                  <span key={a} className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? "bg-red-500/15 text-red-200" : "bg-red-100 text-red-800"}`}>
                    Contains {a}
                  </span>
                ))}
                {(product.traces || []).map(t => (
                  <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? "bg-amber-500/15 text-amber-200" : "bg-amber-100 text-amber-800"}`}>
                    May contain {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Categories / uses */}
          {product.categories?.length > 0 && (
            <div>
              <div className="font-semibold mb-1 uppercase tracking-wide opacity-60 text-[10px]">Uses in</div>
              <p className={`text-[11px] leading-snug capitalize ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                {product.categories.slice(0, 5).join(" · ")}
              </p>
            </div>
          )}

          {/* Sold in countries */}
          {product.countries?.length > 0 && (
            <div>
              <div className="font-semibold mb-1 uppercase tracking-wide opacity-60 text-[10px]">Sold in</div>
              <p className={`text-[11px] leading-snug capitalize ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                {product.countries.slice(0, 5).join(", ")}
              </p>
            </div>
          )}

          {/* Nutrition per 100g */}
          {product.nutrition && (product.nutrition.energy_kcal_100g || product.nutrition.protein_100g) && (
            <div>
              <div className="font-semibold mb-1 uppercase tracking-wide opacity-60 text-[10px]">Nutrition (per 100g)</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[11px]">
                {product.nutrition.energy_kcal_100g != null && <div>Energy: <b>{product.nutrition.energy_kcal_100g} kcal</b></div>}
                {product.nutrition.fat_100g != null && <div>Fat: <b>{product.nutrition.fat_100g}g</b></div>}
                {product.nutrition.saturated_fat_100g != null && <div>Sat fat: <b>{product.nutrition.saturated_fat_100g}g</b></div>}
                {product.nutrition.carbs_100g != null && <div>Carbs: <b>{product.nutrition.carbs_100g}g</b></div>}
                {product.nutrition.sugars_100g != null && <div>Sugars: <b>{product.nutrition.sugars_100g}g</b></div>}
                {product.nutrition.protein_100g != null && <div>Protein: <b>{product.nutrition.protein_100g}g</b></div>}
                {product.nutrition.salt_100g != null && <div>Salt: <b>{product.nutrition.salt_100g}g</b></div>}
              </div>
            </div>
          )}

          {/* Data source */}
          <div className={`text-[10px] opacity-50 pt-1 ${isDark ? "border-t border-white/5" : "border-t border-gray-100"}`}>
            Data from <span className="underline">Open Food Facts</span> — community-maintained.
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreCard({ label, meta, value, desc, isDark }) {
  return (
    <div className={`rounded-lg p-2 ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
      <div className={`text-[10px] uppercase tracking-wide font-semibold opacity-60 mb-0.5`}>{label}</div>
      {meta && value ? (
        <>
          <div className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${meta.bg} text-white`}>
            {value}
          </div>
          {(desc || meta.label) && (
            <div className={`text-[10px] mt-1 leading-tight ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              {desc || meta.label}
            </div>
          )}
        </>
      ) : (
        <div className={`text-[10px] italic ${isDark ? "text-slate-500" : "text-gray-400"}`}>Not rated</div>
      )}
    </div>
  );
}
