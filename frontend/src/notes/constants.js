// Shared constants for the Notes app.
// Extracted from the original monolithic NotesApp.jsx.

import { GripVertical, CalendarDays, ArrowUpAZ, ArrowDownAZ, Clock, Pencil, Tag } from "lucide-react";

export const NOTE_COLORS = [
  { name: "purple", label: "Electric Purple", class: "note-purple", accent: "#a855f7" },
  { name: "cyan",   label: "Neon Cyan",       class: "note-cyan",   accent: "#06b6d4" },
  { name: "lime",   label: "Acid Green",      class: "note-lime",   accent: "#84cc16" },
  { name: "pink",   label: "Hot Pink",        class: "note-pink",   accent: "#ec4899" },
  { name: "orange", label: "Solar Orange",    class: "note-orange", accent: "#f97316" },
];

export const SOUND_OPTIONS = [
  { value: "bell",   label: "Bell",   icon: "🔔" },
  { value: "chime",  label: "Chime",  icon: "✨" },
  { value: "signal", label: "Signal", icon: "📢" },
];

export const SORT_OPTIONS = [
  { value: "custom",           label: "Custom Order",     icon: GripVertical },
  { value: "newest",           label: "Newest First",     icon: CalendarDays },
  { value: "oldest",           label: "Oldest First",     icon: CalendarDays },
  { value: "a-z",              label: "A → Z",            icon: ArrowUpAZ },
  { value: "z-a",              label: "Z → A",            icon: ArrowDownAZ },
  { value: "recently-viewed",  label: "Recently Viewed",  icon: Clock },
  { value: "recently-edited",  label: "Recently Edited",  icon: Pencil },
  { value: "category",         label: "By Category",      icon: Tag },
];

export const FILTER_OPTIONS = [
  { value: "all",   label: "All Notes" },
  { value: "today", label: "Today" },
  { value: "week",  label: "This Week" },
  { value: "month", label: "This Month" },
];

export const DEFAULT_TEMPLATES = [
  { name: "Work Meeting",       title: "Meeting Notes",  content: "Attendees:\n\nAgenda:\n\nAction Items:\n",                 color: "cyan",   category: "Work",     icon: "Presentation", background: { type: "gradient", value: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)" } },
  { name: "Daily Standup",      title: "Daily Standup",  content: "Yesterday:\n\nToday:\n\nBlockers:\n",                      color: "lime",   category: "Work",     icon: "Users",        background: { type: "gradient", value: "linear-gradient(135deg, #86efac 0%, #059669 100%)" } },
  { name: "Shopping List",      title: "Shopping List",  content: "- \n- \n- \n",                                             color: "orange", category: "Personal", icon: "ShoppingCart", background: { type: "gradient", value: "linear-gradient(135deg, #f97316 0%, #db2777 100%)" } },
  { name: "Health Appointment", title: "Doctor Visit",   content: "Date:\nTime:\nDoctor:\nNotes:\n",                          color: "pink",   category: "Health",   icon: "Stethoscope",  background: { type: "gradient", value: "linear-gradient(135deg, #fbcfe8 0%, #be123c 100%)" } },
  { name: "Project Task",       title: "Task",           content: "Description:\n\nDeadline:\n\nSteps:\n1. \n2. \n3. \n",     color: "purple", category: "Work",     icon: "Target",       background: { type: "gradient", value: "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)" } },
];
