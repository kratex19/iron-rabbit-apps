// Additive & ingredient warning database.
// Small curated static data — no external API calls. Used by the Product
// Health & Info accordion in the Pantry to surface health-relevant flags.
//
// Sources: EFSA (European Food Safety Authority), FDA GRAS list,
// CSPI additive concerns, Feingold Program, IARC monographs.
// Each entry is intentionally short and neutral — informational, not medical.

export const ADDITIVE_INFO = {
  // === Colours (E100-E199) ===
  "e102": { name: "Tartrazine (Yellow 5)", level: "caution", tags: ["may trigger hyperactivity in sensitive children", "banned in Norway & Austria"] },
  "e104": { name: "Quinoline Yellow", level: "caution", tags: ["banned in USA, Norway, Japan", "linked to hyperactivity"] },
  "e110": { name: "Sunset Yellow (Yellow 6)", level: "caution", tags: ["hyperactivity link", "banned in Norway & Finland"] },
  "e120": { name: "Cochineal / Carmine", level: "info", tags: ["derived from insects", "possible allergen"] },
  "e122": { name: "Azorubine (Carmoisine)", level: "caution", tags: ["banned in USA, Canada, Norway, Japan"] },
  "e123": { name: "Amaranth (Red 2)", level: "warning", tags: ["banned in USA since 1976"] },
  "e124": { name: "Ponceau 4R (Cochineal Red A)", level: "caution", tags: ["banned in USA & Norway", "hyperactivity link"] },
  "e127": { name: "Erythrosine (Red 3)", level: "warning", tags: ["banned in USA (2024)", "possible thyroid effects"] },
  "e129": { name: "Allura Red (Red 40)", level: "caution", tags: ["banned in Denmark, Norway, Switzerland", "hyperactivity link"] },
  "e131": { name: "Patent Blue V", level: "caution", tags: ["banned in USA, Norway, Australia"] },
  "e132": { name: "Indigo Carmine (Blue 2)", level: "info", tags: ["mild allergen for some"] },
  "e133": { name: "Brilliant Blue (Blue 1)", level: "info", tags: ["FDA approved but some sensitivities"] },
  "e142": { name: "Green S", level: "caution", tags: ["banned in USA, Canada, Norway, Japan"] },
  "e150a": { name: "Plain Caramel", level: "info", tags: ["most common colour additive"] },
  "e150c": { name: "Ammonia Caramel", level: "caution", tags: ["contains 4-MEI (possible carcinogen per IARC 2B)"] },
  "e150d": { name: "Sulphite Ammonia Caramel", level: "caution", tags: ["contains 4-MEI", "used in colas"] },
  "e151": { name: "Brilliant Black BN", level: "caution", tags: ["banned in USA, Canada, Norway, Finland"] },
  "e155": { name: "Brown HT", level: "caution", tags: ["banned in USA, Norway, Sweden"] },
  "e161g": { name: "Canthaxanthin", level: "caution", tags: ["banned as food dye in USA"] },
  "e173": { name: "Aluminium", level: "warning", tags: ["banned in EU", "neurotoxicity concerns"] },
  "e180": { name: "Litholrubine BK", level: "caution", tags: ["restricted to cheese rind coating in EU"] },

  // === Preservatives (E200-E299) ===
  "e210": { name: "Benzoic Acid", level: "caution", tags: ["may form benzene with vitamin C", "hyperactivity link"] },
  "e211": { name: "Sodium Benzoate", level: "caution", tags: ["hyperactivity link (Southampton study)", "benzene formation risk"] },
  "e220": { name: "Sulphur Dioxide", level: "caution", tags: ["banned for meats in USA", "asthma trigger"] },
  "e221": { name: "Sodium Sulphite", level: "caution", tags: ["allergen for sulfite-sensitive individuals"] },
  "e223": { name: "Sodium Metabisulphite", level: "caution", tags: ["banned in fresh meats/fish USA", "asthma trigger"] },
  "e249": { name: "Potassium Nitrite", level: "warning", tags: ["forms nitrosamines (possible carcinogen)"] },
  "e250": { name: "Sodium Nitrite", level: "warning", tags: ["IARC group 2A carcinogen (processed meats)"] },
  "e251": { name: "Sodium Nitrate", level: "warning", tags: ["can convert to nitrite in body"] },

  // === Antioxidants & Acidity Regulators (E300-E399) ===
  "e320": { name: "BHA (Butylated Hydroxyanisole)", level: "warning", tags: ["banned in Japan", "IARC group 2B (possible carcinogen)"] },
  "e321": { name: "BHT (Butylated Hydroxytoluene)", level: "warning", tags: ["restricted in UK, Japan", "endocrine concerns"] },
  "e330": { name: "Citric Acid", level: "info", tags: ["natural, generally safe"] },
  "e338": { name: "Phosphoric Acid", level: "info", tags: ["used in colas", "may affect bone density in excess"] },

  // === Thickeners, Stabilisers, Emulsifiers (E400-E499) ===
  "e407": { name: "Carrageenan", level: "caution", tags: ["may cause gut inflammation in sensitive people"] },
  "e433": { name: "Polysorbate 80", level: "caution", tags: ["may alter gut microbiome (per some studies)"] },
  "e466": { name: "Carboxymethylcellulose (CMC)", level: "caution", tags: ["gut microbiome effects (2021 study)"] },

  // === Flavour Enhancers (E600-E699) ===
  "e621": { name: "Monosodium Glutamate (MSG)", level: "caution", tags: ["some sensitivity reactions", "not linked to serious harm per FDA"] },
  "e627": { name: "Disodium Guanylate", level: "info", tags: ["avoid with gout / high uric acid"] },
  "e631": { name: "Disodium Inosinate", level: "info", tags: ["avoid with gout / high uric acid"] },

  // === Sweeteners (E900-E999) ===
  "e924": { name: "Potassium Bromate", level: "warning", tags: ["banned in EU, UK, Canada, Peru, Brazil, China", "IARC group 2B carcinogen", "still allowed in USA"] },
  "e926": { name: "Chlorine Dioxide (bleach)", level: "warning", tags: ["banned in EU as flour bleach", "linked to nutrient loss"] },
  "e927b": { name: "Carbamide (Urea)", level: "info", tags: ["in chewing gums; safe in food amounts"] },
  "e950": { name: "Acesulfame K", level: "caution", tags: ["long-term safety debated"] },
  "e951": { name: "Aspartame", level: "warning", tags: ["IARC group 2B (2023)", "banned for people with PKU"] },
  "e952": { name: "Cyclamate", level: "warning", tags: ["banned in USA since 1969"] },
  "e954": { name: "Saccharin", level: "caution", tags: ["banned in some countries", "warning label removed in USA in 2000"] },
  "e955": { name: "Sucralose", level: "caution", tags: ["may affect gut microbiome", "heat instability concerns"] },
  "e960": { name: "Steviol Glycosides (Stevia)", level: "info", tags: ["natural sweetener, generally recognized safe"] },

  // === Common non-E-number ingredients worth flagging ===
  "high-fructose corn syrup": { name: "High-Fructose Corn Syrup", level: "caution", tags: ["ultra-processed sweetener", "linked to metabolic issues in excess"] },
  "hydrogenated oil": { name: "Hydrogenated Oil", level: "warning", tags: ["contains trans fats (banned in USA & EU when >0.5%)"] },
  "palm oil": { name: "Palm Oil", level: "info", tags: ["environmental concerns; look for RSPO-certified"] },
};

