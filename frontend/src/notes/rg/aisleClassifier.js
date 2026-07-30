// Restaurants Galore™ — Aisle Classifier
// Best-effort mapping from an ingredient string to a supermarket aisle so
// the Shopping List can group items for a faster shop. Uses substring
// keyword hits against a curated dictionary — falls back to "other".
//
// This is intentionally client-side and simple (no LLM) so it works offline
// and is instant. Users can move mis-classified items visually by their
// name; the classifier just makes the first pass useful.
const AISLES = [
  { key: "produce",   label: "Produce",   emoji: "🥬", keywords: ["apple","banana","orange","lemon","lime","grape","berry","strawberr","blueberr","raspberr","mango","pineapple","peach","pear","plum","melon","watermelon","kiwi","avocado","carrot","celery","onion","shallot","scallion","garlic","ginger","tomato","cucumber","zucchini","squash","pumpkin","pepper","bell pepper","chili","chile","jalapen","serrano","eggplant","aubergine","lettuce","spinach","kale","cabbage","chard","arugula","rocket","romaine","broccoli","cauliflow","asparagus","artichoke","bean sprout","mushroom","corn","potato","yam","sweet potato","radish","beet","leek","fennel","turnip","parsnip","herb","basil","cilantro","coriander","parsley","mint","thyme","rosemary","dill","chive","sage","tarragon"] },
  { key: "meat",      label: "Meat & Seafood", emoji: "🥩", keywords: ["chicken","beef","pork","lamb","turkey","duck","veal","bacon","sausage","ham","prosciutto","salami","chorizo","ground meat","mince","brisket","ribs","steak","fillet","filet","tenderloin","chop","cutlet","salmon","tuna","cod","tilapia","shrimp","prawn","crab","lobster","scallop","clam","mussel","oyster","anchov","sardine","mackerel","trout","fish"] },
  { key: "dairy",     label: "Dairy & Eggs", emoji: "🥛", keywords: ["milk","butter","cream","yogurt","yoghurt","cheese","cheddar","mozzarella","parmesan","feta","ricotta","gouda","swiss","provolone","brie","camembert","cottage","paneer","egg","eggs","tofu","tempeh","kefir","buttermilk"] },
  { key: "bakery",    label: "Bakery",    emoji: "🥖", keywords: ["bread","loaf","baguette","bun","roll","bagel","tortilla","wrap","pita","naan","brioche","challah","croissant","pastry","muffin","donut","doughnut","cake","cookie","biscuit","cracker"] },
  { key: "pantry",    label: "Pantry",    emoji: "🥫", keywords: ["flour","sugar","brown sugar","salt","pepper","oil","olive oil","vegetable oil","sesame oil","vinegar","soy sauce","fish sauce","hoisin","oyster sauce","worcestershire","ketchup","mustard","mayonnaise","mayo","honey","syrup","maple","jam","jelly","peanut butter","almond butter","tahini","stock","broth","bouillon","canned","tomato paste","tomato sauce","passata","beans","lentil","chickpea","garbanzo","black bean","kidney bean","pinto","rice","basmati","jasmine","arborio","quinoa","couscous","pasta","spaghetti","noodle","penne","rigatoni","fettuccine","lasagna","macaroni","udon","ramen","soba","dashi","miso","nori","kimchi","seaweed","coconut milk","coconut cream","almond milk","oat milk","cornstarch","corn starch","baking powder","baking soda","yeast","gelatin"] },
  { key: "spices",    label: "Spices & Seasonings", emoji: "🧂", keywords: ["cumin","paprika","turmeric","cinnamon","clove","cardamom","nutmeg","allspice","bay leaf","oregano","chili powder","chile powder","curry powder","garam masala","ras el hanout","zaatar","saffron","vanilla","cocoa","chocolate chip"] },
  { key: "beverages", label: "Beverages", emoji: "🥤", keywords: ["water","sparkling water","juice","orange juice","apple juice","soda","cola","beer","wine","sake","spirits","liquor","whiskey","vodka","gin","rum","tequila","coffee","tea","matcha","kombucha"] },
  { key: "frozen",    label: "Frozen",    emoji: "🧊", keywords: ["frozen","ice cream","sorbet","gelato","frozen peas","frozen berries","frozen fruit","edamame","frozen dumpling"] },
  { key: "household", label: "Household", emoji: "🧻", keywords: ["paper towel","napkin","foil","aluminum","plastic wrap","cling film","parchment","ziploc","zip loc","dish soap","detergent","sponge","trash bag"] },
];
const OTHER = { key: "other", label: "Other", emoji: "🛒" };

// Fast substring search — takes lowercased ingredient text, returns aisle key.
export function classifyAisle(name) {
  if (!name) return OTHER.key;
  const s = String(name).toLowerCase();
  for (const a of AISLES) {
    for (const kw of a.keywords) {
      if (s.includes(kw)) return a.key;
    }
  }
  return OTHER.key;
}

// Ordered list for UI grouping — "other" always last.
export const AISLE_ORDER = [...AISLES.map((a) => a.key), OTHER.key];

// Return {key,label,emoji} for a given aisle key.
export function aisleMeta(key) {
  return AISLES.find((a) => a.key === key) || OTHER;
}

// Return an ordered list of {key,label,emoji} — used by the aisle picker UI.
export function allAisles() {
  return [...AISLES, OTHER];
}
