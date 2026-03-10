# LuminaTask - PRD

## Original Problem Statement
Build a daily, weekly, monthly reminder list of things to do with:
- Add note plus sign to add new note
- Title to note
- Date, time note created
- Alarm with settings (Haptic, bells, sounds)
- Way to share each note to messages, email, etc
- Colorize each individual note a different color
- Way to organize notes into columns, rows with controls (1-7 rows/columns)
- Way to use calculator in notes for hours worked
- Company logo on header with background picture and link to website

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB

## User Personas
- Productivity-focused individuals
- Freelancers tracking work hours
- Anyone needing organized reminders

## Core Requirements
1. Note CRUD operations
2. Color-coded notes (5 colors)
3. Alarm/reminder system with sounds
4. Built-in calculator
5. Grid layout control
6. Share functionality
7. Customizable header branding

## What's Been Implemented (March 10, 2026)
- ✅ Full backend API for notes and settings
- ✅ Create/Edit/Delete notes with color selection
- ✅ Alarm system with date/time picker, sound options, haptic toggle
- ✅ Grid layout control (1-5 columns)
- ✅ Functional calculator with insert-to-note feature
- ✅ Share via copy, email, SMS
- ✅ Customizable header (logo, background, company name, URL)
- ✅ Browser notifications for alarms
- ✅ Dark bioluminescent theme with glowing note cards

## API Endpoints
- `GET /api/notes` - List all notes
- `POST /api/notes` - Create note
- `PUT /api/notes/{id}` - Update note
- `DELETE /api/notes/{id}` - Delete note
- `GET /api/settings` - Get app settings
- `PUT /api/settings` - Update settings

## Prioritized Backlog

### P0 (Critical)
- All implemented ✅

### P1 (High Priority)
- Daily/Weekly/Monthly view filtering
- Search notes functionality
- Note categories/tags

### P2 (Nice to Have)
- Recurring reminders
- Export notes as PDF
- Dark/Light theme toggle
- Note templates

## Next Tasks
1. Add view filtering (Today, This Week, This Month)
2. Implement search across notes
3. Add note categories/tags
