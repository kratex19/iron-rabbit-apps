import React, { useState, useEffect, useCallback, useMemo } from "react";
import "@/App.css";
import { Toaster, toast } from "sonner";
import { format, isToday, isThisWeek, isThisMonth, parseISO } from "date-fns";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import jsPDF from "jspdf";
import { saveAs } from "file-saver";
import { v4 as uuidv4 } from "uuid";
import StorageService from "./storage/storageService";
import notificationService from "./notifications/notificationService";
import {
  Plus, Settings, Calculator, Bell, Share2, Trash2, Edit3, Clock, Copy, Mail, MessageSquare, Grid3X3, Smartphone, ExternalLink, Sun, Moon, Search, ArrowUpAZ, ArrowDownAZ, CalendarDays, Tag, Repeat, Filter, List, LayoutGrid, FileText, Download, GripVertical, FolderTree, Pencil, ChevronDown, Maximize2, X, Upload, Image, HardDrive, Cloud, WifiOff,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Check online status for future cloud sync features
const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return isOnline;
};

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

  const inputDigit = (digit) => { if (waitingForOperand) { setDisplay(digit); setWaitingForOperand(false); } else { setDisplay(display === "0" ? digit : display + digit); } };
  const inputDecimal = () => { if (waitingForOperand) { setDisplay("0."); setWaitingForOperand(false); } else if (!display.includes(".")) { setDisplay(display + "."); } };
  const clear = () => { setDisplay("0"); setMemory(null); setOperator(null); setWaitingForOperand(false); };
  const performOperation = (nextOperator) => {
    const inputValue = parseFloat(display);
    if (memory === null) { setMemory(inputValue); } else if (operator) {
      let result;
      switch (operator) { case "+": result = memory + inputValue; break; case "-": result = memory - inputValue; break; case "*": result = memory * inputValue; break; case "/": result = inputValue !== 0 ? memory / inputValue : "Error"; break; default: result = inputValue; }
      setDisplay(String(result)); setMemory(result);
    }
    setWaitingForOperand(true); setOperator(nextOperator);
  };
  const calculate = () => {
    if (!operator || memory === null) return;
    const inputValue = parseFloat(display);
    let result;
    switch (operator) { case "+": result = memory + inputValue; break; case "-": result = memory - inputValue; break; case "*": result = memory * inputValue; break; case "/": result = inputValue !== 0 ? memory / inputValue : "Error"; break; default: result = inputValue; }
    setDisplay(String(result)); setMemory(null); setOperator(null); setWaitingForOperand(true);
  };
  const insertToNote = () => { if (onInsertResult) { onInsertResult(display); toast.success("Result inserted"); } };

  if (!isOpen) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-xs ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`}>
        <DialogHeader><DialogTitle className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}><Calculator className="w-5 h-5 text-indigo-500" /> Calculator</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className={`rounded-xl p-3 text-right ${isDark ? 'bg-black/30' : 'bg-gray-100'}`}><div className={`font-mono text-2xl truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{display}</div></div>
          <div className="grid grid-cols-4 gap-1.5">
            <button onClick={clear} className={`calc-btn col-span-2 ${isDark ? '' : 'light'} text-red-500`}>C</button>
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
          {onInsertResult && <Button onClick={insertToNote} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white" size="sm">Insert Result</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Full Screen Note View
const FullScreenNote = ({ note, isOpen, onClose, onEdit, onDelete, onShare, isDark }) => {
  if (!isOpen || !note) return null;
  const colorConfig = NOTE_COLORS.find(c => c.name === note.color) || NOTE_COLORS[0];
  const hasAlarm = note.alarm?.enabled && note.alarm?.datetime;
  const hasRecurring = note.recurring?.enabled;
  const createdDate = new Date(note.created_at);
  const updatedDate = new Date(note.updated_at);
  const wasEdited = updatedDate.getTime() - createdDate.getTime() > 1000;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="fullscreen-note">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-4xl h-[90vh] rounded-2xl overflow-hidden flex flex-col ${isDark ? 'bg-[#0B1221]' : 'bg-white'} border ${colorConfig.class}`} style={{ borderWidth: '2px' }}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colorConfig.accent }} />
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{note.title || "Untitled"}</h2>
            {note.category && <Badge variant="outline" className="text-xs">{note.category}{note.subcategory && ` > ${note.subcategory}`}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => { onClose(); onEdit(note); }} className={isDark ? 'text-white/70 hover:text-white' : ''}><Edit3 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => onShare(note)} className={isDark ? 'text-white/70 hover:text-white' : ''}><Share2 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => { onClose(); onDelete(note.id); }} className={isDark ? 'text-white/70 hover:text-red-400' : 'hover:text-red-600'}><Trash2 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={onClose} className={isDark ? 'text-white/70 hover:text-white' : ''}><X className="w-5 h-5" /></Button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className={`whitespace-pre-wrap text-base leading-relaxed ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{note.content || "No content"}</div>
        </div>
        {/* Footer */}
        <div className={`flex items-center justify-between p-4 border-t text-xs font-mono ${isDark ? 'border-white/10 text-slate-500' : 'border-gray-200 text-gray-400'}`}>
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Created: {format(createdDate, "MMM d, yyyy HH:mm")}</span>
            {wasEdited && <span className="flex items-center gap-1 text-indigo-400"><Pencil className="w-3 h-3" /> Edited: {format(updatedDate, "MMM d, yyyy HH:mm")}</span>}
          </div>
          <div className="flex items-center gap-3">
            {hasAlarm && <span className="flex items-center gap-1 text-yellow-500"><Bell className="w-3 h-3" /> {format(new Date(note.alarm.datetime), "MMM d, HH:mm")}</span>}
            {hasRecurring && <span className="flex items-center gap-1 text-green-500"><Repeat className="w-3 h-3" /> {note.recurring.frequency}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

// Accordion Note Item (collapsed by default)
const AccordionNoteItem = ({ note, onEdit, onDelete, onShare, onFullScreen, isDark, dragHandleProps, isDragging }) => {
  const [isOpen, setIsOpen] = useState(false);
  const colorConfig = NOTE_COLORS.find(c => c.name === note.color) || NOTE_COLORS[0];
  const hasAlarm = note.alarm?.enabled && note.alarm?.datetime;
  const hasRecurring = note.recurring?.enabled;
  const createdDate = new Date(note.created_at);
  const updatedDate = new Date(note.updated_at);
  const wasEdited = updatedDate.getTime() - createdDate.getTime() > 1000;

  return (
    <div className={`accordion-note ${colorConfig.class} ${isDark ? '' : 'light'} rounded-lg border overflow-hidden mb-2 ${isDragging ? 'opacity-50' : ''}`} data-testid={`accordion-note-${note.id}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className={`flex items-center gap-2 p-3 cursor-pointer transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
            {dragHandleProps && <div {...dragHandleProps} className={`cursor-grab active:cursor-grabbing p-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} onClick={e => e.stopPropagation()}><GripVertical className="w-4 h-4" /></div>}
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colorConfig.accent }} />
            <span className={`font-medium truncate flex-1 text-left ${isDark ? 'text-white' : 'text-gray-900'}`}>{note.title || "Untitled"}</span>
            {note.category && <Badge variant="outline" className="text-xs hidden sm:inline-flex">{note.category}</Badge>}
            {hasAlarm && <Bell className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
            {hasRecurring && <Repeat className="w-4 h-4 text-green-500 flex-shrink-0" />}
            <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''} ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className={`px-3 pb-3 pt-1 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <p className={`text-sm whitespace-pre-wrap line-clamp-4 mb-3 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{note.content || "No content"}</p>
            <div className={`flex items-center justify-between text-xs font-mono ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              <div className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(createdDate, "MMM d, yyyy HH:mm")}</span>
                {wasEdited && <span className="flex items-center gap-1 text-indigo-400"><Pencil className="w-3 h-3" /> {format(updatedDate, "MMM d, yyyy HH:mm")}</span>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => onFullScreen(note)} className={`p-1.5 rounded transition-all ${isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`} title="Full screen"><Maximize2 className="w-4 h-4" /></button>
                <button onClick={() => onEdit(note)} className={`p-1.5 rounded transition-all ${isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => onShare(note)} className={`p-1.5 rounded transition-all ${isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}><Share2 className="w-4 h-4" /></button>
                <button onClick={() => onDelete(note.id)} className={`p-1.5 rounded transition-all ${isDark ? 'hover:bg-red-500/30 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-500 hover:text-red-600'}`}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

// Template Selector Modal
const TemplateModal = ({ isOpen, onClose, templates, onSelect, isDark }) => {
  if (!isOpen) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-md ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`}>
        <DialogHeader><DialogTitle className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}><FileText className="w-5 h-5 text-indigo-500" /> Templates</DialogTitle></DialogHeader>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {templates.map((t, i) => (
            <button key={t.id || i} onClick={() => onSelect(t)} className={`w-full p-2.5 rounded-lg text-left transition-all ${isDark ? 'bg-white/5 hover:bg-white/10 border border-white/10' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NOTE_COLORS.find(c => c.name === t.color)?.accent || '#a855f7' }} />
                <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.name}</span>
                {t.category && <Badge variant="outline" className="text-xs">{t.category}</Badge>}
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Note Modal
const NoteModal = ({ isOpen, onClose, note, onSave, onOpenCalculator, isDark, categories, templates }) => {
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

  const handleSelectTemplate = (template) => { setTitle(template.title || ""); setContent(template.content || ""); setColor(template.color || "purple"); setCategory(template.category || ""); setSubcategory(template.subcategory || ""); setShowTemplates(false); };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Please enter a title"); return; }
    setSaving(true);
    let alarmDateTime = null;
    if (alarm.enabled && alarmDate) { const [hours, minutes] = alarmTime.split(":").map(Number); const dt = new Date(alarmDate); dt.setHours(hours, minutes, 0, 0); alarmDateTime = dt.toISOString(); }
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
        <DialogContent className={`max-w-lg max-h-[85vh] overflow-y-auto ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className={`font-semibold flex items-center justify-between ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <span>{note ? "Edit Note" : "New Note"}</span>
              {!note && <Button variant="ghost" size="sm" onClick={() => setShowTemplates(true)} className="text-indigo-500 h-7"><FileText className="w-4 h-4 mr-1" /> Templates</Button>}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter title..." className={`h-9 ${isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-600' : 'bg-gray-50 border-gray-200'}`} />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Content</label>
                <Button variant="ghost" size="sm" onClick={() => onOpenCalculator(insertCalculatorResult)} className={`h-6 text-xs ${isDark ? 'text-slate-400' : ''}`}><Calculator className="w-3 h-3 mr-1" /> Calc</Button>
              </div>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write..." rows={3} className={`resize-none ${isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-600' : 'bg-gray-50 border-gray-200'}`} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`text-xs mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Category</label>
                <Input value={category} onChange={(e) => { setCategory(e.target.value); setSubcategory(""); }} placeholder="e.g., Work" className={`h-9 ${isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-600' : 'bg-gray-50 border-gray-200'}`} list="categories" />
                <datalist id="categories">{Object.keys(categories).map(cat => <option key={cat} value={cat} />)}</datalist>
              </div>
              <div>
                <label className={`text-xs mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Subcategory</label>
                <Input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="e.g., Meetings" className={`h-9 ${isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-600' : 'bg-gray-50 border-gray-200'}`} list="subcategories" />
                <datalist id="subcategories">{subcategories.map(sub => <option key={sub} value={sub} />)}</datalist>
              </div>
            </div>
            
            <div>
              <label className={`text-xs mb-1.5 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Color</label>
              <div className="flex gap-2">{NOTE_COLORS.map((c) => (<button key={c.name} onClick={() => setColor(c.name)} className={`color-swatch-sm ${color === c.name ? "active" : ""}`} style={{ backgroundColor: c.accent }} />))}</div>
            </div>
            
            <div className={`border-t pt-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}><Bell className="w-3.5 h-3.5" /> Alarm</label>
                <Switch checked={alarm.enabled} onCheckedChange={(checked) => setAlarm(prev => ({ ...prev, enabled: checked }))} />
              </div>
              {alarm.enabled && (
                <div className="space-y-2 pl-5">
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild><Button variant="outline" size="sm" className={`flex-1 h-8 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`}>{alarmDate ? format(alarmDate, "MMM d") : "Date"}</Button></PopoverTrigger>
                      <PopoverContent className={`p-0 ${isDark ? 'bg-[#0B1221] border-white/10' : ''}`}><Calendar mode="single" selected={alarmDate} onSelect={setAlarmDate} /></PopoverContent>
                    </Popover>
                    <Input type="time" value={alarmTime} onChange={(e) => setAlarmTime(e.target.value)} className={`w-24 h-8 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`} />
                  </div>
                  <div className="flex gap-1">{SOUND_OPTIONS.map((s) => (<button key={s.value} onClick={() => setAlarm(prev => ({ ...prev, sound: s.value }))} className={`sound-option-sm flex-1 ${alarm.sound === s.value ? "active" : ""} ${isDark ? '' : 'light'}`}><span>{s.icon}</span></button>))}</div>
                </div>
              )}
            </div>

            <div className={`border-t pt-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}><Repeat className="w-3.5 h-3.5" /> Recurring</label>
                <Switch checked={recurring.enabled} onCheckedChange={(checked) => setRecurring(prev => ({ ...prev, enabled: checked }))} />
              </div>
              {recurring.enabled && (
                <div className="space-y-2 pl-5">
                  <Select value={recurring.frequency} onValueChange={(v) => setRecurring(prev => ({ ...prev, frequency: v, days: [] }))}>
                    <SelectTrigger className={`h-8 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`}><SelectValue /></SelectTrigger>
                    <SelectContent className={isDark ? 'bg-[#0B1221] border-white/10' : ''}><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent>
                  </Select>
                  {recurring.frequency === "weekly" && <div className="flex gap-1 flex-wrap">{DAYS.map((day, i) => (<button key={day} onClick={() => toggleDay(i)} className={`px-2 py-1 rounded text-xs font-medium ${recurring.days.includes(i) ? 'bg-indigo-500 text-white' : isDark ? 'bg-white/10 text-slate-400' : 'bg-gray-100 text-gray-600'}`}>{day}</button>))}</div>}
                </div>
              )}
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={onClose} className={`flex-1 h-9 ${isDark ? 'border-white/10 text-slate-300' : ''}`}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 h-9 bg-indigo-500 hover:bg-indigo-600 text-white">{saving ? "..." : (note ? "Update" : "Create")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <TemplateModal isOpen={showTemplates} onClose={() => setShowTemplates(false)} templates={templates} onSelect={handleSelectTemplate} isDark={isDark} />
    </>
  );
};

// Share Modal
const ShareModal = ({ isOpen, onClose, note, isDark }) => {
  if (!isOpen || !note) return null;
  const shareText = `${note.title}\n\n${note.content}`;
  const copyToClipboard = async () => { try { await navigator.clipboard.writeText(shareText); toast.success("Copied!"); } catch { toast.error("Failed"); } };
  const shareViaEmail = () => { window.open(`mailto:?subject=${encodeURIComponent(note.title || "Note")}&body=${encodeURIComponent(shareText)}`, "_blank"); };
  const shareViaSMS = () => { window.open(`sms:?body=${encodeURIComponent(shareText)}`, "_blank"); };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-xs ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`}>
        <DialogHeader><DialogTitle className={`font-semibold flex items-center gap-2 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}><Share2 className="w-4 h-4 text-indigo-500" /> Share</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={copyToClipboard} className={`share-btn-sm ${isDark ? '' : 'light'}`}><Copy className="w-5 h-5" /><span className="text-xs">Copy</span></button>
          <button onClick={shareViaEmail} className={`share-btn-sm ${isDark ? '' : 'light'}`}><Mail className="w-5 h-5" /><span className="text-xs">Email</span></button>
          <button onClick={shareViaSMS} className={`share-btn-sm ${isDark ? '' : 'light'}`}><MessageSquare className="w-5 h-5" /><span className="text-xs">SMS</span></button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Settings Modal
const SettingsModal = ({ isOpen, onClose, settings, onSave, onBackup, onRestore, onClearData, onInstallPWA, canInstallPWA, storageInfo, onRestoreFromServer, isDark }) => {
  const [formData, setFormData] = useState({ logo_url: "", header_bg: "", website_url: "", company_name: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  
  useEffect(() => { if (settings) setFormData(settings); }, [settings]);
  
  const handleSave = async () => { setSaving(true); await onSave(formData); setSaving(false); onClose(); toast.success("Saved!"); };
  
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }
    
    setUploadingLogo(true);
    try {
      const dataUrl = await StorageService.uploadImage(file);
      setFormData(prev => ({ ...prev, logo_url: dataUrl }));
      toast.success("Logo loaded!");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to load image");
    } finally {
      setUploadingLogo(false);
    }
  };
  
  const handleHeaderUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Header image must be under 5MB");
      return;
    }
    
    setUploadingHeader(true);
    try {
      const dataUrl = await StorageService.uploadImage(file);
      setFormData(prev => ({ ...prev, header_bg: dataUrl }));
      toast.success("Header image loaded!");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to load image");
    } finally {
      setUploadingHeader(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-md ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`} data-testid="settings-modal">
        <DialogHeader><DialogTitle className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}><Settings className="w-5 h-5 text-indigo-500" /> Settings</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Company Name</label>
            <Input value={formData.company_name} onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))} className={`h-9 ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`} data-testid="settings-company-name" />
          </div>
          
          {/* Logo Upload Section */}
          <div>
            <label className={`text-xs mb-1.5 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Logo</label>
            <div className="flex gap-2 items-start">
              {formData.logo_url && (
                <img src={formData.logo_url} alt="Logo preview" className="w-12 h-12 rounded-lg object-cover border border-white/20 flex-shrink-0" />
              )}
              <div className="flex-1 space-y-2">
                <Input 
                  value={formData.logo_url} 
                  onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))} 
                  placeholder="Paste URL or upload below"
                  className={`h-9 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-500' : ''}`} 
                  data-testid="settings-logo-url"
                />
                <label className={`flex items-center justify-center gap-2 h-9 rounded-md cursor-pointer transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600'}`}>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                  {uploadingLogo ? (
                    <span className="text-xs">Uploading...</span>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span className="text-xs">Upload from device</span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
          
          {/* Header Background Upload Section */}
          <div>
            <label className={`text-xs mb-1.5 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Header Background</label>
            <div className="space-y-2">
              {formData.header_bg && (
                <div className="w-full h-16 rounded-lg overflow-hidden border border-white/20">
                  <img src={formData.header_bg} alt="Header preview" className="w-full h-full object-cover" />
                </div>
              )}
              <Input 
                value={formData.header_bg} 
                onChange={(e) => setFormData(prev => ({ ...prev, header_bg: e.target.value }))} 
                placeholder="Paste URL or upload below"
                className={`h-9 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-500' : ''}`} 
                data-testid="settings-header-bg"
              />
              <label className={`flex items-center justify-center gap-2 h-9 rounded-md cursor-pointer transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600'}`}>
                <input type="file" accept="image/*" onChange={handleHeaderUpload} className="hidden" disabled={uploadingHeader} />
                {uploadingHeader ? (
                  <span className="text-xs">Uploading...</span>
                ) : (
                  <>
                    <Image className="w-4 h-4" />
                    <span className="text-xs">Upload from device</span>
                  </>
                )}
              </label>
            </div>
          </div>
          
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Website URL</label>
            <Input value={formData.website_url} onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))} className={`h-9 ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`} data-testid="settings-website-url" />
          </div>
          
          {/* Backup & Restore Section */}
          <div className={`border-t pt-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <label className={`text-xs mb-2 block flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <HardDrive className="w-3.5 h-3.5" /> Backup & Restore
            </label>
            <div className="flex gap-2">
              <Button 
                onClick={onBackup} 
                variant="outline" 
                size="sm"
                className={`flex-1 h-9 ${isDark ? 'border-white/10 text-slate-300 hover:bg-white/5' : ''}`}
                data-testid="backup-btn"
              >
                <Download className="w-4 h-4 mr-1.5" /> Export Backup
              </Button>
              <label className={`flex-1 h-9 flex items-center justify-center gap-1.5 rounded-md cursor-pointer transition-colors text-sm border ${isDark ? 'bg-transparent hover:bg-white/5 border-white/10 text-slate-300' : 'bg-transparent hover:bg-gray-50 border-gray-200 text-gray-700'}`}>
                <input type="file" accept=".json" onChange={onRestore} className="hidden" data-testid="restore-input" />
                <Upload className="w-4 h-4" /> Restore File
              </label>
            </div>
            {onRestoreFromServer && (
              <Button 
                onClick={onRestoreFromServer} 
                variant="outline"
                size="sm"
                className={`w-full h-9 mt-2 ${isDark ? 'border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10' : 'border-indigo-300 text-indigo-600 hover:bg-indigo-50'}`}
                data-testid="restore-server-btn"
              >
                <Cloud className="w-4 h-4 mr-1.5" /> Recover Old Notes from Server
              </Button>
            )}
          </div>
          
          {/* Storage Usage */}
          {storageInfo && (
            <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  <HardDrive className="w-3.5 h-3.5" /> Storage Used
                </span>
                <span className={`text-xs font-mono ${isDark ? 'text-slate-300' : 'text-gray-700'}`} data-testid="storage-usage">
                  {storageInfo.usageMB} MB / {storageInfo.quotaMB} MB
                </span>
              </div>
              <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                <div 
                  className={`h-full transition-all ${storageInfo.percentUsed > 80 ? 'bg-red-500' : storageInfo.percentUsed > 50 ? 'bg-yellow-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min(storageInfo.percentUsed, 100)}%` }}
                />
              </div>
              <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {storageInfo.percentUsed}% used · All data stored locally on your device
              </p>
            </div>
          )}
          
          {/* PWA Install Button */}
          {canInstallPWA && (
            <Button 
              onClick={onInstallPWA} 
              variant="outline" 
              className={`w-full h-9 ${isDark ? 'border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/10' : 'border-indigo-300 text-indigo-600 hover:bg-indigo-50'}`}
              data-testid="pwa-install-btn"
            >
              <Smartphone className="w-4 h-4 mr-1.5" /> Install as App
            </Button>
          )}
          
          {/* Clear All Data */}
          <div className={`border-t pt-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <Button 
              onClick={onClearData} 
              variant="outline"
              size="sm"
              className={`w-full h-9 text-red-500 hover:text-red-400 ${isDark ? 'border-red-500/30 hover:bg-red-500/10' : 'border-red-200 hover:bg-red-50'}`}
              data-testid="clear-data-btn"
            >
              <Trash2 className="w-4 h-4 mr-1.5" /> Clear All Data
            </Button>
            <p className={`text-xs mt-1.5 text-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Permanently deletes all notes, templates and settings
            </p>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className={`flex-1 h-9 ${isDark ? 'border-white/10 text-slate-300' : ''}`}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 h-9 bg-indigo-500 hover:bg-indigo-600 text-white">{saving ? "..." : "Save"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Notes App Component (routed at /apps/iron-rabbit-notes/launch)
function NotesApp() {
  const isOnline = useOnlineStatus();
  const [notes, setNotes] = useState([]);
  const [settings, setSettings] = useState(null);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("newest");
  const [filterBy, setFilterBy] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDark, setIsDark] = useState(true);
  const [storageInfo, setStorageInfo] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorCallback, setCalculatorCallback] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharingNote, setSharingNote] = useState(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [fullScreenNote, setFullScreenNote] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      // One-time migration from backend for existing users
      const migration = await StorageService.migrateFromBackend(BACKEND_URL);
      if (migration.migrated && migration.notes > 0) {
        toast.success(`Restored ${migration.notes} notes from server`, { duration: 5000 });
      }

      const [notesData, settingsData, catsData, templatesData, storageData] = await Promise.all([
        StorageService.getAllNotes(),
        StorageService.getSettings(),
        StorageService.getCategories(),
        StorageService.getTemplates(),
        StorageService.getStorageInfo(),
      ]);
      setNotes(notesData);
      setSettings(settingsData);
      setCategories(catsData);
      setStorageInfo(storageData);
      if (templatesData.length > 0) setTemplates(templatesData);
    } catch (err) {
      console.error("Error:", err);
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  // PWA install prompt handler
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      toast.info("App is already installed or install not available on this browser");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success("App installed!");
    }
    setDeferredPrompt(null);
  };

  const handleClearAllData = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      toast.warning("Click again within 5 seconds to confirm", { duration: 5000 });
      setTimeout(() => setConfirmClear(false), 5000);
      return;
    }
    try {
      await StorageService.clearAllData();
      toast.success("All data cleared");
      setConfirmClear(false);
      fetchData();
    } catch (err) {
      console.error("Clear error:", err);
      toast.error("Failed to clear data");
    }
  };

  const handleRestoreFromServer = async () => {
    try {
      toast.info("Checking server for your notes...");
      const result = await StorageService.migrateFromBackend(BACKEND_URL, true);
      if (result.migrated && (result.notes > 0 || result.templates > 0)) {
        toast.success(`Restored ${result.notes} notes and ${result.templates} templates from server`, { duration: 5000 });
        fetchData();
      } else {
        toast.info("No additional notes to restore");
      }
    } catch (err) {
      console.error("Restore error:", err);
      toast.error("Failed to restore from server");
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  // Local notification checker using device's native notification system
  useEffect(() => {
    notificationService.startAlarmChecker(() => notes);
    return () => notificationService.stopAlarmChecker();
  }, [notes]);

  useEffect(() => { notificationService.requestPermission(); }, []);

  const handleSaveNote = async (noteData, noteId) => {
    try {
      const now = new Date().toISOString();
      if (noteId) {
        const existing = await StorageService.getNote(noteId);
        const updated = { ...existing, ...noteData, updated_at: now };
        await StorageService.saveNote(updated);
        toast.success("Updated!");
      } else {
        const maxOrder = notes.reduce((max, n) => Math.max(max, n.order || 0), 0);
        const newNote = {
          id: uuidv4(),
          ...noteData,
          order: maxOrder + 1,
          created_at: now,
          updated_at: now,
          last_viewed: now,
        };
        await StorageService.saveNote(newNote);
        toast.success("Created!");
      }
      fetchData();
    } catch (err) {
      console.error("Error:", err);
      toast.error("Failed to save");
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await StorageService.deleteNote(noteId);
      toast.success("Deleted");
      fetchData();
    } catch (err) {
      toast.error("Failed");
    }
  };

  const handleSaveSettings = async (settingsData) => {
    try {
      const updated = await StorageService.saveSettings(settingsData);
      setSettings(updated);
    } catch (err) {
      toast.error("Failed");
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const items = Array.from(processedNotes);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    try {
      await StorageService.reorderNotes(items.map(item => item.id));
      fetchData();
    } catch (err) {
      console.error("Reorder error:", err);
    }
  };

  // Backup & Restore functions
  const handleBackup = async () => {
    try {
      const data = await StorageService.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const filename = `iron-rabbit-backup-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
      saveAs(blob, filename);
      toast.success("Backup exported!");
    } catch (err) {
      console.error("Backup error:", err);
      toast.error("Backup failed");
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await StorageService.importAllData(data);
      toast.success(`Restored ${result.notes} notes, ${result.templates} templates`);
      fetchData();
    } catch (err) {
      console.error("Restore error:", err);
      toast.error("Invalid backup file");
    }
    e.target.value = '';
  };

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

  const exportToPDF = () => {
    const doc = new jsPDF();
    let y = 15;
    doc.setFontSize(18); doc.text(settings?.company_name || "Iron Rabbit", 15, y); y += 10;
    doc.setFontSize(9); doc.text(`Exported: ${format(new Date(), "MMM d, yyyy HH:mm")}`, 15, y); y += 10;
    processedNotes.forEach((note) => {
      if (y > 270) { doc.addPage(); y = 15; }
      doc.setFontSize(12); doc.setTextColor(NOTE_COLORS.find(c => c.name === note.color)?.accent || "#000"); doc.text(note.title || "Untitled", 15, y); y += 6;
      doc.setFontSize(8); doc.setTextColor(100); doc.text(`${format(new Date(note.created_at), "MMM d, yyyy HH:mm")}${note.category ? ` | ${note.category}` : ''}`, 15, y); y += 5;
      doc.setFontSize(10); doc.setTextColor(0);
      doc.splitTextToSize(note.content || "", 180).forEach(line => { if (y > 280) { doc.addPage(); y = 15; } doc.text(line, 15, y); y += 5; });
      y += 8;
    });
    doc.save(`${settings?.company_name || "notes"}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF exported!");
  };

  const openEditModal = (note) => { setEditingNote(note); setNoteModalOpen(true); };
  const openShareModal = (note) => { setSharingNote(note); setShareModalOpen(true); };
  const openCalculatorWithCallback = (callback) => { setCalculatorCallback(() => callback); setCalculatorOpen(true); };

  if (loading) {
    return (<div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#020617]' : 'bg-gray-50'}`}><div className={`flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />Loading...</div></div>);
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#020617]' : 'bg-gray-50'}`} data-testid="app-container">
      <Toaster position="top-right" theme={isDark ? "dark" : "light"} />
      
      {/* Compact Header */}
      <header className={`header-compact ${isDark ? '' : 'light'}`} style={{ backgroundImage: settings?.header_bg ? `url(${settings.header_bg})` : undefined }}>
        <div className="relative z-10 w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings?.logo_url && <a href={settings?.website_url || "#"} target="_blank" rel="noopener noreferrer"><img src={settings.logo_url} alt="Logo" className="w-10 h-10 rounded-lg object-cover border border-white/20" /></a>}
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">{settings?.company_name || "Iron Rabbit"}</h1>
              {settings?.website_url && <a href={settings.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-300 hover:text-white flex items-center gap-1"><ExternalLink className="w-3 h-3" />{settings.website_url.replace(/^https?:\/\//, "")}</a>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={exportToPDF} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8"><Download className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8">{isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</Button>
            <Button variant="ghost" size="icon" onClick={() => setCalculatorOpen(true)} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8"><Calculator className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setSettingsModalOpen(true)} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8"><Settings className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>
      
      {/* Main Content - Tighter */}
      <main className="px-4 py-3 max-w-4xl mx-auto">
        {/* Search & Controls */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="relative flex-1">
            <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className={`pl-8 h-9 ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-gray-200'}`} />
          </div>
          <div className="flex gap-2">
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className={`w-28 h-9 text-xs ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200'}`}><Filter className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent className={isDark ? 'bg-[#0B1221] border-white/10' : ''}>{FILTER_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className={`w-36 h-9 text-xs ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200'}`}><SelectValue /></SelectTrigger>
              <SelectContent className={isDark ? 'bg-[#0B1221] border-white/10' : ''}>{SORT_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs"><span className="flex items-center gap-1.5"><opt.icon className="w-3 h-3" />{opt.label}</span></SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Notes count */}
        <div className={`text-xs font-mono mb-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{processedNotes.length} notes</div>
        
        {/* Notes List - Accordion Style */}
        {processedNotes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3 opacity-20">📝</div>
            <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{searchQuery || filterBy !== "all" ? "No notes found" : "No notes yet"}</p>
            {!searchQuery && filterBy === "all" && <Button onClick={() => { setEditingNote(null); setNoteModalOpen(true); }} size="sm" className="bg-indigo-500 hover:bg-indigo-600 text-white"><Plus className="w-4 h-4 mr-1" /> Create</Button>}
          </div>
        ) : sortBy === "custom" ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="notes">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {processedNotes.map((note, index) => (
                    <Draggable key={note.id} draggableId={note.id} index={index}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps}>
                          <AccordionNoteItem note={note} onEdit={openEditModal} onDelete={handleDeleteNote} onShare={openShareModal} onFullScreen={setFullScreenNote} isDark={isDark} dragHandleProps={provided.dragHandleProps} isDragging={snapshot.isDragging} />
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
          <div>{processedNotes.map(note => <AccordionNoteItem key={note.id} note={note} onEdit={openEditModal} onDelete={handleDeleteNote} onShare={openShareModal} onFullScreen={setFullScreenNote} isDark={isDark} />)}</div>
        )}
      </main>
      
      {/* FAB */}
      <button onClick={() => { setEditingNote(null); setNoteModalOpen(true); }} className={`fab-button-sm ${isDark ? '' : 'light'}`} aria-label="Add note" data-testid="fab-add-note"><Plus className="w-6 h-6" /></button>
      
      {/* Modals */}
      <NoteModal isOpen={noteModalOpen} onClose={() => { setNoteModalOpen(false); setEditingNote(null); }} note={editingNote} onSave={handleSaveNote} onOpenCalculator={openCalculatorWithCallback} isDark={isDark} categories={categories} templates={templates} />
      <CalculatorWidget isOpen={calculatorOpen} onClose={() => { setCalculatorOpen(false); setCalculatorCallback(null); }} onInsertResult={calculatorCallback} isDark={isDark} />
      <ShareModal isOpen={shareModalOpen} onClose={() => { setShareModalOpen(false); setSharingNote(null); }} note={sharingNote} isDark={isDark} />
      <SettingsModal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} settings={settings} onSave={handleSaveSettings} onBackup={handleBackup} onRestore={handleRestore} onClearData={handleClearAllData} onInstallPWA={handleInstallPWA} canInstallPWA={!!deferredPrompt} storageInfo={storageInfo} onRestoreFromServer={handleRestoreFromServer} isDark={isDark} />
      <FullScreenNote note={fullScreenNote} isOpen={!!fullScreenNote} onClose={() => setFullScreenNote(null)} onEdit={openEditModal} onDelete={handleDeleteNote} onShare={openShareModal} isDark={isDark} />
    </div>
  );
}

export default NotesApp;
