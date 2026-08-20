// Curated tile packs — apply one and get 4-6 pre-configured notes
// dropped straight into your library.
//
// Each pack has: id, name, tagline, accent color, notes[]. Every note is a
// tile template (title, content, color, icon, background, [pinned]).

// ---- Reusable background helpers (keeps the data compact) ---------------
const G = {
  ocean:      "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
  forest:     "linear-gradient(135deg, #10b981 0%, #064e3b 100%)",
  mint:       "linear-gradient(135deg, #86efac 0%, #059669 100%)",
  sunset:     "linear-gradient(135deg, #f97316 0%, #db2777 100%)",
  peach:      "linear-gradient(135deg, #fde68a 0%, #fb7185 100%)",
  ember:      "linear-gradient(135deg, #7f1d1d 0%, #f59e0b 100%)",
  aurora:     "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)",
  nightfall:  "linear-gradient(135deg, #1e293b 0%, #7c3aed 100%)",
  cosmic:     "linear-gradient(135deg, #0f172a 0%, #ec4899 100%)",
  roseGold:   "linear-gradient(135deg, #fbcfe8 0%, #be123c 100%)",
  slate:      "linear-gradient(135deg, #334155 0%, #0f172a 100%)",
  amber:      "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
  spring:     "linear-gradient(135deg, #a3e635 0%, #16a34a 100%)",
  midnight:   "linear-gradient(135deg, #0f172a 0%, #1e40af 100%)",
  wine:       "linear-gradient(135deg, #7f1d1d 0%, #4c1d95 100%)",
  // Luxury gradients — used by the Restaurants Galore companion tiles
  champagne:  "linear-gradient(135deg, #fef3c7 0%, #b45309 100%)",
  truffle:    "linear-gradient(135deg, #3f2412 0%, #d4a373 100%)",
  bordeaux:   "linear-gradient(135deg, #4a0404 0%, #b91c1c 100%)",
};
const grad = (v) => ({ type: "gradient", value: v });
const solid = (v) => ({ type: "color", value: v });

