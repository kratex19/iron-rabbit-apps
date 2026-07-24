// Smart presets that map an icon name -> a fully-populated note template.
// Used by "Quick Add" flow: tap an icon in the library and instantly get a
// ready-to-use note with title, seed content, color and background.
//
// Icons not listed here fall back to a generic title = icon label.
export const QUICK_ADD_PRESETS = {
  // Shopping
  ShoppingCart: { title: "Shopping List",  content: "- \n- \n- ",                       color: "orange", background: { type: "gradient", value: "linear-gradient(135deg, #f97316 0%, #db2777 100%)" }, category: "Shopping" },
  ShoppingBag:  { title: "Errands",        content: "- \n- \n- ",                       color: "orange", background: { type: "gradient", value: "linear-gradient(135deg, #fde68a 0%, #fb7185 100%)" }, category: "Shopping" },
  Gift:         { title: "Gift Ideas",     content: "For:\n\nIdeas:\n- ",               color: "pink",   background: { type: "gradient", value: "linear-gradient(135deg, #fbcfe8 0%, #be123c 100%)" }, category: "Personal" },

  // Health & Fitness
  Pill:        { title: "Medication",     content: "Name:\nDose:\nSchedule:\n",         color: "pink",   background: { type: "gradient", value: "linear-gradient(135deg, #fbcfe8 0%, #be123c 100%)" }, category: "Health" },
  Dumbbell:    { title: "Workout Log",    content: "Warmup:\n\nMain:\n\nCool down:\n",  color: "cyan",   background: { type: "gradient", value: "linear-gradient(135deg, #10b981 0%, #064e3b 100%)" }, category: "Fitness" },
  Heart:       { title: "Self-care",      content: "Today I feel:\n\nOne thing that helped:\n", color: "pink", background: { type: "gradient", value: "linear-gradient(135deg, #fbcfe8 0%, #be123c 100%)" }, category: "Wellness" },
  Stethoscope: { title: "Doctor Visit",   content: "Date:\nTime:\nDoctor:\nNotes:\n",    color: "pink",   background: { type: "gradient", value: "linear-gradient(135deg, #fbcfe8 0%, #be123c 100%)" }, category: "Health" },
  Moon:        { title: "Sleep Log",      content: "Went to bed:\nWoke up:\nQuality:\n", color: "purple", background: { type: "gradient", value: "linear-gradient(135deg, #1e293b 0%, #7c3aed 100%)" }, category: "Wellness" },
  Droplet:     { title: "Hydration",      content: "Goal: 8 glasses\n\n□ □ □ □ □ □ □ □", color: "cyan",   background: { type: "gradient", value: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)" }, category: "Health" },
  Bike:        { title: "Ride",           content: "Route:\nDistance:\nNotes:\n",       color: "lime",   background: { type: "gradient", value: "linear-gradient(135deg, #86efac 0%, #059669 100%)" }, category: "Fitness" },

  // Home
  Home:        { title: "Home",           content: "",                                   color: "purple", background: { type: "gradient", value: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" }, category: "Home" },
  Wrench:      { title: "Repair To-Do",   content: "- \n- \n- ",                        color: "orange", background: { type: "color", value: "#334155" }, category: "Home" },
  Lightbulb:   { title: "Idea",           content: "",                                   color: "orange", background: { type: "gradient", value: "linear-gradient(135deg, #fde68a 0%, #fb7185 100%)" }, category: "Ideas" },
  Trash2:      { title: "Chores",         content: "- \n- \n- ",                        color: "cyan",   background: { type: "color", value: "#0d9488" }, category: "Home" },
  Sparkles:    { title: "Clean Routine",  content: "Room:\nTasks:\n- ",                 color: "cyan",   background: { type: "gradient", value: "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)" }, category: "Home" },

  // Work
  Briefcase:   { title: "Work",           content: "",                                   color: "cyan",   background: { type: "gradient", value: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)" }, category: "Work" },
  Calendar:    { title: "Schedule",       content: "",                                   color: "purple", background: { type: "gradient", value: "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)" }, category: "Work" },
  FileText:    { title: "Docs",           content: "",                                   color: "cyan",   background: { type: "color", value: "#0284c7" }, category: "Work" },
  Users:       { title: "Team Meeting",   content: "Attendees:\n\nAgenda:\n\nAction Items:\n", color: "lime", background: { type: "gradient", value: "linear-gradient(135deg, #86efac 0%, #059669 100%)" }, category: "Work" },
  Target:      { title: "Goal",           content: "Deadline:\n\nSteps:\n1. \n2. \n3. ", color: "purple", background: { type: "gradient", value: "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)" }, category: "Goals" },
  Presentation:{ title: "Presentation",   content: "Topic:\nAudience:\nKey points:\n- ", color: "cyan",   background: { type: "gradient", value: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)" }, category: "Work" },
  PenTool:     { title: "Design Sketch",  content: "",                                   color: "pink",   background: { type: "gradient", value: "linear-gradient(135deg, #fbcfe8 0%, #be123c 100%)" }, category: "Design" },

  // Food & Drink
  Coffee:      { title: "Coffee Break",   content: "",                                   color: "orange", background: { type: "color", value: "#7c2d12" }, category: "Food" },
  Utensils:    { title: "Meal Plan",      content: "Breakfast:\nLunch:\nDinner:\n",     color: "orange", background: { type: "gradient", value: "linear-gradient(135deg, #f97316 0%, #db2777 100%)" }, category: "Food" },
  ChefHat:     { title: "Recipe",         content: "Ingredients:\n- \n\nSteps:\n1. ",   color: "orange", background: { type: "gradient", value: "linear-gradient(135deg, #fde68a 0%, #fb7185 100%)" }, category: "Recipes" },
  Apple:       { title: "Groceries",      content: "- \n- \n- ",                        color: "lime",   background: { type: "gradient", value: "linear-gradient(135deg, #86efac 0%, #059669 100%)" }, category: "Shopping" },
  Pizza:       { title: "Takeout",        content: "",                                   color: "orange", background: { type: "color", value: "#ea580c" }, category: "Food" },
  Wine:        { title: "Cellar",         content: "Bottle:\nYear:\nNotes:\n",           color: "pink",   background: { type: "color", value: "#7f1d1d" }, category: "Personal" },

  // Travel
  Plane:       { title: "Trip",           content: "Destination:\nDates:\nPacking:\n- ", color: "cyan",   background: { type: "gradient", value: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)" }, category: "Travel" },
  Car:         { title: "Drive",          content: "From:\nTo:\nStops:\n",              color: "purple", background: { type: "color", value: "#1c1917" }, category: "Travel" },
  MapPin:      { title: "Place",          content: "",                                   color: "orange", background: { type: "gradient", value: "linear-gradient(135deg, #fde68a 0%, #fb7185 100%)" }, category: "Travel" },
  Luggage:     { title: "Packing List",   content: "- Passport\n- Chargers\n- Meds\n- ", color: "purple", background: { type: "gradient", value: "linear-gradient(135deg, #1e293b 0%, #7c3aed 100%)" }, category: "Travel" },
  Compass:     { title: "Adventure",      content: "",                                   color: "lime",   background: { type: "gradient", value: "linear-gradient(135deg, #10b981 0%, #064e3b 100%)" }, category: "Travel" },
  Camera:      { title: "Photo Session",  content: "",                                   color: "pink",   background: { type: "gradient", value: "linear-gradient(135deg, #0f172a 0%, #ec4899 100%)" }, category: "Personal" },

  // Money
  Wallet:      { title: "Budget",         content: "Income:\nFixed:\nVariable:\n",       color: "lime",   background: { type: "gradient", value: "linear-gradient(135deg, #86efac 0%, #059669 100%)" }, category: "Money" },
  CreditCard:  { title: "Card Statement", content: "",                                   color: "cyan",   background: { type: "color", value: "#0284c7" }, category: "Money" },
  PiggyBank:   { title: "Savings Goal",   content: "Target:\nBy when:\nProgress:\n",    color: "pink",   background: { type: "gradient", value: "linear-gradient(135deg, #fbcfe8 0%, #be123c 100%)" }, category: "Goals" },
  DollarSign:  { title: "Expense",        content: "What:\nHow much:\nWho paid:\n",     color: "lime",   background: { type: "color", value: "#059669" }, category: "Money" },
  TrendingUp:  { title: "Investment",     content: "Ticker:\nBought at:\nTarget:\n",   color: "cyan",   background: { type: "gradient", value: "linear-gradient(135deg, #10b981 0%, #064e3b 100%)" }, category: "Money" },
  Receipt:     { title: "Bill",           content: "Vendor:\nAmount:\nDue:\n",           color: "orange", background: { type: "color", value: "#d97706" }, category: "Money" },

  // Personal
  Book:        { title: "Book",           content: "Title:\nAuthor:\nNotes:\n",         color: "purple", background: { type: "color", value: "#4f46e5" }, category: "Reading" },
  Star:        { title: "Favourite",      content: "",                                   color: "orange", background: { type: "gradient", value: "linear-gradient(135deg, #fde68a 0%, #fb7185 100%)" }, category: "Personal" },
  Bell:        { title: "Reminder",       content: "",                                   color: "orange", background: { type: "color", value: "#ea580c" }, category: "Personal" },
  Music:       { title: "Playlist",       content: "- \n- \n- ",                        color: "pink",   background: { type: "gradient", value: "linear-gradient(135deg, #0f172a 0%, #ec4899 100%)" }, category: "Music" },
  Gamepad2:    { title: "Games To Play",  content: "- \n- \n- ",                        color: "purple", background: { type: "gradient", value: "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)" }, category: "Personal" },
  GraduationCap:{title: "Study Session",  content: "Topic:\nGoals:\n- ",                color: "cyan",   background: { type: "gradient", value: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)" }, category: "Study" },
  Cat:         { title: "Pet",            content: "Name:\nCare:\nVet:\n",              color: "pink",   background: { type: "gradient", value: "linear-gradient(135deg, #fbcfe8 0%, #be123c 100%)" }, category: "Personal" },
  PartyPopper: { title: "Party Plan",     content: "Who:\nWhen:\nWhere:\nBring:\n",     color: "pink",   background: { type: "gradient", value: "linear-gradient(135deg, #f97316 0%, #db2777 100%)" }, category: "Events" },

  Activity:    { title: "Activity",       content: "",                                   color: "lime",   background: { type: "color", value: "#059669" }, category: "Fitness" },
  ClipboardList:{title: "Checklist",      content: "- \n- \n- ",                        color: "purple", background: { type: "color", value: "#4f46e5" }, category: "Tasks" },
  Package:     { title: "Package",        content: "From:\nTracking:\nExpected:\n",     color: "orange", background: { type: "color", value: "#d97706" }, category: "Personal" },
  Tag:         { title: "Wishlist",       content: "- \n- \n- ",                        color: "pink",   background: { type: "gradient", value: "linear-gradient(135deg, #fbcfe8 0%, #be123c 100%)" }, category: "Personal" },
  Laptop:      { title: "Deep Work",      content: "Focus block:\nWhat done:\n",        color: "cyan",   background: { type: "color", value: "#4f46e5" }, category: "Work" },
  Flower2:     { title: "Garden",         content: "Plant:\nCare:\n",                    color: "lime",   background: { type: "gradient", value: "linear-gradient(135deg, #86efac 0%, #059669 100%)" }, category: "Home" },
};

// Build a quick note object from an icon name; falls back gracefully.
export function presetForIcon(iconName, fallbackLabel) {
  const preset = QUICK_ADD_PRESETS[iconName];
  if (preset) return { ...preset, icon: iconName };
  return {
    title: fallbackLabel || "New Note",
    content: "",
    color: "purple",
    icon: iconName,
    background: { type: "gradient", value: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" },
    category: "",
  };
}
