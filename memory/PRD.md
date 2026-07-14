# Iron Rabbit - PRD

## Original Problem Statement
Build a daily, weekly, monthly reminder list with all the bells and whistles.

## Branding
- **App Name**: Iron Rabbit
- **Website**: https://otropis.com

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB

## What's Been Implemented (March 2026)

### Core Features
- ✅ Note CRUD (create, edit, delete)
- ✅ 5 glowing color options (purple, cyan, lime, pink, orange)
- ✅ Timestamps on all notes
- ✅ FAB button for quick note creation

### Alarm System
- ✅ Date/time picker for alarms
- ✅ Sound options (bell, chime, signal)
- ✅ Haptic feedback toggle
- ✅ Browser notifications

### Recurring Reminders
- ✅ Daily/Weekly/Monthly frequency
- ✅ Day selector for weekly recurrence (Mon-Sun)

### Organization Features
- ✅ Grid layout (1-5 columns on desktop)
- ✅ Accordion/List view toggle
- ✅ Search across title, content, categories
- ✅ Filter: All Notes, Today, This Week, This Month
- ✅ Sort: Custom Order, A-Z, Z-A, Newest, Oldest, Recently Viewed, Recently Edited, By Category
- ✅ Note categories AND subcategories
- ✅ **Drag-and-drop reordering** (when sorted by Custom Order)
- ✅ **Note templates** (5 default templates: Work Meeting, Daily Standup, Shopping List, Health Appointment, Project Task)
- ✅ **Export notes as PDF**
- ✅ **Created time + Edited time** shown separately on each note

### Theme & Design
- ✅ Dark/Light theme toggle
- ✅ Auto theme based on ambient light sensor
- ✅ Hover border highlight on notes
- ✅ Mobile responsive (1 column on mobile)

### Sharing & Calculator
- ✅ Share via copy, email, SMS
- ✅ Built-in calculator with insert-to-note
- ✅ Customizable header (logo, background, URL)

## API Endpoints
- `GET/POST /api/notes` - List/Create notes
- `GET/PUT/DELETE /api/notes/{id}` - Read/Update/Delete note
- `GET/PUT /api/settings` - App settings

## Next Tasks
- Export notes as PDF
- Note templates
- Drag-and-drop reordering