/**
 * Given a list of additive tags from OpenFoodFacts (e.g. ["e150d", "e338"])
 * and optionally the ingredients_text, return an array of warning objects.
 * Level: "warning" > "caution" > "info". Only "warning"/"caution" surface a chip.
 */
export function getAdditiveWarnings(additives = [], ingredientsText = "") {
  const results = [];
  const seen = new Set();

  for (const raw of additives) {
    const key = String(raw || "").toLowerCase().replace(/\s+/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    if (ADDITIVE_INFO[key]) {
      results.push({ code: key.toUpperCase(), ...ADDITIVE_INFO[key] });
    }
  }

  // Ingredient text fuzzy match for a few common non-E-number flags
  const it = (ingredientsText || "").toLowerCase();
  for (const key of ["high-fructose corn syrup", "hydrogenated oil", "palm oil"]) {
    if (it.includes(key) && !seen.has(key)) {
      results.push({ code: null, ...ADDITIVE_INFO[key] });
      seen.add(key);
    }
  }

  // Sort by severity — warning first
  const order = { warning: 0, caution: 1, info: 2 };
  results.sort((a, b) => (order[a.level] ?? 3) - (order[b.level] ?? 3));

  return results;
}

/** Return true if any warning-level flag exists (for showing a chip). */
export function hasNotableWarning(additives = [], ingredientsText = "") {
  return getAdditiveWarnings(additives, ingredientsText).some(w => w.level === "warning");
}

/** Nutri-Score helper — returns {label, colorClass} */
export const NUTRISCORE_META = {
  A: { label: "Excellent", color: "#046a38", bg: "bg-green-600" },
  B: { label: "Good",      color: "#84bd00", bg: "bg-lime-500" },
  C: { label: "Fair",      color: "#ffd100", bg: "bg-yellow-400 text-gray-900" },
  D: { label: "Poor",      color: "#ff8300", bg: "bg-orange-500" },
  E: { label: "Very Poor", color: "#e63312", bg: "bg-red-600" },
};

/** NOVA classification meta */
export const NOVA_META = {
  1: { label: "Unprocessed", desc: "Whole foods, minimally processed",              bg: "bg-green-600" },
  2: { label: "Ingredients",  desc: "Culinary ingredients like oil, salt, sugar",   bg: "bg-lime-500" },
  3: { label: "Processed",    desc: "Simple processing (canning, cheese-making)",   bg: "bg-orange-500" },
  4: { label: "Ultra-Proc.",  desc: "Ultra-processed formulations with additives",  bg: "bg-red-600" },
};

/** Eco-Score meta */
export const ECOSCORE_META = {
  A: { label: "Very low environmental impact", bg: "bg-green-600" },
  B: { label: "Low impact",                    bg: "bg-lime-500" },
  C: { label: "Moderate impact",               bg: "bg-yellow-400 text-gray-900" },
  D: { label: "High impact",                   bg: "bg-orange-500" },
  E: { label: "Very high impact",              bg: "bg-red-600" },
};