export const TILE_PACKS = [
  // ---- Restaurants Galore™ (opens the dedicated dashboard) ----
  {
    id: "restaurants-galore",
    name: "Restaurants Galore™",
    tagline: "Complete dining organizer — restaurants, menus, orders, reviews, budget & smart insights.",
    accent: "#f59e0b",
    notes: [
      {
        title: "Restaurants Galore",
        content: "Complete offline restaurant organizer.\n\n• Restaurant directory with hours, phones, amenities\n• Menu tracking with price history\n• Order history + tip calculator + split bill\n• Reviews with 11 rating metrics\n• Delivery tracker + spending center\n• Coupons, favorite meals, voice journal\n\nTap this tile to open the Restaurants Galore dashboard.",
        color: "amber",
        icon: "utensils",
        background: grad(G.amber),
        category: "Restaurants",
        pinned: true,
        // Tapping this tile bypasses the note editor and jumps straight
        // into the full Restaurants Galore workspace.
        special_action: "open_restaurants_galore",
      },
      {
        title: "Tonight's Pick",
        content: "Where:\nTime:\nWho's coming:\nReservation #:\nDress code:\n\nWhy this spot tonight:\n",
        color: "orange", icon: "Utensils",
        background: grad(G.ember),
        category: "Restaurants",
      },
      {
        title: "Restaurant Wish List",
        content: "🥇 Top of the list:\n- \n- \n- \n\n🗓  Waiting for the right occasion:\n- \n\n💡 Recommended by:\n- \n",
        color: "cyan", icon: "MapPin",
        background: grad(G.aurora),
        category: "Restaurants",
      },
      {
        title: "Date Night",
        content: "Occasion:\nRestaurant:\nReservation:\nDress code:\n\n🌹 Little touches:\n- Flowers?\n- Playlist for the drive?\n- Dessert reservation elsewhere?\n\nBackup plan:\n",
        color: "pink", icon: "Heart",
        background: grad(G.roseGold),
        category: "Restaurants",
      },
      {
        title: "Chef's Table",
        content: "Restaurant:\nChef:\nSignature dish:\n\n⭐ What made it unforgettable:\n\n📸 Photo taken? y/n\n💰 Worth the price? y/n\n🔁 Return-worthy? y/n\n",
        color: "purple", icon: "ChefHat",
        background: grad(G.wine),
        category: "Restaurants",
      },
      {
        title: "Cravings Board",
        content: "🍜 Mood right now:\n\nDishes calling my name:\n- \n- \n- \n\nWhere I could get it:\n- \n- \n\nCraving-crusher of the week:\n",
        color: "orange", icon: "Flame",
        background: grad(G.sunset),
        category: "Restaurants",
      },
      {
        title: "Group Dinner",
        content: "Occasion:\nDate & time:\nHead count:\nBudget / person:\n\n🍽 Restaurant:\nMenu preview link:\nDietary needs to flag:\n\n🎁 Gift or card needed? y/n\n👣 Who's driving / meeting there:\n",
        color: "orange", icon: "Users",
        background: grad(G.peach),
        category: "Restaurants",
      },
      {
        title: "Wine & Pairings",
        content: "🍷 Bottle / glass:\nRestaurant:\nPaired with:\n\nTasting notes:\n- Nose:\n- Palate:\n- Finish:\n\n⭐ 1-5:\n💰 Price:\n🔁 Would order again?\n",
        color: "purple", icon: "Wine",
        background: grad(G.bordeaux),
        category: "Restaurants",
      },
      {
        title: "Signature Dish Log",
        content: "🍽 Dish name:\nRestaurant:\nDate tried:\n\n📸 Photo? y/n\n💫 First-bite reaction:\n\nHow it compares to memory:\n\n⭐ Rating: /10\n🔁 Order again? y/n\n",
        color: "amber", icon: "Award",
        background: grad(G.champagne),
        category: "Restaurants",
      },
      {
        title: "Special Occasions",
        content: "🎂 Birthdays:\n- Who / when / their favourite spot\n\n💍 Anniversaries:\n- \n\n🏆 Big wins to celebrate:\n- Promotions\n- Milestones\n- Just because\n\n📞 Reservations to book ahead:\n",
        color: "pink", icon: "Sparkles",
        background: grad(G.cosmic),
        category: "Restaurants",
      },
      {
        title: "Photo Journal",
        content: "📸 Attach dish photos to this tile from the paperclip icon.\n\nFor each shot:\n• Restaurant:\n• Dish:\n• Date:\n• One-line reaction:\n\n(Tip: enable 'Full Screen' view to browse photos like a gallery.)\n",
        color: "pink", icon: "Camera",
        background: grad(G.roseGold),
        category: "Restaurants",
      },
      {
        title: "Menu Snapshot Gallery",
        content: "📷 Snap menu boards, printed menus, chalkboards, seasonal specials — attach them to this tile.\n\nWhy this rocks:\n• Compare prices between visits\n• Remember dishes you meant to try\n• Rediscover seasonal-only items\n\nRestaurant tag per photo:\n• \n• \n",
        color: "orange", icon: "BookOpen",
        background: grad(G.truffle),
        category: "Restaurants",
      },
      {
        title: "Delivery Rundown",
        content: "🛵 Latest orders:\n\nDate:\nApp used (DoorDash / UberEats / Grubhub / other):\nRestaurant:\nDishes:\nSubtotal / Tip / Fee / Total:\n\nDelivery quality:\n• On-time? y/n\n• Temperature on arrival:\n• Packaging:\n\n🔁 Order again? y/n\n",
        color: "cyan", icon: "Truck",
        background: grad(G.midnight),
        category: "Restaurants",
      },
      {
        title: "Loyalty & Rewards",
        content: "🎁 Track punch cards, apps, points:\n\nRestaurant:\nProgram / app:\nCurrent balance:\nExpires:\n\n💡 Freebies unlocked so far:\n- \n\n🚀 Best redemptions this year:\n- \n",
        color: "lime", icon: "Ticket",
        background: grad(G.spring),
        category: "Restaurants",
      },
      {
        title: "Coffee & Cafés",
        content: "☕ Café:\nOrder that never fails:\nBarista tip? y/n\n\n💡 Discovery of the month:\n\n🥐 Pairs well with:\n\n📶 Work-friendly? (wifi / seating / vibe):\n\n⭐ 1-5:\n",
        color: "amber", icon: "Coffee",
        background: grad(G.truffle),
        category: "Restaurants",
      },
    ],
  },
  // ---- Personal Productivity ----
  {
    id: "fitness-journey", name: "Fitness Journey", accent: "#10b981",
    tagline: "Workout, meal prep, hydration, and rest — all in one place.",
    notes: [
      { title: "Workout Log", content: "Warmup:\n\nMain:\n\nCool down:\n",   color: "cyan",   icon: "Dumbbell",    background: grad(G.forest), category: "Fitness", pinned: true },
      { title: "Meal Prep",   content: "Breakfast:\nLunch:\nDinner:\nSnacks:\n", color: "orange", icon: "Utensils", background: grad(G.sunset), category: "Fitness" },
      { title: "Hydration",   content: "Goal: 8 glasses\n\n□ □ □ □ □ □ □ □", color: "cyan",   icon: "Droplet",     background: grad(G.ocean),  category: "Fitness" },
      { title: "Rest Day",    content: "Stretch:\nSleep target:\nMobility:\n", color: "purple", icon: "Moon",       background: grad(G.nightfall), category: "Fitness" },
      { title: "Progress",    content: "Weight:\nMeasurements:\nNotes:\n",   color: "lime",   icon: "TrendingUp",   background: grad(G.mint),   category: "Fitness" },
    ],
  },
  {
    id: "meal-planner", name: "Meal Planner", accent: "#f59e0b",
    tagline: "Weekly menu, grocery list, recipes and takeout log.",
    notes: [
      { title: "This Week's Menu", content: "Mon:\nTue:\nWed:\nThu:\nFri:\nSat:\nSun:\n", color: "orange", icon: "Calendar",   background: grad(G.sunset), category: "Food", pinned: true },
      { title: "Grocery List",     content: "- \n- \n- ",                       color: "lime",   icon: "ShoppingCart", background: grad(G.mint),   category: "Food" },
      { title: "Favourite Recipes",content: "Recipe:\nIngredients:\n- \n\nSteps:\n1. ", color: "orange", icon: "ChefHat", background: grad(G.peach), category: "Food" },
      { title: "Takeout Log",      content: "Where:\nWhat:\nRating:\n",         color: "orange", icon: "Pizza",   background: solid("#ea580c"), category: "Food" },
    ],
  },
  {
    id: "deep-work", name: "Deep Work", accent: "#6366f1",
    tagline: "Focus blocks, weekly goals, ideas capture, learning.",
    notes: [
      { title: "Weekly Goals",   content: "1. \n2. \n3. \n",                 color: "purple", icon: "Target",       background: grad(G.aurora),    category: "Work", pinned: true },
      { title: "Focus Block",    content: "What:\nDuration:\nWhat done:\n",  color: "cyan",   icon: "Laptop",       background: solid("#4f46e5"),  category: "Work" },
      { title: "Ideas Inbox",    content: "- \n- \n- ",                      color: "orange", icon: "Lightbulb",    background: grad(G.peach),     category: "Ideas" },
      { title: "Reading List",   content: "Book:\nAuthor:\nWhy:\n",          color: "purple", icon: "Book",         background: solid("#4f46e5"),  category: "Learning" },
      { title: "Learning Log",   content: "Topic:\nKey takeaway:\n",         color: "cyan",   icon: "GraduationCap",background: grad(G.ocean),     category: "Learning" },
    ],
  },
  {
    id: "daily-life", name: "Daily Life", accent: "#ec4899",
    tagline: "Habits, budget, chores, and a home for random ideas.",
    notes: [
      { title: "Today",     content: "Top 3:\n1. \n2. \n3. \n\nOther:\n- ", color: "orange", icon: "Star",   background: grad(G.peach),   category: "Daily", pinned: true },
      { title: "Budget",    content: "Income:\nFixed:\nVariable:\nSavings:\n", color: "lime", icon: "Wallet", background: grad(G.mint),    category: "Money" },
      { title: "Chores",    content: "- \n- \n- ",                          color: "cyan",   icon: "Trash2", background: solid("#0d9488"), category: "Home" },
      { title: "Reminders", content: "- \n- \n- ",                          color: "orange", icon: "Bell",   background: solid("#ea580c"), category: "Daily" },
      { title: "Journal",   content: "Today I:\nGrateful for:\n",           color: "pink",   icon: "Heart",  background: grad(G.roseGold),category: "Personal" },
    ],
  },

  // ---- Travel & Adventure ----
  {
    id: "great-outdoors", name: "The Great Outdoors", accent: "#059669",
    tagline: "Hiking, camping, wildlife spotting and trail logs.",
    notes: [
      { title: "Trip Plan",     content: "Location:\nDates:\nWho's coming:\n", color: "lime",  icon: "Compass",  background: grad(G.forest), category: "Outdoors", pinned: true },
      { title: "Packing List",  content: "- Tent\n- Sleeping bag\n- Cookset\n- First aid\n- Layers\n- Water filter\n", color: "cyan", icon: "Luggage", background: grad(G.forest), category: "Outdoors" },
      { title: "Trail Log",     content: "Trail:\nDistance:\nElevation:\nHighlights:\n",     color: "orange", icon: "MapPin",   background: grad(G.ember),  category: "Outdoors" },
      { title: "Wildlife Spotted", content: "Species:\nWhere:\nBehaviour:\n",                color: "lime",  icon: "Bird",      background: grad(G.mint),   category: "Outdoors" },
      { title: "Weather Watch", content: "Forecast:\nGear adjustments:\n",    color: "cyan",  icon: "CloudSun", background: grad(G.ocean),  category: "Outdoors" },
    ],
  },
  {
    id: "road-trip", name: "Road Trip", accent: "#f97316",
    tagline: "Route, stops, playlist, snacks and emergency kit.",
    notes: [
      { title: "Route",        content: "Start:\nEnd:\nDistance:\nDays:\n",   color: "orange", icon: "Route",     background: grad(G.sunset), category: "Travel", pinned: true },
      { title: "Stops",        content: "- \n- \n- ",                        color: "cyan",   icon: "MapPin",    background: grad(G.ocean),  category: "Travel" },
      { title: "Road Playlist",content: "- \n- \n- ",                        color: "pink",   icon: "Music",     background: grad(G.cosmic), category: "Travel" },
      { title: "Snacks",       content: "- Water\n- Trail mix\n- Fruit\n- ", color: "orange", icon: "Apple",     background: grad(G.mint),   category: "Travel" },
      { title: "Emergency Kit",content: "- Spare tire tools\n- Jumper cables\n- Flashlight\n- Blanket\n- First aid\n", color: "pink", icon: "LifeBuoy", background: grad(G.ember), category: "Travel" },
    ],
  },
  {
    id: "hunting-fishing", name: "Hunting & Fishing", accent: "#065f46",
    tagline: "Gear, tags, hot spots, catch log and camp recipes.",
    notes: [
      { title: "Gear Checklist", content: "- License / Tags\n- Ammo / Tackle\n- Knife\n- Cooler\n- Waders / Camo\n", color: "lime",   icon: "Crosshair", background: grad(G.forest), category: "Outdoors", pinned: true },
      { title: "License & Tags", content: "Type:\nSeason:\nExpires:\n",       color: "orange", icon: "Ticket",    background: grad(G.ember),  category: "Outdoors" },
      { title: "Spots",          content: "Name:\nGPS:\nBest time:\n",       color: "cyan",   icon: "MapPin",    background: grad(G.ocean),  category: "Outdoors" },
      { title: "Catch Log",      content: "Date:\nSpecies:\nSize / Weight:\nBait / Lure:\n", color: "cyan", icon: "Fish", background: grad(G.ocean), category: "Outdoors" },
      { title: "Camp Recipes",   content: "Recipe:\nIngredients:\n- \n\nSteps:\n1. ", color: "orange", icon: "ChefHat", background: grad(G.ember), category: "Outdoors" },
    ],
  },
  {
    id: "sightseeing", name: "Sightseeing", accent: "#a855f7",
    tagline: "Landmarks, tickets, photo spots and reviews.",
    notes: [
      { title: "Must-See List",  content: "- \n- \n- ",                       color: "purple", icon: "Landmark", background: grad(G.aurora), category: "Travel", pinned: true },
      { title: "Tickets & Booking", content: "Attraction:\nDate:\nConfirmation #:\nCost:\n", color: "orange", icon: "Ticket", background: grad(G.sunset), category: "Travel" },
      { title: "Photo Spots",    content: "Location:\nBest light:\nAngle:\n", color: "pink",   icon: "Camera",  background: grad(G.cosmic), category: "Travel" },
      { title: "Local Eats",     content: "Restaurant:\nDish:\nRating:\n",    color: "orange", icon: "Utensils",background: grad(G.peach),  category: "Travel" },
      { title: "Trip Notes",     content: "Highlights:\nSurprises:\n",        color: "cyan",   icon: "FileText",background: grad(G.ocean),  category: "Travel" },
    ],
  },
  {
    id: "bed-and-breakfast", name: "Bed & Breakfast", accent: "#c026d3",
    tagline: "Reservation, host contact, amenities and rating.",
    notes: [
      { title: "Reservation",   content: "B&B name:\nDates:\nConfirmation #:\nPrice/night:\n", color: "pink", icon: "BedDouble", background: grad(G.roseGold), category: "Lodging", pinned: true },
      { title: "Host Contact",  content: "Name:\nPhone:\nEmail:\nAddress:\n", color: "cyan",   icon: "Phone",    background: grad(G.ocean),  category: "Lodging" },
      { title: "Amenities",     content: "- WiFi:\n- Breakfast:\n- Parking:\n- Pool / Spa:\n", color: "purple", icon: "Coffee", background: grad(G.aurora), category: "Lodging" },
      { title: "Local Tips",    content: "Restaurants:\nWalks:\nMarkets:\n", color: "orange", icon: "MapPin",   background: grad(G.peach),  category: "Lodging" },
      { title: "Rating",        content: "Overall:\nCleanliness:\nHost:\nWould return?:\n", color: "orange", icon: "Star", background: grad(G.sunset), category: "Lodging" },
    ],
  },
  {
    id: "airbnb", name: "Airbnb Stay", accent: "#e11d48",
    tagline: "Booking, house rules, check-in, host and rating.",
    notes: [
      { title: "Booking",       content: "Property:\nDates:\nConfirmation #:\nTotal:\n", color: "pink", icon: "Home", background: grad(G.roseGold), category: "Lodging", pinned: true },
      { title: "Check-in Info", content: "Address:\nAccess code:\nCheck-in:\nCheck-out:\n", color: "purple", icon: "Key", background: grad(G.aurora), category: "Lodging" },
      { title: "House Rules",   content: "- Quiet hours:\n- Pets:\n- Smoking:\n- Guests:\n", color: "orange", icon: "ClipboardList", background: grad(G.ember), category: "Lodging" },
      { title: "Host Contact",  content: "Name:\nPhone:\nMessage log:\n",     color: "cyan",   icon: "Phone",    background: grad(G.ocean),  category: "Lodging" },
      { title: "Rating & Review", content: "Stars:\nHighlights:\nIssues:\n", color: "orange", icon: "Star",     background: grad(G.sunset), category: "Lodging" },
    ],
  },
  {
    id: "passport-docs", name: "Passport & Travel Docs", accent: "#0369a1",
    tagline: "Passport #, visas, insurance, emergency contacts.",
    notes: [
      { title: "Passport",         content: "Number:\nIssued:\nExpires:\nCountry:\n", color: "cyan", icon: "BookOpen", background: grad(G.midnight), category: "Travel", pinned: true },
      { title: "Visas",            content: "Country:\nType:\nExpires:\n",           color: "purple", icon: "Stamp",    background: grad(G.aurora), category: "Travel" },
      { title: "Travel Insurance", content: "Provider:\nPolicy #:\nCoverage:\nEmergency #:\n", color: "lime", icon: "ShieldCheck", background: grad(G.mint), category: "Travel" },
      { title: "Emergency Contacts", content: "Family:\nEmbassy:\nBank card block #:\n", color: "pink", icon: "PhoneCall", background: grad(G.roseGold), category: "Travel" },
      { title: "Document Copies",  content: "Where stored (cloud / physical):\n\nID scans:\nCredit card copies:\n", color: "orange", icon: "Copy", background: grad(G.ember), category: "Travel" },
    ],
  },

  // ---- Health & Wellness ----
  {
    id: "health-wellness", name: "Health & Wellness", accent: "#dc2626",
    tagline: "Sleep, rest, diet, vitamins and doctor contacts.",
    notes: [
      { title: "Sleep Log",        content: "Bed:\nWake:\nQuality (1-10):\nDreams:\n", color: "purple", icon: "Moon",      background: grad(G.nightfall), category: "Health", pinned: true },
      { title: "Proper Rest",      content: "Naps:\nDeep breaths done:\nScreen-off time:\n", color: "cyan", icon: "Sofa", background: grad(G.ocean), category: "Health" },
      { title: "Dieting",          content: "Plan:\nCalorie target:\nDaily log:\n", color: "orange", icon: "Apple",     background: grad(G.mint),      category: "Health" },
      { title: "Vitamins",         content: "Morning:\n- \n\nEvening:\n- ",         color: "lime",   icon: "Pill",      background: grad(G.spring),    category: "Health" },
      { title: "Doctors & Meds",   content: "PCP:\nSpecialist:\nCurrent Rx:\n",     color: "pink",   icon: "Stethoscope",background: grad(G.roseGold), category: "Health" },
    ],
  },
  {
    id: "mental-health", name: "Mental Health", accent: "#7c3aed",
    tagline: "Mood, meditation, gratitude, therapy notes.",
    notes: [
      { title: "Mood Journal",  content: "How I feel (1-10):\nWhy:\n",         color: "purple", icon: "Smile",    background: grad(G.aurora),  category: "Wellness", pinned: true },
      { title: "Meditation",    content: "Duration:\nType:\nHow it went:\n", color: "cyan",   icon: "Flower",   background: grad(G.ocean),   category: "Wellness" },
      { title: "Gratitude",     content: "Three things I'm grateful for:\n1. \n2. \n3. ", color: "pink", icon: "Heart", background: grad(G.roseGold), category: "Wellness" },
      { title: "Therapy Notes", content: "Session:\nInsights:\nHomework:\n", color: "orange", icon: "Brain",    background: grad(G.peach),   category: "Wellness" },
      { title: "Triggers",      content: "What triggered me:\nHow I coped:\n", color: "lime",  icon: "AlertCircle", background: grad(G.mint), category: "Wellness" },
    ],
  },
  {
    id: "skincare", name: "Skincare Routine", accent: "#fb7185",
    tagline: "Morning, evening, products and skin log.",
    notes: [
      { title: "Morning Routine", content: "1. Cleanser\n2. Serum\n3. Moisturiser\n4. SPF\n", color: "orange", icon: "Sun",     background: grad(G.peach),    category: "Beauty", pinned: true },
      { title: "Evening Routine", content: "1. Cleanser\n2. Toner\n3. Treatment\n4. Moisturiser\n", color: "purple", icon: "Moon", background: grad(G.nightfall), category: "Beauty" },
      { title: "Products",        content: "Product:\nBrand:\nWhen:\nRating:\n",  color: "pink",   icon: "Sparkles", background: grad(G.roseGold), category: "Beauty" },
      { title: "Skin Log",        content: "Date:\nCondition:\nWhat changed:\n", color: "cyan",   icon: "Camera",   background: grad(G.aurora),   category: "Beauty" },
    ],
  },

  // ---- Home & Family ----
  {
    id: "new-home", name: "New Home", accent: "#0d9488",
    tagline: "Moving checklist, utilities, repairs and decor.",
    notes: [
      { title: "Moving Checklist", content: "- Hire movers\n- Change address\n- Pack essentials box\n- Utilities transfer\n- Update ID\n", color: "orange", icon: "Truck", background: grad(G.sunset), category: "Home", pinned: true },
      { title: "Utilities",        content: "Electric:\nGas:\nWater:\nInternet:\nAccount #s:\n", color: "cyan", icon: "Zap", background: grad(G.ocean), category: "Home" },
      { title: "Repairs / To-Do",  content: "- \n- \n- ",                            color: "orange", icon: "Wrench",   background: solid("#334155"), category: "Home" },
      { title: "Decor Wishlist",   content: "Room:\nItem:\nBudget:\n",              color: "pink",   icon: "Sofa",     background: grad(G.roseGold), category: "Home" },
      { title: "Neighbours",       content: "Names:\nContacts:\nNotes:\n",          color: "lime",   icon: "Users",    background: grad(G.mint),     category: "Home" },
    ],
  },
  {
    id: "baby-milestones", name: "Baby Milestones", accent: "#f472b6",
    tagline: "Firsts, feeding, sleep, doctor visits and photos.",
    notes: [
      { title: "Firsts",         content: "First smile:\nFirst word:\nFirst steps:\n", color: "pink", icon: "Baby", background: grad(G.roseGold), category: "Family", pinned: true },
      { title: "Feeding Log",    content: "Time:\nAmount:\nNotes:\n",                color: "orange", icon: "Milk",  background: grad(G.peach),   category: "Family" },
      { title: "Sleep Log",      content: "Nap 1:\nNap 2:\nNight:\n",                color: "purple", icon: "Moon",  background: grad(G.nightfall), category: "Family" },
      { title: "Doctor Visits",  content: "Date:\nWho:\nWeight / Height:\nVaccines:\n", color: "cyan", icon: "Stethoscope", background: grad(G.ocean), category: "Family" },
      { title: "Memory Photos",  content: "Moment:\nDate:\nStory:\n",                color: "pink",   icon: "Camera",background: grad(G.cosmic),  category: "Family" },
    ],
  },
  {
    id: "pet-care", name: "Pet Care", accent: "#84cc16",
    tagline: "Vet, food, meds, grooming and vaccinations.",
    notes: [
      { title: "Vet",            content: "Clinic:\nPhone:\nAddress:\nNext visit:\n", color: "cyan", icon: "Stethoscope", background: grad(G.ocean), category: "Pet", pinned: true },
      { title: "Food",           content: "Brand:\nAmount / day:\nTreats:\n",        color: "orange", icon: "Utensils",    background: grad(G.mint),  category: "Pet" },
      { title: "Meds",           content: "Rx:\nDose:\nSchedule:\n",                 color: "pink",   icon: "Pill",        background: grad(G.roseGold), category: "Pet" },
      { title: "Grooming",       content: "Bath:\nNails:\nBrush:\n",                 color: "lime",   icon: "Scissors",    background: grad(G.spring), category: "Pet" },
      { title: "Vaccinations",   content: "Rabies:\nDistemper:\nDue next:\n",       color: "purple", icon: "ShieldCheck", background: grad(G.aurora), category: "Pet" },
    ],
  },
  {
    id: "garden-journal", name: "Garden Journal", accent: "#65a30d",
    tagline: "Planting, watering, harvest and pest tracking.",
    notes: [
      { title: "Planting Log",   content: "Plant:\nDate:\nLocation:\n",              color: "lime",  icon: "Flower2",   background: grad(G.spring),  category: "Garden", pinned: true },
      { title: "Watering Sched", content: "Mon:\nWed:\nFri:\n",                      color: "cyan",  icon: "Droplet",   background: grad(G.ocean),   category: "Garden" },
      { title: "Harvest",        content: "Crop:\nAmount:\nDate:\n",                 color: "orange",icon: "Apple",     background: grad(G.sunset),  category: "Garden" },
      { title: "Pests & Issues", content: "Problem:\nAction taken:\n",              color: "pink",  icon: "Bug",       background: grad(G.roseGold),category: "Garden" },
    ],
  },

  // ---- Events & Occasions ----
  {
    id: "wedding-planning", name: "Wedding Planning", accent: "#f43f5e",
    tagline: "Guest list, vendors, budget, timeline and registry.",
    notes: [
      { title: "Guest List",     content: "Family:\nFriends:\n+1s:\nTotal:\n",       color: "pink",   icon: "Users",    background: grad(G.roseGold), category: "Wedding", pinned: true },
      { title: "Vendors",        content: "Venue:\nPhotographer:\nFlorist:\nCatering:\nDJ:\n", color: "purple", icon: "Briefcase", background: grad(G.aurora), category: "Wedding" },
      { title: "Budget",         content: "Total:\nPaid:\nRemaining:\n",             color: "lime",   icon: "Wallet",   background: grad(G.mint),     category: "Wedding" },
      { title: "Timeline",       content: "12 months:\n6 months:\n3 months:\n1 month:\nWeek of:\n", color: "orange", icon: "Calendar", background: grad(G.sunset), category: "Wedding" },
      { title: "Registry",       content: "Store:\nLink:\nItems added:\n",           color: "cyan",   icon: "Gift",     background: grad(G.ocean),    category: "Wedding" },
    ],
  },
  {
    id: "birthday-party", name: "Birthday Party", accent: "#fb923c",
    tagline: "Guests, menu, decor, gifts and playlist.",
    notes: [
      { title: "Guest List",     content: "- \n- \n- ",                              color: "pink",   icon: "Users",       background: grad(G.roseGold), category: "Events", pinned: true },
      { title: "Menu",           content: "Cake:\nAppetisers:\nMains:\nDrinks:\n", color: "orange", icon: "Utensils",    background: grad(G.sunset),   category: "Events" },
      { title: "Decor",          content: "Theme:\nColors:\nItems needed:\n",       color: "purple", icon: "Sparkles",    background: grad(G.aurora),   category: "Events" },
      { title: "Gifts",          content: "From:\nWhat:\nThank-you sent?:\n",       color: "lime",   icon: "Gift",        background: grad(G.mint),     category: "Events" },
      { title: "Playlist",       content: "- \n- \n- ",                              color: "cyan",   icon: "Music",       background: grad(G.cosmic),   category: "Events" },
    ],
  },
  {
    id: "holiday-planning", name: "Holiday Planning", accent: "#059669",
    tagline: "Gifts, menu, travel, decorations and cards.",
    notes: [
      { title: "Gift List",      content: "Person:\nIdea:\nBudget:\nBought?:\n",   color: "orange", icon: "Gift",        background: grad(G.sunset),   category: "Holidays", pinned: true },
      { title: "Menu",           content: "Starter:\nMain:\nSides:\nDessert:\n",   color: "orange", icon: "Utensils",    background: grad(G.ember),    category: "Holidays" },
      { title: "Travel",         content: "Where:\nWhen:\nStay:\nTransport:\n",   color: "cyan",   icon: "Plane",       background: grad(G.ocean),    category: "Holidays" },
      { title: "Decorations",    content: "Tree:\nOutside:\nTable:\n",             color: "pink",   icon: "Sparkles",    background: grad(G.roseGold), category: "Holidays" },
      { title: "Cards",          content: "List:\n- \n\nStamps ordered?:\n",       color: "purple", icon: "Mail",        background: grad(G.aurora),   category: "Holidays" },
    ],
  },

  // ---- Money & Career ----
  {
    id: "job-search", name: "Job Search", accent: "#0284c7",
    tagline: "Applications, interviews, contacts and offers.",
    notes: [
      { title: "Applications",   content: "Company:\nRole:\nDate:\nStatus:\n",    color: "cyan",   icon: "Briefcase",   background: grad(G.ocean),   category: "Career", pinned: true },
      { title: "Interviews",     content: "Company:\nDate:\nInterviewer:\nQuestions asked:\n", color: "purple", icon: "Users", background: grad(G.aurora), category: "Career" },
      { title: "Contacts",       content: "Name:\nCompany:\nEmail / LinkedIn:\nMet where:\n", color: "lime", icon: "PhoneCall", background: grad(G.mint), category: "Career" },
      { title: "Resume Notes",   content: "New wins to add:\nSkills to highlight:\n", color: "orange", icon: "FileText",   background: grad(G.sunset),  category: "Career" },
      { title: "Offers",         content: "Company:\nSalary:\nBenefits:\nDeadline:\n", color: "pink", icon: "Trophy",     background: grad(G.roseGold),category: "Career" },
    ],
  },
  {
    id: "side-hustle", name: "Side Hustle", accent: "#16a34a",
    tagline: "Ideas, clients, tasks, income and expenses.",
    notes: [
      { title: "Ideas Bank",     content: "- \n- \n- ",                              color: "orange", icon: "Lightbulb", background: grad(G.peach),  category: "Hustle", pinned: true },
      { title: "Clients",        content: "Name:\nProject:\nRate:\nNotes:\n",       color: "cyan",   icon: "Users",     background: grad(G.ocean),  category: "Hustle" },
      { title: "Tasks",          content: "- \n- \n- ",                              color: "purple", icon: "ListChecks", background: grad(G.aurora), category: "Hustle" },
      { title: "Income",         content: "Client:\nAmount:\nDate:\n",              color: "lime",   icon: "DollarSign",background: grad(G.mint),   category: "Money" },
      { title: "Expenses",       content: "What:\nAmount:\nDeductible?:\n",         color: "pink",   icon: "Receipt",   background: solid("#d97706"), category: "Money" },
    ],
  },
  {
    id: "investments", name: "Investment Portfolio", accent: "#0891b2",
    tagline: "Stocks, crypto, bonds, watchlist and performance.",
    notes: [
      { title: "Portfolio",      content: "Total value:\nAllocation:\n- Stocks:\n- Crypto:\n- Bonds:\n- Cash:\n", color: "lime", icon: "TrendingUp", background: grad(G.mint), category: "Money", pinned: true },
      { title: "Stocks",         content: "Ticker:\nShares:\nCost basis:\nCurrent:\n", color: "cyan",   icon: "LineChart", background: grad(G.ocean),  category: "Money" },
      { title: "Crypto",         content: "Coin:\nAmount:\nCost basis:\n",         color: "purple", icon: "Bitcoin",   background: grad(G.midnight), category: "Money" },
      { title: "Watchlist",      content: "Ticker:\nWhy:\nEntry target:\n",       color: "orange", icon: "Eye",       background: grad(G.sunset),   category: "Money" },
      { title: "Notes / Thesis", content: "Position:\nThesis:\nRisk:\n",           color: "pink",   icon: "FileText",  background: grad(G.roseGold), category: "Money" },
    ],
  },

  // ---- Learning ----
  {
    id: "reading-list", name: "Reading List", accent: "#7c3aed",
    tagline: "To-read, currently reading, reviews, quotes.",
    notes: [
      { title: "To Read",        content: "- \n- \n- ",                              color: "purple", icon: "BookOpen",   background: grad(G.aurora),   category: "Reading", pinned: true },
      { title: "Currently Reading", content: "Title:\nAuthor:\nProgress:\n",       color: "cyan",   icon: "Book",       background: grad(G.midnight), category: "Reading" },
      { title: "Reviews",        content: "Book:\nStars:\nOne-line:\n",             color: "orange", icon: "Star",       background: grad(G.sunset),   category: "Reading" },
      { title: "Favourite Quotes", content: "\"\" — Author, Book\n",                color: "pink",   icon: "Quote",      background: grad(G.roseGold), category: "Reading" },
      { title: "Wishlist",       content: "- \n- \n- ",                              color: "lime",   icon: "Gift",       background: grad(G.mint),     category: "Reading" },
    ],
  },
  {
    id: "language-learning", name: "Language Learning", accent: "#d946ef",
    tagline: "Vocab, grammar, phrases, practice log, resources.",
    notes: [
      { title: "Vocab",          content: "Word:\nMeaning:\nExample:\n",            color: "purple", icon: "Book",       background: grad(G.aurora),   category: "Language", pinned: true },
      { title: "Grammar Notes",  content: "Rule:\nExample:\nMy tries:\n",           color: "cyan",   icon: "PenTool",    background: grad(G.ocean),    category: "Language" },
      { title: "Phrases",        content: "- \n- \n- ",                              color: "orange", icon: "MessageCircle", background: grad(G.sunset), category: "Language" },
      { title: "Practice Log",   content: "Date:\nWhat I did:\nMinutes:\n",         color: "lime",   icon: "Activity",   background: grad(G.mint),     category: "Language" },
      { title: "Resources",      content: "App:\nPodcast:\nTeacher:\n",             color: "pink",   icon: "Headphones", background: grad(G.roseGold), category: "Language" },
    ],
  },
  {
    id: "course-study", name: "Course & Study", accent: "#4f46e5",
    tagline: "Notes, assignments, exams, deadlines, resources.",
    notes: [
      { title: "Course Overview",content: "Course:\nProfessor:\nSyllabus:\nGrade breakdown:\n", color: "purple", icon: "GraduationCap", background: grad(G.aurora), category: "Study", pinned: true },
      { title: "Lecture Notes",  content: "Date:\nTopic:\nKey points:\n",           color: "cyan",   icon: "FileText",   background: grad(G.ocean),    category: "Study" },
      { title: "Assignments",    content: "Title:\nDue:\nStatus:\n",                 color: "orange", icon: "ClipboardList", background: grad(G.sunset), category: "Study" },
      { title: "Exams",          content: "Exam:\nDate:\nTopics:\nStudy plan:\n",  color: "pink",   icon: "AlertCircle",background: grad(G.roseGold), category: "Study" },
      { title: "Resources",      content: "Books:\nLinks:\nStudy group:\n",         color: "lime",   icon: "Bookmark",   background: grad(G.mint),     category: "Study" },
    ],
  },

  // ---- Creative & Hobbies ----
  {
    id: "photography", name: "Photography", accent: "#f472b6",
    tagline: "Shoots, locations, gear, edits and portfolio.",
    notes: [
      { title: "Upcoming Shoots",content: "Client / Subject:\nDate:\nLocation:\n", color: "pink",   icon: "Camera",     background: grad(G.cosmic),   category: "Photo", pinned: true },
      { title: "Locations",      content: "Spot:\nBest light:\nAccess notes:\n",  color: "purple", icon: "MapPin",     background: grad(G.aurora),   category: "Photo" },
      { title: "Gear",           content: "Body:\nLenses:\nAccessories:\n",       color: "cyan",   icon: "Aperture",   background: grad(G.midnight), category: "Photo" },
      { title: "Edits To-Do",    content: "- \n- \n- ",                              color: "orange", icon: "PenTool",    background: grad(G.sunset),   category: "Photo" },
      { title: "Portfolio",      content: "Piece:\nUsed in:\nStory:\n",             color: "lime",   icon: "Image",      background: grad(G.mint),     category: "Photo" },
    ],
  },
  {
    id: "music-practice", name: "Music Practice", accent: "#a855f7",
    tagline: "Songs, scales, recordings, lessons and goals.",
    notes: [
      { title: "Current Songs",  content: "- \n- \n- ",                              color: "purple", icon: "Music",      background: grad(G.cosmic),   category: "Music", pinned: true },
      { title: "Scales & Warmups", content: "Warmup:\nScale of week:\n",           color: "cyan",   icon: "Activity",   background: grad(G.ocean),    category: "Music" },
      { title: "Recordings",     content: "Date:\nSong:\nWhat to fix:\n",           color: "pink",   icon: "Mic",        background: grad(G.roseGold), category: "Music" },
      { title: "Lessons",        content: "Teacher:\nDate:\nAssigned:\n",           color: "orange", icon: "GraduationCap", background: grad(G.sunset), category: "Music" },
      { title: "Goals",          content: "This month:\nThis year:\n",              color: "lime",   icon: "Target",     background: grad(G.mint),     category: "Music" },
    ],
  },
  {
    id: "diy-projects", name: "DIY Projects", accent: "#ca8a04",
    tagline: "Materials, steps, tools, progress and ideas.",
    notes: [
      { title: "Active Project",  content: "Name:\nWhy:\nDeadline:\n",              color: "orange", icon: "Wrench",     background: grad(G.sunset),   category: "DIY", pinned: true },
      { title: "Materials",       content: "- \n- \n- ",                              color: "cyan",   icon: "Package",    background: grad(G.ocean),    category: "DIY" },
      { title: "Steps",           content: "1. \n2. \n3. \n",                        color: "purple", icon: "ListChecks", background: grad(G.aurora),   category: "DIY" },
      { title: "Tools",           content: "Owned:\nNeed to buy / borrow:\n",       color: "lime",   icon: "Hammer",     background: grad(G.mint),     category: "DIY" },
      { title: "Ideas",           content: "- \n- \n- ",                              color: "pink",   icon: "Lightbulb",  background: grad(G.roseGold), category: "DIY" },
    ],
  },
  {
    id: "book-club", name: "Book Club", accent: "#c026d3",
    tagline: "Current book, discussion, members, meetings.",
    notes: [
      { title: "Current Read",    content: "Title:\nAuthor:\nProgress:\n",           color: "purple", icon: "BookOpen",   background: grad(G.aurora),   category: "Book Club", pinned: true },
      { title: "Discussion Notes",content: "Chapter:\nQuestions:\nMy takeaways:\n",  color: "cyan",   icon: "MessageCircle", background: grad(G.ocean), category: "Book Club" },
      { title: "Members",         content: "- \n- \n- ",                              color: "pink",   icon: "Users",      background: grad(G.roseGold), category: "Book Club" },
      { title: "Meetings",        content: "Next:\nWhere:\nHost:\n",                 color: "orange", icon: "Calendar",   background: grad(G.sunset),   category: "Book Club" },
      { title: "Reading Queue",   content: "1. \n2. \n3. \n",                        color: "lime",   icon: "ListChecks", background: grad(G.mint),     category: "Book Club" },
    ],
  },

  // ---- Recovery & Growth ----
  {
    id: "habit-tracker", name: "Habit Tracker", accent: "#0d9488",
    tagline: "Morning & evening routines, streaks, rewards.",
    notes: [
      { title: "Morning Routine", content: "1. \n2. \n3. \n4. \n",                   color: "orange", icon: "Sunrise",    background: grad(G.peach),    category: "Habits", pinned: true },
      { title: "Evening Routine", content: "1. \n2. \n3. \n4. \n",                   color: "purple", icon: "Moon",       background: grad(G.nightfall),category: "Habits" },
      { title: "Streak",          content: "Habit:\nCurrent streak:\nBest ever:\n", color: "lime",   icon: "Flame",      background: grad(G.ember),    category: "Habits" },
      { title: "Rewards",         content: "At 7 days:\nAt 30 days:\nAt 90 days:\n",color: "pink",   icon: "Trophy",     background: grad(G.roseGold), category: "Habits" },
    ],
  },
  {
    id: "sobriety-journey", name: "Sobriety Journey", accent: "#059669",
    tagline: "Streak, triggers, support, milestones, gratitude.",
    notes: [
      { title: "Day Count",       content: "Sober since:\nDays:\nOne day at a time.\n", color: "lime", icon: "Flame",     background: grad(G.mint),     category: "Recovery", pinned: true },
      { title: "Triggers",        content: "Trigger:\nHow I got through:\n",        color: "orange", icon: "AlertCircle",background: grad(G.sunset),   category: "Recovery" },
      { title: "Support Network", content: "Sponsor:\nMeetings:\nFriends:\n",       color: "cyan",   icon: "Users",      background: grad(G.ocean),    category: "Recovery" },
      { title: "Milestones",      content: "30 days:\n90 days:\n1 year:\n",         color: "pink",   icon: "Trophy",     background: grad(G.roseGold), category: "Recovery" },
      { title: "Gratitude",       content: "Today I'm grateful for:\n1. \n2. \n3. ",color: "purple", icon: "Heart",      background: grad(G.aurora),   category: "Recovery" },
    ],
  },
  // ---- Family / Household Chores ----
  (() => {
    const CHORE_TEMPLATE = [
      { title: "Mow the lawn",         frequency: "weekly",   offered: 10 },
      { title: "Clean your room",      frequency: "weekly",   offered: 5 },
      { title: "Take out kitchen garbage", frequency: "daily", offered: 1 },
      { title: "Clean the bathroom",   frequency: "weekly",   offered: 8 },
      { title: "Clean garage",         frequency: "monthly",  offered: 15 },
      { title: "Wash your clothes",    frequency: "weekly",   offered: 5 },
      { title: "Wash your bedding",    frequency: "bimonthly",offered: 4 },
      { title: "Wash the car",         frequency: "monthly",  offered: 12 },
      { title: "Rake the leaves",      frequency: "weekly",   offered: 8 },
      { title: "Clean the gutters",    frequency: "monthly",  offered: 20 },
      { title: "Do the dishes",        frequency: "daily",    offered: 2 },
      { title: "Sweep the porch",      frequency: "weekly",   offered: 3 },
    ];
    const seedChores = () => CHORE_TEMPLATE.map((c, i) => ({
      id: `chore-${i + 1}-${Math.random().toString(36).slice(2, 8)}`,
      title: c.title,
      frequency: c.frequency,   // daily | weekly | bimonthly | monthly
      status: "todo",           // todo | progress | done
      parent_approved: false,
      offered: c.offered,       // dollars promised
      paid: 0,                  // dollars actually paid
      notes: "",                // freeform: bonuses / penalties / vacation / holiday
      updated_at: null,
    }));
    const NAMES = [
      "Bailey", "Carter", "Hazel", "Mason",
      "Lawson", "Evy", "Josh", "Matt",
      "Child 9", "Child 10", "Child 11", "Child 12",
    ];
    return {
      id: "chores-list", name: "Daily Chores", accent: "#0ea5e9",
      tagline: "12 named chore lists — one per family member. Frequency, status, allowance & parent approval built in.",
      notes: NAMES.map((name, i) => ({
        title: `Chores list for ${name}`,
        content: `Assigned to ${name}. Tap any chore to update status, mark as paid, or add notes.`,
        color: (i % 6 === 0) ? "ocean" : (i % 6 === 1) ? "mint" : (i % 6 === 2) ? "peach" : (i % 6 === 3) ? "lavender" : (i % 6 === 4) ? "gold" : "sky",
        icon: "ClipboardList",
        background: grad(i % 2 === 0 ? G.ocean : G.spring),
        category: "PARENT",
        pinned: false,
        chores: seedChores(),
      })),
    };
  })(),

  // ============================================================
  // 🛒 Smart Grocery Cart — 15 department tiles + starter checklists.
  // Each note lives under the "Grocery" category so users can drag the
  // whole pack around as a unit. Uses the existing checklist system, so
  // ✓ / quantity / notes work immediately. Phase 2 will add a Shopping
  // Mode view on top of this same data.
  // ============================================================
  {
    id: "smart-grocery-cart",
    name: "🛒 Smart Grocery Cart",
    accent: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
    tagline: "A grocery organizer, pantry manager, meal planner and shopping assistant — all offline.",
    notes: (() => {
      // Shared shape: each department is a checklist-backed note with a
      // themed icon + gradient background and a couple of starter items
      // so the checklist UI is populated on first open.
      const dept = (title, icon, color, bg, seed = []) => ({
        title,
        content: "",
        color,
        icon,
        background: bg,
        category: "Grocery",
        tags: ["grocery"],
        checklist: seed.map((text, i) => ({
          id: `gc-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${i}`,
          text,
          done: false,
        })),
      });
      return [
        dept("Produce",         "Apple",         "lime",   grad(G.mint),      ["Apples", "Bananas", "Lettuce", "Tomatoes", "Onions"]),
        dept("Meat & Seafood",  "Beef",          "red",    solid("#dc2626"),  ["Chicken breast", "Ground beef", "Salmon"]),
        dept("Dairy",           "Milk",          "cyan",   grad(G.ocean),     ["Milk", "Eggs", "Butter", "Yogurt", "Cheese"]),
        dept("Frozen Foods",    "Snowflake",     "sky",    solid("#0ea5e9"),  ["Frozen vegetables", "Frozen pizza", "Ice cream"]),
        dept("Bakery",          "Croissant",     "orange", grad(G.peach),     ["Bread", "Bagels", "Muffins"]),
        dept("Pantry & Dry Goods","Wheat",       "amber",  solid("#d97706"),  ["Rice", "Pasta", "Flour", "Sugar", "Olive oil"]),
        dept("Snacks",          "Cookie",        "orange", grad(G.sunset),    ["Chips", "Crackers", "Granola bars", "Nuts"]),
        dept("Beverages",       "GlassWater",    "cyan",   grad(G.aurora),    ["Water", "Coffee", "Juice", "Soda"]),
        dept("Household Supplies","SprayCan",    "purple", solid("#7c3aed"),  ["Paper towels", "Trash bags", "Dish soap", "Laundry detergent"]),
        dept("Health & Beauty", "HeartPulse",    "pink",   solid("#ec4899"),  ["Shampoo", "Toothpaste", "Deodorant"]),
        dept("Baby",            "Baby",          "pink",   grad(G.peach),     ["Diapers", "Wipes", "Baby food"]),
        dept("Pet Supplies",    "Dog",           "amber",  solid("#b45309"),  ["Pet food", "Litter", "Treats"]),
        dept("Pharmacy",        "Pill",          "red",    solid("#e11d48"),  ["Pain reliever", "Bandages", "Vitamins"]),
        dept("Seasonal Items",  "PartyPopper",   "purple", grad(G.aurora),    ["Holiday decor", "Seasonal treats"]),
        dept("Miscellaneous",   "MoreHorizontal","slate",  solid("#475569"),  []),
      ];
    })(),
  },
];
