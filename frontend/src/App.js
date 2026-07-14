import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { format, isToday, isThisWeek, isThisMonth, parseISO } from "date-fns";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import jsPDF from "jspdf";
import {
  Plus, Settings, Calculator, Bell, Share2, Trash2, Edit3, Clock, X, Copy, Mail, MessageSquare, Grid3X3, Check, Volume2, Smartphone, ExternalLink, Sun, Moon, Search, ChevronDown, ChevronRight, ArrowUpAZ, ArrowDownAZ, CalendarDays, Tag, Repeat, Filter, List, LayoutGrid, FileText, Download, GripVertical, FolderTree, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NOTE_COLORS = [
  { name: "purple", label: "Electric Purple", class: "note-purple", accent: "#a855f7" },
  { name: "cyan", label: "Neon Cyan", class: "note-cyan", accent: "#06b6d4" },
  { name: "lime", label: "Acid Green", class: "note-lime", accent: "#84cc16" },
  { name: "pink", label: "Hot Pink", class: "note-pink", accent: "#ec4899" },
  { name: "orange", label: "Solar Orange", class: "note-orange", accent: "#f97316" },
];

const SOUND_OPTIONS = [
  { value: "bell", label: "Bell", icon: "🔔" },
  { value: "chime", label: "Chime", icon: "✨" },
  { value: "signal", label: "Signal", icon: "📢" },
];

const SORT_OPTIONS = [
  { value: "custom", label: "Custom Order", icon: GripVertical },
  { value: "newest", label: "Newest First", icon: CalendarDays },
  { value: "oldest", label: "Oldest First", icon: CalendarDays },
  { value: "a-z", label: "A → Z", icon: ArrowUpAZ },
  { value: "z-a", label: "Z → A", icon: ArrowDownAZ },
  { value: "recently-viewed", label: "Recently Viewed", icon: Clock },
  { value: "recently-edited", label: "Recently Edited", icon: Pencil },
  { value: "category", label: "By Category", icon: Tag },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All Notes" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

const DEFAULT_TEMPLATES = [
  { name: "Work Meeting", title: "Meeting Notes", content: "Attendees:\n\nAgenda:\n\nAction Items:\n", color: "cyan", category: "Work" },
  { name: "Daily Standup", title: "Daily Standup", content: "Yesterday:\n\nToday:\n\nBlockers:\n", color: "lime", category: "Work" },
  { name: "Shopping List", title: "Shopping List", content: "- \n- \n- \n", color: "orange", category: "Personal" },
  { name: "Health Appointment", title: "Doctor Visit", content: "Date:\nTime:\nDoctor:\nNotes:\n", color: "pink", category: "Health" },
  { name: "Project Task", title: "Task", content: "Description:\n\nDeadline:\n\nSteps:\n1. \n2. \n3. \n", color: "purple", category: "Work" },
];

// Calculator Component
const CalculatorWidget = ({ isOpen, onClose, onInsertResult, isDark }) => {
  const [display, setDisplay] = useState("0");
  const [memory, setMemory] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit) => {
    if (waitingForOperand) { setDisplay(digit); setWaitingForOperand(false); }
    else { setDisplay(display === "0" ? digit : display + digit); }
  };
  const inputDecimal = () => {
    if (waitingForOperand) { setDisplay("0."); setWaitingForOperand(false); }
    else if (!display.includes(".")) { setDisplay(display + "."); }
  };
  const clear = () => { setDisplay("0"); setMemory(null); setOperator(null); setWaitingForOperand(false); };
  const performOperation = (nextOperator) => {
    const inputValue = parseFloat(display);
    if (memory === null) { setMemory(inputValue); }
    else if (operator) {
      let result;
      switch (operator) {
        case "+": result = memory + inputValue; break;
        case "-": result = memory - inputValue; break;
        case "*": result = memory * inputValue; break;
        case "/": result = inputValue !== 0 ? memory / inputValue : "Error"; break;
        default: result = inputValue;
      }
      setDisplay(String(result)); setMemory(result);
    }
    setWaitingForOperand(true); setOperator(nextOperator);
  };
  const calculate = () => {
    if (!operator || memory === null) return;
    const inputValue = parseFloat(display);
    let result;
    switch (operator) {
      case "+": result = memory + inputValue; break;
      case "-": result = memory - inputValue; break;
      case "*": result = memory * inputValue; break;
      case "/": result = inputValue !== 0 ? memory / inputValue : "Error"; break;
      default: result = inputValue;
    }
    setDisplay(String(result)); setMemory(null); setOperator(null); setWaitingForOperand(true);
  };
  const insertToNote = () => { if (onInsertResult) { onInsertResult(display); toast.success("Result inserted into note"); } };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-xs ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`} data-testid="calculator-dialog">
        <DialogHeader>
          <DialogTitle className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Calculator className="w-5 h-5 text-indigo-500" /> Calculator
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className={`rounded-xl p-4 text-right ${isDark ? 'bg-black/30' : 'bg-gray-100'}`}>
            <div className={`font-mono text-3xl truncate ${isDark ? 'text-white' : 'text-gray-900'}`} data-testid="calc-display">{display}</div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <button onClick={clear} className={`calc-btn col-span-2 ${isDark ? '' : 'light'} text-red-500`} data-testid="calc-clear">C</button>
            <button onClick={() => performOperation("/")} className={`calc-btn calc-btn-operator ${isDark ? '' : 'light'}`}>/</button>
            <button onClick={() => performOperation("*")} className={`calc-btn calc-btn-operator ${isDark ? '' : 'light'}`}>×</button>
            {[7,8,9].map(n => <button key={n} onClick={() => inputDigit(String(n))} className={`calc-btn ${isDark ? '' : 'light'}`}>{n}</button>)}
            <button onClick={() => performOperation("-")} className={`calc-btn calc-btn-operator ${isDark ? '' : 'light'}`}>-</button>
            {[4,5,6].map(n => <button key={n} onClick={() => inputDigit(String(n))} className={`calc-btn ${isDark ? '' : 'light'}`}>{n}</button>)}
            <button onClick={() => performOperation("+")} className={`calc-btn calc-btn-operator ${isDark ? '' : 'light'}`}>+</button>
            {[1,2,3].map(n => <button key={n} onClick={() => inputDigit(String(n))} className={`calc-btn ${isDark ? '' : 'light'}`}>{n}</button>)}
            <button onClick={calculate} className="calc-btn calc-btn-equals row-span-2">=</button>
            <button onClick={() => inputDigit("0")} className={`calc-btn col-span-2 ${isDark ? '' : 'light'}`}>0</button>
            <button onClick={inputDecimal} className={`calc-btn ${isDark ? '' : 'light'}`}>.</button>
          </div>
          {onInsertResult && <Button onClick={insertToNote} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white">Insert Result into Note</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Note Card Component with drag handle
const NoteCard = ({ note, onEdit, onDelete, onShare, onView, isDark, dragHandleProps, isDragging }) => {
  const colorConfig = NOTE_COLORS.find(c => c.name === note.color) || NOTE_COLORS[0];
  const hasAlarm = note.alarm?.enabled && note.alarm?.datetime;
  const hasRecurring = note.recurring?.enabled;
  const createdDate = new Date(note.created_at);
  const updatedDate = new Date(note.updated_at);
  const wasEdited = updatedDate.getTime() - createdDate.getTime() > 1000;
  
  return (
    <div className={`note-card ${colorConfig.class} ${isDark ? '' : 'light'} p-5 relative group ${isDragging ? 'opacity-50 scale-105' : ''}`} data-testid={`note-card-${note.id}`}>
      {hasAlarm && <div className="alarm-badge" title="Alarm set"><Bell className="w-3 h-3 text-black" /></div>}
      {hasRecurring && <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center" title="Recurring"><Repeat className="w-3 h-3 text-black" /></div>}
      
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2 flex-1">
          <div {...dragHandleProps} className={`cursor-grab active:cursor-grabbing p-1 rounded hover:bg-white/10 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            <GripVertical className="w-4 h-4" />
          </div>
          <h3 className={`text-lg font-semibold truncate flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`} data-testid="note-title">{note.title || "Untitled"}</h3>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onEdit(note); }} className={`p-1.5 rounded-lg transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white' : 'bg-black/5 hover:bg-black/10 text-gray-600 hover:text-gray-900'}`} aria-label="Edit note" data-testid="note-edit-btn"><Edit3 className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); onShare(note); }} className={`p-1.5 rounded-lg transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white' : 'bg-black/5 hover:bg-black/10 text-gray-600 hover:text-gray-900'}`} aria-label="Share note" data-testid="note-share-btn"><Share2 className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} className={`p-1.5 rounded-lg transition-all ${isDark ? 'bg-white/10 hover:bg-red-500/50 text-white/70 hover:text-white' : 'bg-black/5 hover:bg-red-100 text-gray-600 hover:text-red-600'}`} aria-label="Delete note" data-testid="note-delete-btn"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
      
      {(note.category || note.subcategory) && (
        <div className="flex gap-1 mb-2 flex-wrap">
          {note.category && <Badge variant="outline" className={`text-xs ${isDark ? 'border-white/20 text-slate-300' : 'border-gray-300 text-gray-600'}`}><Tag className="w-3 h-3 mr-1" />{note.category}</Badge>}
          {note.subcategory && <Badge variant="outline" className={`text-xs ${isDark ? 'border-white/20 text-slate-400' : 'border-gray-200 text-gray-500'}`}><FolderTree className="w-3 h-3 mr-1" />{note.subcategory}</Badge>}
        </div>
      )}
      
      <p className={`text-sm line-clamp-4 mb-4 whitespace-pre-wrap ${isDark ? 'text-slate-300' : 'text-gray-600'}`} data-testid="note-content">{note.content || "No content"}</p>
      
      <div className={`flex flex-col gap-1 text-xs font-mono ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
        <span className="flex items-center gap-1" data-testid="note-created"><Clock className="w-3 h-3" /> Created: {format(createdDate, "MMM d, yyyy HH:mm")}</span>
        {wasEdited && <span className="flex items-center gap-1 text-indigo-400" data-testid="note-edited"><Pencil className="w-3 h-3" /> Edited: {format(updatedDate, "MMM d, yyyy HH:mm")}</span>}
        {hasAlarm && <span className="flex items-center gap-1 text-yellow-500" data-testid="note-alarm-time"><Bell className="w-3 h-3" /> Alarm: {format(new Date(note.alarm.datetime), "MMM d, HH:mm")}</span>}
      </div>
    </div>
  );
};

// Note Accordion Item
const NoteAccordionItem = ({ note, onEdit, onDelete, onShare, onView, isDark }) => {
  const colorConfig = NOTE_COLORS.find(c => c.name === note.color) || NOTE_COLORS[0];
  const hasAlarm = note.alarm?.enabled && note.alarm?.datetime;
  const hasRecurring = note.recurring?.enabled;
  const createdDate = new Date(note.created_at);
  const updatedDate = new Date(note.updated_at);
  const wasEdited = updatedDate.getTime() - createdDate.getTime() > 1000;
  
  return (
    <AccordionItem value={note.id} className={`note-accordion-item ${colorConfig.class} ${isDark ? '' : 'light'} rounded-xl mb-2 overflow-hidden border`}>
      <AccordionTrigger className={`px-5 py-4 hover:no-underline ${isDark ? 'text-white hover:bg-white/5' : 'text-gray-900 hover:bg-black/5'}`}>
        <div className="flex items-center gap-3 flex-1 text-left">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorConfig.accent }} />
          <span className="font-semibold truncate">{note.title || "Untitled"}</span>
          {note.category && <Badge variant="outline" className="text-xs">{note.category}</Badge>}
          {hasAlarm && <Bell className="w-4 h-4 text-yellow-500" />}
          {hasRecurring && <Repeat className="w-4 h-4 text-green-500" />}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-5 pb-4">
        <p className={`text-sm whitespace-pre-wrap mb-4 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{note.content || "No content"}</p>
        <div className={`flex flex-col gap-1 text-xs font-mono mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Created: {format(createdDate, "MMM d, yyyy HH:mm")}</span>
          {wasEdited && <span className="flex items-center gap-1 text-indigo-400"><Pencil className="w-3 h-3" /> Edited: {format(updatedDate, "MMM d, yyyy HH:mm")}</span>}
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(note)} className={`p-1.5 rounded-lg transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white' : 'bg-black/5 hover:bg-black/10 text-gray-600 hover:text-gray-900'}`}><Edit3 className="w-4 h-4" /></button>
          <button onClick={() => onShare(note)} className={`p-1.5 rounded-lg transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white' : 'bg-black/5 hover:bg-black/10 text-gray-600 hover:text-gray-900'}`}><Share2 className="w-4 h-4" /></button>
          <button onClick={() => onDelete(note.id)} className={`p-1.5 rounded-lg transition-all ${isDark ? 'bg-white/10 hover:bg-red-500/50 text-white/70 hover:text-white' : 'bg-black/5 hover:bg-red-100 text-gray-600 hover:text-red-600'}`}><Trash2 className="w-4 h-4" /></button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

// Template Selector Modal
const TemplateModal = ({ isOpen, onClose, templates, onSelect, onCreateTemplate, isDark }) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-md ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`} data-testid="template-modal">
        <DialogHeader>
          <DialogTitle className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <FileText className="w-5 h-5 text-indigo-500" /> Note Templates
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {templates.map((t, i) => (
            <button key={t.id || i} onClick={() => onSelect(t)} className={`w-full p-3 rounded-lg text-left transition-all ${isDark ? 'bg-white/5 hover:bg-white/10 border border-white/10' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'}`} data-testid={`template-${i}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NOTE_COLORS.find(c => c.name === t.color)?.accent || '#a855f7' }} />
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.name}</span>
                {t.category && <Badge variant="outline" className="text-xs">{t.category}</Badge>}
              </div>
              <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t.content?.substring(0, 50) || "Empty template"}</p>
            </button>
          ))}
        </div>
        <Button onClick={onCreateTemplate} variant="outline" className={`w-full mt-2 ${isDark ? 'border-white/10 text-slate-300' : ''}`}>
          <Plus className="w-4 h-4 mr-2" /> Create New Template
        </Button>
      </DialogContent>
    </Dialog>
  );
};

