# Iron Rabbit - Offline-First Architecture

## Original Problem Statement
Refactor into an offline-first application with virtually no ongoing server costs.

## Architecture

### Storage Layer (Modular - Cloud-Ready)
- **StorageService** (`/app/frontend/src/storage/storageService.js`)
  - Abstract interface for all data operations
  - Currently backed by IndexedDB via localforage
  - Future cloud sync can implement same interface without changing app code

### Local Storage Stores
- **notes** - All user notes stored in IndexedDB
- **settings** - App preferences stored in IndexedDB
- **templates** - Custom templates stored in IndexedDB
- **metadata** - App metadata

### Notification System
- **notificationService** (`/app/frontend/src/notifications/notificationService.js`)
  - Uses browser's native `Notification` API
  - Web Audio API for sounds (no external files)
  - `navigator.vibrate` for haptic feedback
  - Interval-based alarm checking (30s polling)

## Features (All Offline)
- ✅ Notes CRUD - stored in IndexedDB
- ✅ Categories & subcategories - derived from local notes
- ✅ Templates - stored locally, 5 defaults built-in
- ✅ Alarms & notifications - device-native
- ✅ Recurring reminders - configured per note
- ✅ Search/filter/sort - client-side only
- ✅ Drag-and-drop reordering - local order field
- ✅ Calculator widget
- ✅ PDF export - client-side jsPDF
- ✅ Logo/header uploads - base64 stored locally
- ✅ Backup & Restore - JSON file export/import
- ✅ Dark/Light theme
- ✅ Accordion notes with full-screen view

## Backup & Restore
- Export: All data → JSON file downloaded via file-saver
- Import: JSON file → restores notes, templates, settings
- Format: `{ version, app, exported_at, data: { notes, settings, templates } }`

## Future Cloud Sync (Not Implemented)
Isolated behind StorageService interface. Can be added later as premium feature:
- User accounts
- Cross-device sync
- Shared notes
- Collaboration
- Cloud backup
- Messaging

## No Backend Required
- Removed: All axios calls to `/api/*` endpoints
- Retained: FastAPI backend exists but is NOT USED by the frontend
- Free version runs entirely on user's device
- Zero ongoing hosting costs per user

## Dependencies
- localforage - IndexedDB wrapper
- file-saver - File download
- uuid - Unique IDs (client-side)
- jspdf - PDF export
- @hello-pangea/dnd - Drag and drop
