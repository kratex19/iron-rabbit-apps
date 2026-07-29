# Restaurants Galore™ — Master Development Specification

> **Status:** Living specification. Every Emergent session that touches this pack MUST re-read this file first.
> **Last updated:** 2026-02-XX (initial spec adoption)

---

## Project Overview

Create a brand-new premium-quality Curated Tile Pack named **Restaurants Galore** for Iron Rabbit.

Restaurants Galore is a complete restaurant organizer, dining journal, food memory system, budget tracker, restaurant directory, menu organizer, review system, delivery tracker, restaurant discovery tool, and intelligent restaurant assistant.

Although this pack may eventually have premium features, it should initially be fully functional in the free version while being designed so additional premium capabilities can be added later without redesigning the database or user interface.

---

## Critical Design Requirements

**Do NOT redesign Iron Rabbit.** Preserve every aspect of the existing application including:

- Dashboard
- Existing tile design
- Existing animations
- Grid View
- List View
- Existing note system
- Existing drag-and-drop
- Existing lock system
- Existing themes
- Existing Moon Mode
- Existing Light Mode
- Existing Dark Mode
- Existing folders
- Existing batch commands
- Existing curated packs

Restaurants Galore must feel like it was part of Iron Rabbit from day one.

---

## Workspace Design

Restaurants Galore is a single Curated Tile Pack. It contains expandable workspace tiles. The workspace should smoothly expand from the selected tile rather than opening an entirely different page.

---

## Glass Workspace (optional)

Support Iron Rabbit's optional Glass Workspace.

**Requirements:** Frosted Glass · Background Blur · White Text · Rounded Corners · Soft Shadows · Thin White Border · Automatic Contrast Adjustment

**Settings:**
- View: Classic · Glass
- Blur: Off · Light · Medium · Heavy
- Transparency: 10% · 20% · 30% · 40%

If disabled the application should appear exactly as it does today.

---

## Restaurants Galore Dashboard

The dashboard becomes command central.

**Display:**
- Recently visited restaurants
- Favorite restaurants
- Restaurants nearby
- Monthly spending
- Yearly spending
- Average meal price
- Favorite meal
- Favorite dessert
- Favorite drink
- Average delivery time
- Restaurants needing reviews
- Coupons expiring soon
- Upcoming birthdays with restaurant suggestions
- Recently added restaurants
- Recently viewed menus
- Smart reminders
- Restaurant statistics

---

## Suggested Workspace Tiles

### Restaurant Directory
Unlimited restaurants. Store: Restaurant Name, Nickname, Category, Cuisine, Phone Numbers, Call Now, Website, Online Ordering, Email, Hours, Holiday Hours, Address, Parking Notes, Drive-Thru, Delivery, Pickup, Reservations, Outdoor Seating, Pet Friendly, Wheelchair Accessible, Kid Friendly, Notes, Favorite, Hidden, Archived.

### Maps & Navigation
Support Google Maps, Waze, Apple Maps. "Ask Every Time" or "Remember Default". Save favorite parking location.

### Menus
Unlimited menus. Categories: Breakfast, Lunch, Dinner, Kids, Desserts, Drinks, Seasonal, Limited Time, Specials, Happy Hour. Store: Price, Calories, Photo, Description, Availability, Discontinued, Price history.

### Favorite Meals
Remember: Meal, Restaurant, Drink, Dessert, Side, Sauces, Cooking preference, Custom requests (extra crispy, light salt, no onions, extra pickles, well done, medium rare, extra cheese). Remember exactly how the user likes every meal.

### Order History
Unlimited history. Remember: Date, Time, Order Number, Restaurant, Items, Subtotal, Tax, Tip, Delivery Fee, Discount, Coupon Used, Gift Card Used, Total, Who Paid, Split Bill, Payment Method, Receipt, Photo, Notes.

### Restaurant Reviews
Ratings: Food, Service, Cleanliness, Atmosphere, Noise, Portion Size, Parking, Value, Packaging, Accuracy, Overall. Five-star system.

### Delivery Tracker
Remember: Order Time, Driver Assigned, Driver Name, Delivery Time, Arrival Time, Minutes, Food Temperature (Hot/Warm/Cold), Packaging Quality, Order Accuracy, Driver Rating.

### Spending Center
Charts: Daily, Weekly, Monthly, Yearly. Average Bill, Average Tip, Most Expensive Meal, Cheapest Meal, Restaurant Rankings, Spending Trends.

### Tip Calculator
Buttons: 10%, 15%, 18%, 20%, 25%, Custom, Round Up, Round Down.

### Split Bill
Split equally, manually, or by percentage. Separate alcohol, separate dessert. Include tax/tip. Track who owes whom.

### Coupons & Rewards
Coupons, Promo Codes, Gift Cards, Reward Programs, Birthday Rewards, Expiration Alerts, Loyalty Numbers.

### Calendar
Restaurant Visits, Birthdays, Anniversaries, Special Occasions, Restaurant Memories, Holiday Dining.