// Note Modal Component
const NoteModal = ({ isOpen, onClose, note, onSave, onOpenCalculator, isDark, categories, templates, onSelectTemplate }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("purple");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [alarm, setAlarm] = useState({ enabled: false, datetime: null, sound: "bell", haptic: false });
  const [alarmDate, setAlarmDate] = useState(null);
  const [alarmTime, setAlarmTime] = useState("12:00");
  const [recurring, setRecurring] = useState({ enabled: false, frequency: "weekly", days: [] });
  const [saving, setSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title || ""); setContent(note.content || ""); setColor(note.color || "purple");
      setCategory(note.category || ""); setSubcategory(note.subcategory || "");
      if (note.alarm) { setAlarm(note.alarm); if (note.alarm.datetime) { const dt = new Date(note.alarm.datetime); setAlarmDate(dt); setAlarmTime(format(dt, "HH:mm")); } }
      if (note.recurring) { setRecurring(note.recurring); }
    } else {
      setTitle(""); setContent(""); setColor("purple"); setCategory(""); setSubcategory("");
      setAlarm({ enabled: false, datetime: null, sound: "bell", haptic: false }); setAlarmDate(null); setAlarmTime("12:00");
      setRecurring({ enabled: false, frequency: "weekly", days: [] });
    }
  }, [note, isOpen]);

  const handleSelectTemplate = (template) => {
    setTitle(template.title || ""); setContent(template.content || ""); setColor(template.color || "purple");
    setCategory(template.category || ""); setSubcategory(template.subcategory || "");
    setShowTemplates(false);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Please enter a title"); return; }
    setSaving(true);
    let alarmDateTime = null;
    if (alarm.enabled && alarmDate) {
      const [hours, minutes] = alarmTime.split(":").map(Number);
      const dt = new Date(alarmDate); dt.setHours(hours, minutes, 0, 0);
      alarmDateTime = dt.toISOString();
    }
    const noteData = { title: title.trim(), content, color, category: category.trim(), subcategory: subcategory.trim(), alarm: { ...alarm, datetime: alarmDateTime }, recurring };
    await onSave(noteData, note?.id);
    setSaving(false); onClose();
  };

  const insertCalculatorResult = (result) => { setContent(prev => prev + (prev ? "\n" : "") + result); };
  const toggleDay = (day) => { setRecurring(prev => ({ ...prev, days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day] })); };
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const subcategories = categories[category] || [];

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-lg max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`} data-testid="note-modal">
          <DialogHeader>
            <DialogTitle className={`font-semibold flex items-center justify-between ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <span>{note ? "Edit Note" : "New Note"}</span>
              {!note && <Button variant="ghost" size="sm" onClick={() => setShowTemplates(true)} className="text-indigo-500"><FileText className="w-4 h-4 mr-1" /> Templates</Button>}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className={`text-sm mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter note title..." className={isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'} data-testid="note-title-input" />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Content</label>
                <Button variant="ghost" size="sm" onClick={() => onOpenCalculator(insertCalculatorResult)} className={isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}><Calculator className="w-4 h-4 mr-1" /> Calculator</Button>
              </div>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your note..." rows={4} className={`resize-none ${isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'}`} data-testid="note-content-input" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-sm mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Category</label>
                <Input value={category} onChange={(e) => { setCategory(e.target.value); setSubcategory(""); }} placeholder="e.g., Work" className={isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'} list="categories" data-testid="note-category-input" />
                <datalist id="categories">{Object.keys(categories).map(cat => <option key={cat} value={cat} />)}</datalist>
              </div>
              <div>
                <label className={`text-sm mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Subcategory</label>
                <Input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="e.g., Meetings" className={isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'} list="subcategories" data-testid="note-subcategory-input" />
                <datalist id="subcategories">{subcategories.map(sub => <option key={sub} value={sub} />)}</datalist>
              </div>
            </div>
            
            <div>
              <label className={`text-sm mb-2 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Color</label>
              <div className="flex gap-2">
                {NOTE_COLORS.map((c) => (<button key={c.name} onClick={() => setColor(c.name)} className={`color-swatch ${color === c.name ? "active" : ""}`} style={{ backgroundColor: c.accent }} aria-label={c.label} data-testid={`color-${c.name}`} />))}
              </div>
            </div>
            
            <div className={`border-t pt-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <label className={`text-sm flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}><Bell className="w-4 h-4" /> Set Alarm</label>
                <Switch checked={alarm.enabled} onCheckedChange={(checked) => setAlarm(prev => ({ ...prev, enabled: checked }))} data-testid="alarm-toggle" />
              </div>
              {alarm.enabled && (
                <div className="space-y-3 pl-6">
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={`flex-1 ${isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>{alarmDate ? format(alarmDate, "MMM d, yyyy") : "Select date"}</Button>
                      </PopoverTrigger>
                      <PopoverContent className={`p-0 ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`}><Calendar mode="single" selected={alarmDate} onSelect={setAlarmDate} /></PopoverContent>
                    </Popover>
                    <Input type="time" value={alarmTime} onChange={(e) => setAlarmTime(e.target.value)} className={`w-32 ${isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                  </div>
                  <div className="flex gap-2">
                    {SOUND_OPTIONS.map((s) => (<button key={s.value} onClick={() => setAlarm(prev => ({ ...prev, sound: s.value }))} className={`sound-option flex-1 ${alarm.sound === s.value ? "active" : ""} ${isDark ? '' : 'light'}`}><span className="text-lg">{s.icon}</span><span className="text-xs">{s.label}</span></button>))}
                  </div>
                  <div className="flex items-center justify-between">
                    <label className={`text-xs flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}><Smartphone className="w-3 h-3" /> Haptic</label>
                    <Switch checked={alarm.haptic} onCheckedChange={(checked) => setAlarm(prev => ({ ...prev, haptic: checked }))} />
                  </div>
                </div>
              )}
            </div>

            <div className={`border-t pt-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <label className={`text-sm flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}><Repeat className="w-4 h-4" /> Recurring</label>
                <Switch checked={recurring.enabled} onCheckedChange={(checked) => setRecurring(prev => ({ ...prev, enabled: checked }))} data-testid="recurring-toggle" />
              </div>
              {recurring.enabled && (
                <div className="space-y-3 pl-6">
                  <Select value={recurring.frequency} onValueChange={(v) => setRecurring(prev => ({ ...prev, frequency: v, days: [] }))}>
                    <SelectTrigger className={isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}><SelectValue /></SelectTrigger>
                    <SelectContent className={isDark ? 'bg-[#0B1221] border-white/10' : ''}><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent>
                  </Select>
                  {recurring.frequency === "weekly" && (
                    <div className="flex gap-1 flex-wrap">{DAYS.map((day, i) => (<button key={day} onClick={() => toggleDay(i)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${recurring.days.includes(i) ? 'bg-indigo-500 text-white' : isDark ? 'bg-white/10 text-slate-400' : 'bg-gray-100 text-gray-600'}`}>{day}</button>))}</div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={onClose} className={`flex-1 ${isDark ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold">{saving ? "Saving..." : (note ? "Update" : "Create")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <TemplateModal isOpen={showTemplates} onClose={() => setShowTemplates(false)} templates={templates} onSelect={handleSelectTemplate} onCreateTemplate={() => {}} isDark={isDark} />
    </>
  );
};

// Share Modal
const ShareModal = ({ isOpen, onClose, note, isDark }) => {
  if (!isOpen || !note) return null;
  const shareText = `${note.title}\n\n${note.content}`;
  const copyToClipboard = async () => { try { await navigator.clipboard.writeText(shareText); toast.success("Copied!"); } catch { toast.error("Failed to copy"); } };
  const shareViaEmail = () => { window.open(`mailto:?subject=${encodeURIComponent(note.title || "Note")}&body=${encodeURIComponent(shareText)}`, "_blank"); };
  const shareViaSMS = () => { window.open(`sms:?body=${encodeURIComponent(shareText)}`, "_blank"); };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-sm ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`}>
        <DialogHeader><DialogTitle className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}><Share2 className="w-5 h-5 text-indigo-500" /> Share Note</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          <button onClick={copyToClipboard} className={`share-btn ${isDark ? '' : 'light'}`}><Copy className="w-6 h-6" /><span className="text-sm">Copy</span></button>
          <button onClick={shareViaEmail} className={`share-btn ${isDark ? '' : 'light'}`}><Mail className="w-6 h-6" /><span className="text-sm">Email</span></button>
          <button onClick={shareViaSMS} className={`share-btn ${isDark ? '' : 'light'}`}><MessageSquare className="w-6 h-6" /><span className="text-sm">SMS</span></button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Settings Modal
const SettingsModal = ({ isOpen, onClose, settings, onSave, isDark }) => {
  const [formData, setFormData] = useState({ logo_url: "", header_bg: "", website_url: "", company_name: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (settings) setFormData(settings); }, [settings]);
  const handleSave = async () => { setSaving(true); await onSave(formData); setSaving(false); onClose(); toast.success("Settings saved!"); };
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-lg ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`}>
        <DialogHeader><DialogTitle className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}><Settings className="w-5 h-5 text-indigo-500" /> Header Settings</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><label className={`text-sm mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Company Name</label><Input value={formData.company_name} onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))} className={isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-200'} /></div>
          <div><label className={`text-sm mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Logo URL</label><Input value={formData.logo_url} onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))} className={isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-200'} /></div>
          <div><label className={`text-sm mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Header Background URL</label><Input value={formData.header_bg} onChange={(e) => setFormData(prev => ({ ...prev, header_bg: e.target.value }))} className={isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-200'} /></div>
          <div><label className={`text-sm mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Website URL</label><Input value={formData.website_url} onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))} className={isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-200'} /></div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className={`flex-1 ${isDark ? 'border-white/10 text-slate-300' : ''}`}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold">{saving ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main App
function App() {
  const [notes, setNotes] = useState([]);
  const [settings, setSettings] = useState(null);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [gridCols, setGridCols] = useState(3);
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("custom");
  const [filterBy, setFilterBy] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDark, setIsDark] = useState(true);
  
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorCallback, setCalculatorCallback] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharingNote, setSharingNote] = useState(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [notesRes, settingsRes, catsRes, templatesRes] = await Promise.all([
        axios.get(`${API}/notes`),
        axios.get(`${API}/settings`),
        axios.get(`${API}/categories`),
        axios.get(`${API}/templates`).catch(() => ({ data: [] })),
      ]);
      setNotes(notesRes.data);
      setSettings(settingsRes.data);
      setCategories(catsRes.data);
      if (templatesRes.data.length > 0) setTemplates(templatesRes.data);
    } catch (err) { console.error("Error:", err); toast.error("Failed to load data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      notes.forEach((note) => {
        if (note.alarm?.enabled && note.alarm?.datetime) {
          const alarmTime = new Date(note.alarm.datetime);
          const diff = alarmTime - now;
          if (diff > 0 && diff < 60000) {
            if (Notification.permission === "granted") new Notification(`Reminder: ${note.title}`, { body: note.content?.substring(0, 100) || "Time!" });
            toast.info(`Reminder: ${note.title}`, { duration: 10000 });
          }
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [notes]);

  useEffect(() => { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); }, []);

  const processedNotes = useMemo(() => {
    let result = [...notes];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q) || n.category?.toLowerCase().includes(q) || n.subcategory?.toLowerCase().includes(q));
    }
    if (filterBy !== "all") {
      result = result.filter(n => {
        const date = parseISO(n.created_at);
        if (filterBy === "today") return isToday(date);
        if (filterBy === "week") return isThisWeek(date);
        if (filterBy === "month") return isThisMonth(date);
        return true;
      });
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case "custom": return (a.order || 0) - (b.order || 0);
        case "newest": return new Date(b.created_at) - new Date(a.created_at);
        case "oldest": return new Date(a.created_at) - new Date(b.created_at);
        case "a-z": return (a.title || "").localeCompare(b.title || "");
        case "z-a": return (b.title || "").localeCompare(a.title || "");
        case "recently-viewed": return new Date(b.last_viewed || b.updated_at) - new Date(a.last_viewed || a.updated_at);
        case "recently-edited": return new Date(b.updated_at) - new Date(a.updated_at);
        case "category": return (a.category || "").localeCompare(b.category || "");
        default: return 0;
      }
    });
    return result;
  }, [notes, searchQuery, filterBy, sortBy]);

  const handleSaveNote = async (noteData, noteId) => {
    try {
      if (noteId) { await axios.put(`${API}/notes/${noteId}`, noteData); toast.success("Note updated!"); }
      else { const maxOrder = notes.reduce((max, n) => Math.max(max, n.order || 0), 0); await axios.post(`${API}/notes`, { ...noteData, order: maxOrder + 1 }); toast.success("Note created!"); }
      fetchData();
    } catch (err) { console.error("Error:", err); toast.error("Failed to save"); }
  };

  const handleDeleteNote = async (noteId) => {
    try { await axios.delete(`${API}/notes/${noteId}`); toast.success("Deleted"); fetchData(); }
    catch (err) { console.error("Error:", err); toast.error("Failed to delete"); }
  };

  const handleSaveSettings = async (settingsData) => {
    try { await axios.put(`${API}/settings`, settingsData); setSettings(settingsData); }
    catch (err) { console.error("Error:", err); toast.error("Failed to save settings"); }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const items = Array.from(processedNotes);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    const newOrder = items.map(item => item.id);
    try {
      await axios.post(`${API}/notes/reorder`, { note_ids: newOrder });
      fetchData();
    } catch (err) { console.error("Reorder error:", err); }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(20);
    doc.text(settings?.company_name || "Iron Rabbit", 20, y);
    y += 15;
    doc.setFontSize(10);
    doc.text(`Exported: ${format(new Date(), "MMM d, yyyy HH:mm")}`, 20, y);
    y += 15;

    processedNotes.forEach((note, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(14);
      doc.setTextColor(NOTE_COLORS.find(c => c.name === note.color)?.accent || "#000");
      doc.text(note.title || "Untitled", 20, y);
      y += 8;
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Created: ${format(new Date(note.created_at), "MMM d, yyyy HH:mm")}`, 20, y);
      if (note.category) { doc.text(` | Category: ${note.category}${note.subcategory ? ` > ${note.subcategory}` : ''}`, 100, y); }
      y += 6;
      doc.setFontSize(11);
      doc.setTextColor(0);
      const lines = doc.splitTextToSize(note.content || "No content", 170);
      lines.forEach(line => { if (y > 280) { doc.addPage(); y = 20; } doc.text(line, 20, y); y += 6; });
      y += 10;
    });

    doc.save(`${settings?.company_name || "notes"}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF exported!");
  };

  const openEditModal = (note) => { setEditingNote(note); setNoteModalOpen(true); };
  const openShareModal = (note) => { setSharingNote(note); setShareModalOpen(true); };
  const openCalculatorWithCallback = (callback) => { setCalculatorCallback(() => callback); setCalculatorOpen(true); };

  const gridClass = `grid gap-6 transition-all duration-500 ${
    gridCols === 1 ? "grid-cols-1" :
    gridCols === 2 ? "grid-cols-1 md:grid-cols-2" :
    gridCols === 3 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" :
    gridCols === 4 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" :
    "grid-cols-1 md:grid-cols-2 lg:grid-cols-5"
  }`;

  if (loading) {
    return (<div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#020617]' : 'bg-gray-50'}`}><div className={`flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />Loading...</div></div>);
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#020617]' : 'bg-gray-50'}`} data-testid="app-container">
      <Toaster position="top-right" theme={isDark ? "dark" : "light"} />
      
      <header className={`header-bg h-48 md:h-56 flex items-end ${isDark ? '' : 'light'}`} style={{ backgroundImage: settings?.header_bg ? `url(${settings.header_bg})` : undefined }}>
        <div className="relative z-10 w-full p-6 md:p-12 flex items-end justify-between">
          <div className="flex items-center gap-4">
            {settings?.logo_url && <a href={settings?.website_url || "#"} target="_blank" rel="noopener noreferrer"><img src={settings.logo_url} alt="Logo" className="w-12 h-12 md:w-16 md:h-16 rounded-xl object-cover border border-white/20" /></a>}
            <div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">{settings?.company_name || "Iron Rabbit"}</h1>
              {settings?.website_url && <a href={settings.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-300 hover:text-white flex items-center gap-1 mt-1"><ExternalLink className="w-3 h-3" />{settings.website_url.replace(/^https?:\/\//, "")}</a>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={exportToPDF} className="text-white/70 hover:text-white hover:bg-white/10" aria-label="Export PDF" data-testid="export-pdf-btn"><Download className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} className="text-white/70 hover:text-white hover:bg-white/10" aria-label="Toggle theme"><Sun className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setCalculatorOpen(true)} className="text-white/70 hover:text-white hover:bg-white/10"><Calculator className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setSettingsModalOpen(true)} className="text-white/70 hover:text-white hover:bg-white/10"><Settings className="w-5 h-5" /></Button>
          </div>
        </div>
      </header>
      
      <main className="p-6 md:p-12 max-w-[1920px] mx-auto">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search notes..." className={`pl-10 ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'}`} data-testid="search-input" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className={`w-36 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent className={isDark ? 'bg-[#0B1221] border-white/10' : ''}>{FILTER_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className={`w-48 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}><SelectValue /></SelectTrigger>
              <SelectContent className={isDark ? 'bg-[#0B1221] border-white/10' : ''}>{SORT_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}><span className="flex items-center gap-2"><opt.icon className="w-4 h-4" />{opt.label}</span></SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("grid")} className={isDark ? '' : 'hover:bg-gray-100'}><LayoutGrid className="w-4 h-4 mr-1" /> Grid</Button>
              <Button variant={viewMode === "accordion" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("accordion")} className={isDark ? '' : 'hover:bg-gray-100'}><List className="w-4 h-4 mr-1" /> List</Button>
            </div>
            {viewMode === "grid" && (
              <div className="hidden md:flex items-center gap-2">
                <Grid3X3 className={`w-5 h-5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                <span className={`text-sm mr-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Columns:</span>
                {[1, 2, 3, 4, 5].map((cols) => (<button key={cols} onClick={() => setGridCols(cols)} className={`grid-control-btn ${gridCols === cols ? "active" : ""} ${isDark ? '' : 'light'}`}>{cols}</button>))}
              </div>
            )}
          </div>
          <div className={`text-sm font-mono ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{processedNotes.length} notes</div>
        </div>
        
        {processedNotes.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-20">📝</div>
            <h2 className={`text-xl mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{searchQuery || filterBy !== "all" ? "No notes found" : "No notes yet"}</h2>
            <p className={`mb-6 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{searchQuery || filterBy !== "all" ? "Try adjusting your search" : "Create your first note"}</p>
            {!searchQuery && filterBy === "all" && <Button onClick={() => { setEditingNote(null); setNoteModalOpen(true); }} className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold"><Plus className="w-5 h-5 mr-2" /> Create Note</Button>}
          </div>
        ) : viewMode === "accordion" ? (
          <Accordion type="multiple" className="space-y-2">{processedNotes.map(note => <NoteAccordionItem key={note.id} note={note} onEdit={openEditModal} onDelete={handleDeleteNote} onShare={openShareModal} onView={() => {}} isDark={isDark} />)}</Accordion>
        ) : sortBy === "custom" ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="notes" direction="horizontal">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className={gridClass}>
                  {processedNotes.map((note, index) => (
                    <Draggable key={note.id} draggableId={note.id} index={index}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps}>
                          <NoteCard note={note} onEdit={openEditModal} onDelete={handleDeleteNote} onShare={openShareModal} onView={() => {}} isDark={isDark} dragHandleProps={provided.dragHandleProps} isDragging={snapshot.isDragging} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <div className={gridClass}>{processedNotes.map(note => <NoteCard key={note.id} note={note} onEdit={openEditModal} onDelete={handleDeleteNote} onShare={openShareModal} onView={() => {}} isDark={isDark} dragHandleProps={{}} isDragging={false} />)}</div>
        )}
      </main>
      
      <button onClick={() => { setEditingNote(null); setNoteModalOpen(true); }} className={`fab-button ${isDark ? '' : 'light'}`} aria-label="Add note" data-testid="fab-add-note"><Plus className="w-7 h-7" /></button>
      
      <NoteModal isOpen={noteModalOpen} onClose={() => { setNoteModalOpen(false); setEditingNote(null); }} note={editingNote} onSave={handleSaveNote} onOpenCalculator={openCalculatorWithCallback} isDark={isDark} categories={categories} templates={templates} onSelectTemplate={() => {}} />
      <CalculatorWidget isOpen={calculatorOpen} onClose={() => { setCalculatorOpen(false); setCalculatorCallback(null); }} onInsertResult={calculatorCallback} isDark={isDark} />
      <ShareModal isOpen={shareModalOpen} onClose={() => { setShareModalOpen(false); setSharingNote(null); }} note={sharingNote} isDark={isDark} />
      <SettingsModal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} settings={settings} onSave={handleSaveSettings} isDark={isDark} />
    </div>
  );
}

export default App;
