// Curated everyday-task icons (lucide-react names in PascalCase)
// Used by IconPicker and NoteTile
export const ICON_CATEGORIES = [
  {
    label: "Shopping",
    icons: [
      { name: "ShoppingCart", label: "Cart" },
      { name: "ShoppingBag", label: "Bag" },
      { name: "ClipboardList", label: "List" },
      { name: "Gift", label: "Gift" },
      { name: "Package", label: "Package" },
      { name: "Tag", label: "Tag" },
    ],
  },
  {
    label: "Health & Fitness",
    icons: [
      { name: "Pill", label: "Pill" },
      { name: "Dumbbell", label: "Gym" },
      { name: "Heart", label: "Heart" },
      { name: "Activity", label: "Activity" },
      { name: "Stethoscope", label: "Doctor" },
      { name: "Bike", label: "Bike" },
      { name: "Moon", label: "Sleep" },
      { name: "Droplet", label: "Hydrate" },
    ],
  },
  {
    label: "Home",
    icons: [
      { name: "Home", label: "Home" },
      { name: "Wrench", label: "Repair" },
      { name: "Lightbulb", label: "Idea" },
      { name: "Trash2", label: "Chores" },
      { name: "Sparkles", label: "Clean" },
      { name: "Flower2", label: "Garden" },
    ],
  },
  {
    label: "Work",
    icons: [
      { name: "Briefcase", label: "Work" },
      { name: "Laptop", label: "Laptop" },
      { name: "Calendar", label: "Calendar" },
      { name: "FileText", label: "Docs" },
      { name: "Users", label: "Team" },
      { name: "Target", label: "Goal" },
      { name: "Presentation", label: "Meeting" },
      { name: "PenTool", label: "Design" },
    ],
  },
  {
    label: "Food & Drink",
    icons: [
      { name: "Coffee", label: "Coffee" },
      { name: "Utensils", label: "Meal" },
      { name: "ChefHat", label: "Cook" },
      { name: "Apple", label: "Fruit" },
      { name: "Pizza", label: "Pizza" },
      { name: "Wine", label: "Wine" },
    ],
  },
  {
    label: "Travel",
    icons: [
      { name: "Plane", label: "Flight" },
      { name: "Car", label: "Drive" },
      { name: "MapPin", label: "Place" },
      { name: "Luggage", label: "Trip" },
      { name: "Compass", label: "Explore" },
      { name: "Camera", label: "Photo" },
    ],
  },
  {
    label: "Money",
    icons: [
      { name: "Wallet", label: "Wallet" },
      { name: "CreditCard", label: "Card" },
      { name: "PiggyBank", label: "Save" },
      { name: "DollarSign", label: "Money" },
      { name: "TrendingUp", label: "Invest" },
      { name: "Receipt", label: "Bills" },
    ],
  },
  {
    label: "Personal",
    icons: [
      { name: "Book", label: "Read" },
      { name: "Star", label: "Star" },
      { name: "Bell", label: "Reminder" },
      { name: "Music", label: "Music" },
      { name: "Gamepad2", label: "Play" },
      { name: "GraduationCap", label: "Study" },
      { name: "Cat", label: "Pet" },
      { name: "PartyPopper", label: "Party" },
    ],
  },
];

// Curated background presets — solid colors + gradients
export const BACKGROUND_COLORS = [
  { name: "Slate",     value: "#334155" },
  { name: "Rose",      value: "#e11d48" },
  { name: "Orange",    value: "#ea580c" },
  { name: "Amber",     value: "#d97706" },
  { name: "Emerald",   value: "#059669" },
  { name: "Teal",      value: "#0d9488" },
  { name: "Sky",       value: "#0284c7" },
  { name: "Indigo",    value: "#4f46e5" },
  { name: "Violet",    value: "#7c3aed" },
  { name: "Fuchsia",   value: "#c026d3" },
  { name: "Charcoal",  value: "#1c1917" },
  { name: "Bone",      value: "#f5f5f4" },
];

export const BACKGROUND_GRADIENTS = [
  { name: "Sunset",    value: "linear-gradient(135deg, #f97316 0%, #db2777 100%)" },
  { name: "Ocean",     value: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)" },
  { name: "Forest",    value: "linear-gradient(135deg, #10b981 0%, #064e3b 100%)" },
  { name: "Aurora",    value: "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)" },
  { name: "Peach",     value: "linear-gradient(135deg, #fde68a 0%, #fb7185 100%)" },
  { name: "Nightfall", value: "linear-gradient(135deg, #1e293b 0%, #7c3aed 100%)" },
  { name: "Ember",     value: "linear-gradient(135deg, #7f1d1d 0%, #f59e0b 100%)" },
  { name: "Mint",      value: "linear-gradient(135deg, #86efac 0%, #059669 100%)" },
  { name: "Rose Gold", value: "linear-gradient(135deg, #fbcfe8 0%, #be123c 100%)" },
  { name: "Cosmic",    value: "linear-gradient(135deg, #0f172a 0%, #ec4899 100%)" },
];

// Default background when none set (dark, subtle)
export const DEFAULT_BACKGROUND = {
  type: "gradient",
  value: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
};

// Flatten icons for name-lookup
export const ALL_ICONS = ICON_CATEGORIES.flatMap(c => c.icons);