### Nutrition
Calories, Protein, Fat, Carbs, Fiber, Sugar, Sodium. Vegetarian, Vegan, Keto, Gluten Free, Dairy Free. Food allergies.

### Photos
Meal Photos, Restaurant Photos, Receipts, Menus, Parking, Favorite Table, Family Photos.

### Voice Journal
Record voice notes. Auto-convert to searchable text. Examples: "The steak was perfect.", "Remember less salt.", "The fries were cold."

### Favorite Staff
Remember Favorite Cook, Favorite Server, Favorite Bartender, Manager. Personal notes.

### Wish List
Meals to try, Restaurants to visit, Vacation restaurants, TV restaurants, Celebrity chef restaurants.

### Smart Assistant
Intelligent reminders. Examples:
- "You rated this meal 5 stars."
- "You ordered this 7 times."
- "You usually visit Fridays."
- "You spent $520 here this year."
- "Average delivery is 23 minutes."
- "Prices increased $4."
- "Remember extra mushrooms."

### Family Dining
Family favorites, Kids favorites, Spouse favorites, Group orders, Birthday traditions, Holiday traditions.

### Emergency Information
Restaurants open late, 24-hour restaurants, nearest pharmacy, nearest grocery, nearest hospital.

### Recipe Recreation
Recreate favorite restaurant meals at home. Ingredients, instructions, shopping list, cooking notes, photos.

### Beverage Center
Coffee, Tea, Beer, Wine, Cocktails, Smoothies. Favorite drinks. Seasonal drinks.

### Dessert Center
Favorites, Seasonal, Birthday desserts, Ice cream, Cakes, Pies, Ratings.

### Search Center
Search absolutely everything: Restaurant, Meal, Ingredient, Receipt, Coupon, Photo, Date, Price, Voice note, Favorite, Cook, Server, Dessert, Drink.

### AI Restaurant Insights
Discover trends. Examples:
- Friday is your most common dining day.
- You save the most money using coupons on Tuesdays.
- Restaurant A has become slower.
- Restaurant B consistently has hotter food.
- You have spent more than expected this month.

---

## Backup
Support Iron Rabbit backup. Offline first. Cloud sync later.

## Performance
Extremely fast. Offline first. Smooth scrolling. Lazy loading. Minimal battery use. Optimized database. Tablet + phone support.

## Accessibility
Large text. Reduce motion. Automatic contrast. High visibility. Voice support. Screen readers.

---

## Future Expansion

Restaurants Galore should become the flagship Curated Tile Pack for Iron Rabbit.

Design everything so future premium updates can simply unlock new features rather than requiring redesigns.

Future packs such as **Automotive Galore, Camping Galore, Travel Galore, Medical Galore, Home Projects Galore, Finance Galore, Fishing Galore, RV Galore**, and many others should follow the same architecture.

Every curated pack should feel like its own complete application while remaining fully integrated into Iron Rabbit.

---

## Final Development Goal

Create the most complete offline restaurant management and dining companion available on any mobile platform while preserving Iron Rabbit's existing look, feel, speed, simplicity, and user experience.

The app should feel elegant, intuitive, organized, and enjoyable to use every day. Every feature should support the philosophy that Iron Rabbit is a personal knowledge system that grows with the user over time.

---

## Delivery Phases (proposed by Emergent, subject to user approval)

- **Phase 1 — Foundation** (this session)
  - Pack registered in `tilePacks.js` with 22 seed tiles matching workspace list
  - IndexedDB schema: `restaurants`, `menus`, `orders`, `reviews`, `deliveries`, `favorites`, `coupons`, `staff`
  - Restaurants Galore Dashboard modal (dashboard KPI grid)
  - Restaurant Directory modal (full CRUD, all 20+ fields, Favorite/Hidden/Archived toggles)
  - Header entry point + settings integration

- **Phase 2 — Ordering & Money**
  - Menus modal (unlimited items per restaurant, categories, price history)
  - Favorite Meals modal
  - Order History modal (with items, split-bill support)
  - Tip Calculator + Split Bill
  - Spending Center with recharts (daily/weekly/monthly/yearly)
  - Coupons & Rewards with expiration alerts

- **Phase 3 — Reviews & Experience**
  - Restaurant Reviews (11-metric 5-star system)
  - Delivery Tracker
  - Favorite Staff
  - Wish List
  - Calendar integration
  - Photos gallery

- **Phase 4 — Intelligence & Voice**
  - Voice Journal (browser SpeechRecognition + offline transcript search)
  - Smart Assistant reminders
  - AI Restaurant Insights
  - Search Center (universal)
  - Recipe Recreation
  - Beverage + Dessert Centers
  - Family Dining
  - Emergency Info

- **Phase 5 — Polish**
  - Glass Workspace theme (frosted-glass overlay with blur + transparency sliders)
  - Maps & Navigation integration (Google/Waze/Apple picker)
  - Accessibility deep-dive
  - Full backup/restore integration with existing JSON export
