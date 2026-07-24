// Curated bundles ("tile packs") — apply one and get 4-6 pre-configured notes
// dropped straight into your library. Great for first-run onboarding and for
// people who want a whole system ready-to-go.
//
// Each pack has:
//   - id, name, tagline, category (the group these notes will be filed under)
//   - color hue for the preview swatch
//   - notes: array of note templates (title, content, color, icon, background, pinned?)
//
// The "Apply Pack" handler in NotesApp creates each note, keeping any user
// notes intact.

export const TILE_PACKS = [
  {
    id: "fitness-journey",
    name: "Fitness Journey",
    tagline: "Workout, meal prep, hydration, and rest — all in one place.",
    accent: "#10b981",
    notes: [
      { title: "Workout Log",  content: "Warmup:\n\nMain:\n\nCool down:\n",             color: "cyan",   icon: "Dumbbell",   background: { type: "gradient", value: "linear-gradient(135deg, #10b981 0%, #064e3b 100%)" }, category: "Fitness", pinned: true },
      { title: "Meal Prep",    content: "Breakfast:\nLunch:\nDinner:\nSnacks:\n",       color: "orange", icon: "Utensils",   background: { type: "gradient", value: "linear-gradient(135deg, #f97316 0%, #db2777 100%)" }, category: "Fitness" },
      { title: "Hydration",    content: "Goal: 8 glasses\n\n□ □ □ □ □ □ □ □",           color: "cyan",   icon: "Droplet",    background: { type: "gradient", value: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)" }, category: "Fitness" },
      { title: "Rest Day",     content: "Stretch:\nSleep target:\nMobility:\n",         color: "purple", icon: "Moon",       background: { type: "gradient", value: "linear-gradient(135deg, #1e293b 0%, #7c3aed 100%)" }, category: "Fitness" },
      { title: "Progress",     content: "Weight:\nMeasurements:\nNotes:\n",             color: "lime",   icon: "TrendingUp", background: { type: "gradient", value: "linear-gradient(135deg, #86efac 0%, #059669 100%)" }, category: "Fitness" },
    ],
  },
  {
    id: "meal-planner",
    name: "Meal Planner",
    tagline: "Weekly menu, grocery list, recipes and takeout log.",
    accent: "#f59e0b",
    notes: [
      { title: "This Week's Menu", content: "Mon:\nTue:\nWed:\nThu:\nFri:\nSat:\nSun:\n", color: "orange", icon: "Calendar", background: { type: "gradient", value: "linear-gradient(135deg, #f97316 0%, #db2777 100%)" }, category: "Food", pinned: true },
      { title: "Grocery List",     content: "- \n- \n- ",                                  color: "lime",   icon: "ShoppingCart", background: { type: "gradient", value: "linear-gradient(135deg, #86efac 0%, #059669 100%)" }, category: "Food" },
      { title: "Favourite Recipes",content: "Recipe:\nIngredients:\n- \n\nSteps:\n1. ",   color: "orange", icon: "ChefHat",  background: { type: "gradient", value: "linear-gradient(135deg, #fde68a 0%, #fb7185 100%)" }, category: "Food" },
      { title: "Takeout Log",      content: "Where:\nWhat:\nRating:\n",                    color: "orange", icon: "Pizza",    background: { type: "color", value: "#ea580c" }, category: "Food" },
    ],
  },
  {
    id: "deep-work",
    name: "Deep Work",
    tagline: "Focus blocks, weekly goals, ideas capture, learning.",
    accent: "#6366f1",
    notes: [
      { title: "Weekly Goals",   content: "1. \n2. \n3. \n",                              color: "purple", icon: "Target",   background: { type: "gradient", value: "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)" }, category: "Work", pinned: true },
      { title: "Focus Block",    content: "What:\nDuration:\nWhat done:\n",              color: "cyan",   icon: "Laptop",   background: { type: "color", value: "#4f46e5" }, category: "Work" },
      { title: "Ideas Inbox",    content: "- \n- \n- ",                                  color: "orange", icon: "Lightbulb",background: { type: "gradient", value: "linear-gradient(135deg, #fde68a 0%, #fb7185 100%)" }, category: "Ideas" },
      { title: "Reading List",   content: "Book:\nAuthor:\nWhy:\n",                      color: "purple", icon: "Book",     background: { type: "color", value: "#4f46e5" }, category: "Learning" },
      { title: "Learning Log",   content: "Topic:\nKey takeaway:\n",                     color: "cyan",   icon: "GraduationCap", background: { type: "gradient", value: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)" }, category: "Learning" },
    ],
  },
  {
    id: "daily-life",
    name: "Daily Life",
    tagline: "Habits, budget, chores, and a home for random ideas.",
    accent: "#ec4899",
    notes: [
      { title: "Today",          content: "Top 3:\n1. \n2. \n3. \n\nOther:\n- ",         color: "orange", icon: "Star",     background: { type: "gradient", value: "linear-gradient(135deg, #fde68a 0%, #fb7185 100%)" }, category: "Daily", pinned: true },
      { title: "Budget",         content: "Income:\nFixed:\nVariable:\nSavings:\n",      color: "lime",   icon: "Wallet",   background: { type: "gradient", value: "linear-gradient(135deg, #86efac 0%, #059669 100%)" }, category: "Money" },
      { title: "Chores",         content: "- \n- \n- ",                                  color: "cyan",   icon: "Trash2",   background: { type: "color", value: "#0d9488" }, category: "Home" },
      { title: "Reminders",      content: "- \n- \n- ",                                  color: "orange", icon: "Bell",     background: { type: "color", value: "#ea580c" }, category: "Daily" },
      { title: "Journal",        content: "Today I:\nGrateful for:\n",                   color: "pink",   icon: "Heart",    background: { type: "gradient", value: "linear-gradient(135deg, #fbcfe8 0%, #be123c 100%)" }, category: "Personal" },
    ],
  },
];
