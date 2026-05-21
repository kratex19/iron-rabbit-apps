import React, { useState, useEffect, useCallback, useMemo } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { format, isToday, isThisWeek, isThisMonth, parseISO } from "date-fns";
import {
  Plus,
  Settings,
  Calculator,
  Bell,
  Share2,
  Trash2,
  Edit3,
  Clock,
  X,
  Copy,
  Mail,
  MessageSquare,
  Grid3X3,
  Check,
  Volume2,
  Smartphone,
  ExternalLink,
  Sun,
  Moon,
  Search,
  ChevronDown,
  ChevronRight,
  ArrowUpAZ,
  ArrowDownAZ,
  CalendarDays,
  Tag,
  Repeat,
  Filter,
  List,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Note colors configuration
const NOTE_COLORS = [
  { name: "purple", label: "Electric Purple", class: "note-purple", accent: "#a855f7" },
  { name: "cyan", label: "Neon Cyan", class: "note-cyan", accent: "#06b6d4" },
  { name: "lime", label: "Acid Green", class: "note-lime", accent: "#84cc16" },
  { name: "pink", label: "Hot Pink", class: "note-pink", accent: "#ec4899" },
  { name: "orange", label: "Solar Orange", class: "note-orange", accent: "#f97316" },
];

// Sound options
const SOUND_OPTIONS = [
  { value: "bell", label: "Bell", icon: "🔔" },
  { value: "chime", label: "Chime", icon: "✨" },
  { value: "signal", label: "Signal", icon: "📢" },
];

// Sort options
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First", icon: CalendarDays },
  { value: "oldest", label: "Oldest First", icon: CalendarDays },
  { value: "a-z", label: "A → Z", icon: ArrowUpAZ },
  { value: "z-a", label: "Z → A", icon: ArrowDownAZ },
  { value: "recently-viewed", label: "Recently Viewed", icon: Clock },
  { value: "category", label: "By Category", icon: Tag },
];

// Filter options
const FILTER_OPTIONS = [
  { value: "all", label: "All Notes" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

// Calculator Component
const CalculatorWidget = ({ isOpen, onClose, onInsertResult, isDark }) => {
  const [display, setDisplay] = useState("0");
  const [memory, setMemory] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const clear = () => {
    setDisplay("0");
    setMemory(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperator) => {
    const inputValue = parseFloat(display);
    if (memory === null) {
      setMemory(inputValue);
    } else if (operator) {
      const currentMemory = memory;
      let result;
      switch (operator) {
        case "+": result = currentMemory + inputValue; break;
        case "-": result = currentMemory - inputValue; break;
        case "*": result = currentMemory * inputValue; break;
        case "/": result = inputValue !== 0 ? currentMemory / inputValue : "Error"; break;
        default: result = inputValue;
      }
      setDisplay(String(result));
      setMemory(result);
    }
    setWaitingForOperand(true);
    setOperator(nextOperator);
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
    setDisplay(String(result));
    setMemory(null);
    setOperator(null);
    setWaitingForOperand(true);
  };

  const insertToNote = () => {
    if (onInsertResult) {
      onInsertResult(display);
      toast.success("Result inserted into note");
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-xs ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`} data-testid="calculator-dialog">
        <DialogHeader>
          <DialogTitle className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Calculator className="w-5 h-5 text-indigo-500" />
            Calculator
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          <div className={`rounded-xl p-4 text-right ${isDark ? 'bg-black/30' : 'bg-gray-100'}`}>
            <div className={`font-mono text-3xl truncate ${isDark ? 'text-white' : 'text-gray-900'}`} data-testid="calc-display">
              {display}
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            <button onClick={clear} className={`calc-btn col-span-2 ${isDark ? '' : 'light'} text-red-500`} data-testid="calc-clear">C</button>
            <button onClick={() => performOperation("/")} className={`calc-btn calc-btn-operator ${isDark ? '' : 'light'}`} data-testid="calc-divide">/</button>
            <button onClick={() => performOperation("*")} className={`calc-btn calc-btn-operator ${isDark ? '' : 'light'}`} data-testid="calc-multiply">×</button>
            
            {[7,8,9].map(n => (
              <button key={n} onClick={() => inputDigit(String(n))} className={`calc-btn ${isDark ? '' : 'light'}`} data-testid={`calc-${n}`}>{n}</button>
            ))}
            <button onClick={() => performOperation("-")} className={`calc-btn calc-btn-operator ${isDark ? '' : 'light'}`} data-testid="calc-subtract">-</button>
            
            {[4,5,6].map(n => (
              <button key={n} onClick={() => inputDigit(String(n))} className={`calc-btn ${isDark ? '' : 'light'}`} data-testid={`calc-${n}`}>{n}</button>
            ))}
            <button onClick={() => performOperation("+")} className={`calc-btn calc-btn-operator ${isDark ? '' : 'light'}`} data-testid="calc-add">+</button>
            
            {[1,2,3].map(n => (
              <button key={n} onClick={() => inputDigit(String(n))} className={`calc-btn ${isDark ? '' : 'light'}`} data-testid={`calc-${n}`}>{n}</button>
            ))}
            <button onClick={calculate} className="calc-btn calc-btn-equals row-span-2" data-testid="calc-equals">=</button>
            
            <button onClick={() => inputDigit("0")} className={`calc-btn col-span-2 ${isDark ? '' : 'light'}`} data-testid="calc-0">0</button>
            <button onClick={inputDecimal} className={`calc-btn ${isDark ? '' : 'light'}`} data-testid="calc-decimal">.</button>
          </div>
          
          {onInsertResult && (
            <Button onClick={insertToNote} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white" data-testid="calc-insert-btn">
              Insert Result into Note
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Note Card Component
const NoteCard = ({ note, onEdit, onDelete, onShare, onView, isDark }) => {
  const colorConfig = NOTE_COLORS.find(c => c.name === note.color) || NOTE_COLORS[0];
  const hasAlarm = note.alarm?.enabled && note.alarm?.datetime;
  const hasRecurring = note.recurring?.enabled;
  
  return (
    <div 
      className={`note-card ${colorConfig.class} ${isDark ? '' : 'light'} p-5 relative group cursor-pointer`}
      onClick={() => onView(note)}
      data-testid={`note-card-${note.id}`}
    >
      {hasAlarm && (
        <div className="alarm-badge" title="Alarm set">
          <Bell className="w-3 h-3 text-black" />
        </div>
      )}
      
      {hasRecurring && (
        <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center" title="Recurring">
          <Repeat className="w-3 h-3 text-black" />
        </div>
      )}
      
      <div className="flex justify-between items-start mb-3">
        <h3 className={`text-lg font-semibold truncate flex-1 pr-2 ${isDark ? 'text-white' : 'text-gray-900'}`} data-testid="note-title">
          {note.title || "Untitled"}
        </h3>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(note)} className={`p-1.5 rounded-lg transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white' : 'bg-black/5 hover:bg-black/10 text-gray-600 hover:text-gray-900'}`} aria-label="Edit note" data-testid="note-edit-btn">
            <Edit3 className="w-4 h-4" />
          </button>
          <button onClick={() => onShare(note)} className={`p-1.5 rounded-lg transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white' : 'bg-black/5 hover:bg-black/10 text-gray-600 hover:text-gray-900'}`} aria-label="Share note" data-testid="note-share-btn">
            <Share2 className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(note.id)} className={`p-1.5 rounded-lg transition-all ${isDark ? 'bg-white/10 hover:bg-red-500/50 text-white/70 hover:text-white' : 'bg-black/5 hover:bg-red-100 text-gray-600 hover:text-red-600'}`} aria-label="Delete note" data-testid="note-delete-btn">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {note.category && (
        <Badge variant="outline" className={`mb-2 text-xs ${isDark ? 'border-white/20 text-slate-300' : 'border-gray-300 text-gray-600'}`}>
          <Tag className="w-3 h-3 mr-1" />
          {note.category}
        </Badge>
      )}
      
      <p className={`text-sm line-clamp-4 mb-4 whitespace-pre-wrap ${isDark ? 'text-slate-300' : 'text-gray-600'}`} data-testid="note-content">
        {note.content || "No content"}
      </p>
      
      <div className={`flex items-center justify-between text-xs font-mono ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
        <span className="flex items-center gap-1" data-testid="note-created">
          <Clock className="w-3 h-3" />
          {format(new Date(note.created_at), "MMM d, yyyy HH:mm")}
        </span>
        {hasAlarm && (
          <span className="flex items-center gap-1 text-yellow-500" data-testid="note-alarm-time">
            <Bell className="w-3 h-3" />
            {format(new Date(note.alarm.datetime), "MMM d, HH:mm")}
          </span>
        )}
      </div>
    </div>
  );
};

// Note Accordion Item
const NoteAccordionItem = ({ note, onEdit, onDelete, onShare, onView, isDark }) => {
  const colorConfig = NOTE_COLORS.find(c => c.name === note.color) || NOTE_COLORS[0];
  const hasAlarm = note.alarm?.enabled && note.alarm?.datetime;
  const hasRecurring = note.recurring?.enabled;
  
  return (
    <AccordionItem value={note.id} className={`note-accordion-item ${colorConfig.class} ${isDark ? '' : 'light'} rounded-xl mb-2 overflow-hidden border`}>
      <AccordionTrigger className={`px-5 py-4 hover:no-underline ${isDark ? 'text-white hover:bg-white/5' : 'text-gray-900 hover:bg-black/5'}`} data-testid={`accordion-trigger-${note.id}`}>
        <div className="flex items-center gap-3 flex-1 text-left">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorConfig.accent }} />
          <span className="font-semibold truncate">{note.title || "Untitled"}</span>
          {note.category && <Badge variant="outline" className="text-xs">{note.category}</Badge>}
          {hasAlarm && <Bell className="w-4 h-4 text-yellow-500" />}
          {hasRecurring && <Repeat className="w-4 h-4 text-green-500" />}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-5 pb-4">
        <p className={`text-sm whitespace-pre-wrap mb-4 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
          {note.content || "No content"}
        </p>
        <div className={`flex items-center justify-between text-xs font-mono ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(note.created_at), "MMM d, yyyy HH:mm")}
          </span>
          <div className="flex gap-1">
            <button onClick={() => onEdit(note)} className={`p-1.5 rounded-lg transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white' : 'bg-black/5 hover:bg-black/10 text-gray-600 hover:text-gray-900'}`}>
              <Edit3 className="w-4 h-4" />
            </button>
            <button onClick={() => onShare(note)} className={`p-1.5 rounded-lg transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white' : 'bg-black/5 hover:bg-black/10 text-gray-600 hover:text-gray-900'}`}>
              <Share2 className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(note.id)} className={`p-1.5 rounded-lg transition-all ${isDark ? 'bg-white/10 hover:bg-red-500/50 text-white/70 hover:text-white' : 'bg-black/5 hover:bg-red-100 text-gray-600 hover:text-red-600'}`}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

// Note Modal Component
const NoteModal = ({ isOpen, onClose, note, onSave, onOpenCalculator, isDark, existingCategories }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("purple");
  const [category, setCategory] = useState("");
  const [alarm, setAlarm] = useState({ enabled: false, datetime: null, sound: "bell", haptic: false });
  const [alarmDate, setAlarmDate] = useState(null);
  const [alarmTime, setAlarmTime] = useState("12:00");
  const [recurring, setRecurring] = useState({ enabled: false, frequency: "weekly", days: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title || "");
      setContent(note.content || "");
      setColor(note.color || "purple");
      setCategory(note.category || "");
      if (note.alarm) {
        setAlarm(note.alarm);
        if (note.alarm.datetime) {
          const dt = new Date(note.alarm.datetime);
          setAlarmDate(dt);
          setAlarmTime(format(dt, "HH:mm"));
        }
      }
      if (note.recurring) {
        setRecurring(note.recurring);
      }
    } else {
      setTitle("");
      setContent("");
      setColor("purple");
      setCategory("");
      setAlarm({ enabled: false, datetime: null, sound: "bell", haptic: false });
      setAlarmDate(null);
      setAlarmTime("12:00");
      setRecurring({ enabled: false, frequency: "weekly", days: [] });
    }
  }, [note, isOpen]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    setSaving(true);
    
    let alarmDateTime = null;
    if (alarm.enabled && alarmDate) {
      const [hours, minutes] = alarmTime.split(":").map(Number);
      const dt = new Date(alarmDate);
      dt.setHours(hours, minutes, 0, 0);
      alarmDateTime = dt.toISOString();
    }
    
    const noteData = {
      title: title.trim(),
      content,
      color,
      category: category.trim(),
      alarm: { ...alarm, datetime: alarmDateTime },
      recurring,
    };
    
    await onSave(noteData, note?.id);
    setSaving(false);
    onClose();
  };

  const insertCalculatorResult = (result) => {
    setContent(prev => prev + (prev ? "\n" : "") + result);
  };

  const toggleDay = (day) => {
    setRecurring(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
    }));
  };

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-lg max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`} data-testid="note-modal">
        <DialogHeader>
          <DialogTitle className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {note ? "Edit Note" : "New Note"}
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
              <Button variant="ghost" size="sm" onClick={() => onOpenCalculator(insertCalculatorResult)} className={isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'} data-testid="open-calculator-btn">
                <Calculator className="w-4 h-4 mr-1" />
                Calculator
              </Button>
            </div>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your note..." rows={4} className={`resize-none ${isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'}`} data-testid="note-content-input" />
          </div>

          <div>
            <label className={`text-sm mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Category / Tag</label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g., Work, Personal, Health..." className={isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'} list="categories" data-testid="note-category-input" />
            {existingCategories.length > 0 && (
              <datalist id="categories">
                {existingCategories.map(cat => <option key={cat} value={cat} />)}
              </datalist>
            )}
          </div>
          
          <div>
            <label className={`text-sm mb-2 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Color</label>
            <div className="flex gap-2">
              {NOTE_COLORS.map((c) => (
                <button key={c.name} onClick={() => setColor(c.name)} className={`color-swatch ${color === c.name ? "active" : ""}`} style={{ backgroundColor: c.accent }} aria-label={c.label} data-testid={`color-${c.name}`} />
              ))}
            </div>
          </div>
          
          <div className={`border-t pt-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <label className={`text-sm flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                <Bell className="w-4 h-4" />
                Set Alarm
              </label>
              <Switch checked={alarm.enabled} onCheckedChange={(checked) => setAlarm(prev => ({ ...prev, enabled: checked }))} data-testid="alarm-toggle" />
            </div>
            
            {alarm.enabled && (
              <div className="space-y-3 pl-6">
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={`flex-1 ${isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} data-testid="alarm-date-btn">
                        {alarmDate ? format(alarmDate, "MMM d, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className={`p-0 ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`}>
                      <Calendar mode="single" selected={alarmDate} onSelect={setAlarmDate} className={isDark ? 'text-white' : ''} />
                    </PopoverContent>
                  </Popover>
                  <Input type="time" value={alarmTime} onChange={(e) => setAlarmTime(e.target.value)} className={`w-32 ${isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} data-testid="alarm-time-input" />
                </div>
                
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Sound</label>
                  <div className="flex gap-2">
                    {SOUND_OPTIONS.map((s) => (
                      <button key={s.value} onClick={() => setAlarm(prev => ({ ...prev, sound: s.value }))} className={`sound-option flex-1 ${alarm.sound === s.value ? "active" : ""} ${isDark ? '' : 'light'}`} data-testid={`sound-${s.value}`}>
                        <span className="text-lg">{s.icon}</span>
                        <span className="text-xs">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className={`text-xs flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    <Smartphone className="w-3 h-3" />
                    Haptic feedback
                  </label>
                  <Switch checked={alarm.haptic} onCheckedChange={(checked) => setAlarm(prev => ({ ...prev, haptic: checked }))} data-testid="haptic-toggle" />
                </div>
              </div>
            )}
          </div>

          <div className={`border-t pt-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <label className={`text-sm flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                <Repeat className="w-4 h-4" />
                Recurring Reminder
              </label>
              <Switch checked={recurring.enabled} onCheckedChange={(checked) => setRecurring(prev => ({ ...prev, enabled: checked }))} data-testid="recurring-toggle" />
            </div>
            
            {recurring.enabled && (
              <div className="space-y-3 pl-6">
                <Select value={recurring.frequency} onValueChange={(v) => setRecurring(prev => ({ ...prev, frequency: v, days: [] }))}>
                  <SelectTrigger className={isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={isDark ? 'bg-[#0B1221] border-white/10' : ''}>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                
                {recurring.frequency === "weekly" && (
                  <div className="flex gap-1 flex-wrap">
                    {DAYS.map((day, i) => (
                      <button key={day} onClick={() => toggleDay(i)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${recurring.days.includes(i) ? 'bg-indigo-500 text-white' : isDark ? 'bg-white/10 text-slate-400' : 'bg-gray-100 text-gray-600'}`} data-testid={`day-${day}`}>
                        {day}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className={`flex-1 ${isDark ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`} data-testid="note-cancel-btn">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold" data-testid="note-save-btn">
              {saving ? "Saving..." : (note ? "Update" : "Create")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Share Modal Component
const ShareModal = ({ isOpen, onClose, note, isDark }) => {
  if (!isOpen || !note) return null;

  const shareText = `${note.title}\n\n${note.content}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("Copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(note.title || "Note");
    const body = encodeURIComponent(shareText);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const shareViaSMS = () => {
    const body = encodeURIComponent(shareText);
    window.open(`sms:?body=${body}`, "_blank");
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: note.title, text: shareText }); }
      catch (err) { if (err.name !== "AbortError") toast.error("Share failed"); }
    } else {
      toast.error("Native share not supported");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-sm ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`} data-testid="share-modal">
        <DialogHeader>
          <DialogTitle className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Share2 className="w-5 h-5 text-indigo-500" />
            Share Note
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-3">
          <button onClick={copyToClipboard} className={`share-btn ${isDark ? '' : 'light'}`} data-testid="share-copy">
            <Copy className="w-6 h-6" />
            <span className="text-sm">Copy</span>
          </button>
          <button onClick={shareViaEmail} className={`share-btn ${isDark ? '' : 'light'}`} data-testid="share-email">
            <Mail className="w-6 h-6" />
            <span className="text-sm">Email</span>
          </button>
          <button onClick={shareViaSMS} className={`share-btn ${isDark ? '' : 'light'}`} data-testid="share-sms">
            <MessageSquare className="w-6 h-6" />
            <span className="text-sm">Message</span>
          </button>
          {navigator.share && (
            <button onClick={nativeShare} className={`share-btn ${isDark ? '' : 'light'}`} data-testid="share-native">
              <Share2 className="w-6 h-6" />
              <span className="text-sm">More</span>
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Settings Modal Component
const SettingsModal = ({ isOpen, onClose, settings, onSave, isDark }) => {
  const [formData, setFormData] = useState({ logo_url: "", header_bg: "", website_url: "", company_name: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (settings) setFormData(settings); }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(formData);
    setSaving(false);
    onClose();
    toast.success("Settings saved!");
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-lg ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`} data-testid="settings-modal">
        <DialogHeader>
          <DialogTitle className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Settings className="w-5 h-5 text-indigo-500" />
            Header Settings
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className={`text-sm mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Company Name</label>
            <Input value={formData.company_name} onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))} placeholder="Your company name" className={isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'} data-testid="settings-company-name" />
          </div>
          <div>
            <label className={`text-sm mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Logo URL</label>
            <Input value={formData.logo_url} onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))} placeholder="https://example.com/logo.png" className={isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'} data-testid="settings-logo-url" />
          </div>
          <div>
            <label className={`text-sm mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Header Background URL</label>
            <Input value={formData.header_bg} onChange={(e) => setFormData(prev => ({ ...prev, header_bg: e.target.value }))} placeholder="https://example.com/bg.jpg" className={isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'} data-testid="settings-header-bg" />
          </div>
          <div>
            <label className={`text-sm mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Website URL</label>
            <Input value={formData.website_url} onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))} placeholder="https://yourwebsite.com" className={isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'} data-testid="settings-website-url" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className={`flex-1 ${isDark ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`} data-testid="settings-cancel-btn">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold" data-testid="settings-save-btn">{saving ? "Saving..." : "Save Settings"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main App Component
function App() {
  const [notes, setNotes] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gridCols, setGridCols] = useState(3);
  const [viewMode, setViewMode] = useState("grid"); // grid or accordion
  const [sortBy, setSortBy] = useState("newest");
  const [filterBy, setFilterBy] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDark, setIsDark] = useState(true);
  
  // Modal states
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorCallback, setCalculatorCallback] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharingNote, setSharingNote] = useState(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Auto theme based on ambient light
  useEffect(() => {
    if ('AmbientLightSensor' in window) {
      try {
        const sensor = new window.AmbientLightSensor();
        sensor.addEventListener('reading', () => {
          // Below 50 lux = dark environment = use light theme
          // Above 50 lux = light environment = use dark theme
          setIsDark(sensor.illuminance > 50);
        });
        sensor.start();
      } catch (e) {
        console.log("Ambient light sensor not available");
      }
    }
  }, []);

  // Get existing categories
  const existingCategories = useMemo(() => {
    const cats = notes.map(n => n.category).filter(Boolean);
    return [...new Set(cats)];
  }, [notes]);

  // Filtered and sorted notes
  const processedNotes = useMemo(() => {
    let result = [...notes];
    
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => 
        n.title?.toLowerCase().includes(q) || 
        n.content?.toLowerCase().includes(q) ||
        n.category?.toLowerCase().includes(q)
      );
    }
    
    // Time filter
    if (filterBy !== "all") {
      result = result.filter(n => {
        const date = parseISO(n.created_at);
        if (filterBy === "today") return isToday(date);
        if (filterBy === "week") return isThisWeek(date);
        if (filterBy === "month") return isThisMonth(date);
        return true;
      });
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest": return new Date(b.created_at) - new Date(a.created_at);
        case "oldest": return new Date(a.created_at) - new Date(b.created_at);
        case "a-z": return (a.title || "").localeCompare(b.title || "");
        case "z-a": return (b.title || "").localeCompare(a.title || "");
        case "recently-viewed": return new Date(b.last_viewed || b.updated_at) - new Date(a.last_viewed || a.updated_at);
        case "category": return (a.category || "").localeCompare(b.category || "");
        default: return 0;
      }
    });
    
    return result;
  }, [notes, searchQuery, filterBy, sortBy]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [notesRes, settingsRes] = await Promise.all([
        axios.get(`${API}/notes`),
        axios.get(`${API}/settings`),
      ]);
      setNotes(notesRes.data);
      setSettings(settingsRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Check for alarms
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      notes.forEach((note) => {
        if (note.alarm?.enabled && note.alarm?.datetime) {
          const alarmTime = new Date(note.alarm.datetime);
          const diff = alarmTime - now;
          if (diff > 0 && diff < 60000) {
            if (Notification.permission === "granted") {
              new Notification(`Reminder: ${note.title}`, { body: note.content?.substring(0, 100) || "Time for your task!", icon: "/favicon.ico" });
            }
            toast.info(`Reminder: ${note.title}`, { duration: 10000 });
          }
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [notes]);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Save note
  const handleSaveNote = async (noteData, noteId) => {
    try {
      if (noteId) {
        await axios.put(`${API}/notes/${noteId}`, noteData);
        toast.success("Note updated!");
      } else {
        await axios.post(`${API}/notes`, noteData);
        toast.success("Note created!");
      }
      fetchData();
    } catch (err) {
      console.error("Error saving note:", err);
      toast.error("Failed to save note");
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId) => {
    try {
      await axios.delete(`${API}/notes/${noteId}`);
      toast.success("Note deleted");
      fetchData();
    } catch (err) {
      console.error("Error deleting note:", err);
      toast.error("Failed to delete note");
    }
  };

  // Save settings
  const handleSaveSettings = async (settingsData) => {
    try {
      await axios.put(`${API}/settings`, settingsData);
      setSettings(settingsData);
    } catch (err) {
      console.error("Error saving settings:", err);
      toast.error("Failed to save settings");
    }
  };

  // View note (update last_viewed)
  const handleViewNote = async (note) => {
    try {
      await axios.put(`${API}/notes/${note.id}`, { last_viewed: new Date().toISOString() });
    } catch (err) {
      console.error("Error updating view:", err);
    }
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
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#020617]' : 'bg-gray-50'}`} data-testid="loading-screen">
        <div className={`flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#020617]' : 'bg-gray-50'}`} data-testid="app-container">
      <Toaster position="top-right" theme={isDark ? "dark" : "light"} />
      
      {/* Header */}
      <header className={`header-bg h-48 md:h-56 flex items-end ${isDark ? '' : 'light'}`} style={{ backgroundImage: settings?.header_bg ? `url(${settings.header_bg})` : undefined }} data-testid="app-header">
        <div className="relative z-10 w-full p-6 md:p-12 flex items-end justify-between">
          <div className="flex items-center gap-4">
            {settings?.logo_url && (
              <a href={settings?.website_url || "#"} target="_blank" rel="noopener noreferrer" className="block" data-testid="header-logo-link">
                <img src={settings.logo_url} alt="Logo" className="w-12 h-12 md:w-16 md:h-16 rounded-xl object-cover border border-white/20" data-testid="header-logo" />
              </a>
            )}
            <div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight" data-testid="header-title">
                {settings?.company_name || "Iron Rabbit"}
              </h1>
              {settings?.website_url && (
                <a href={settings.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-300 hover:text-white flex items-center gap-1 mt-1" data-testid="header-website-link">
                  <ExternalLink className="w-3 h-3" />
                  {settings.website_url.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} className="text-white/70 hover:text-white hover:bg-white/10" aria-label="Toggle theme" data-testid="theme-toggle">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setCalculatorOpen(true)} className="text-white/70 hover:text-white hover:bg-white/10" aria-label="Open calculator" data-testid="header-calculator-btn">
              <Calculator className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSettingsModalOpen(true)} className="text-white/70 hover:text-white hover:bg-white/10" aria-label="Open settings" data-testid="header-settings-btn">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="p-6 md:p-12 max-w-[1920px] mx-auto">
        {/* Search & Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search notes..." className={`pl-10 ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'}`} data-testid="search-input" />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className={`w-36 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`} data-testid="filter-select">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={isDark ? 'bg-[#0B1221] border-white/10' : ''}>
                {FILTER_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className={`w-44 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`} data-testid="sort-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={isDark ? 'bg-[#0B1221] border-white/10' : ''}>
                {SORT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      <opt.icon className="w-4 h-4" />
                      {opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* View & Grid Controls */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1" data-testid="view-toggle">
              <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("grid")} className={isDark ? '' : 'hover:bg-gray-100'} data-testid="view-grid-btn">
                <LayoutGrid className="w-4 h-4 mr-1" />
                Grid
              </Button>
              <Button variant={viewMode === "accordion" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("accordion")} className={isDark ? '' : 'hover:bg-gray-100'} data-testid="view-accordion-btn">
                <List className="w-4 h-4 mr-1" />
                List
              </Button>
            </div>
            
            {viewMode === "grid" && (
              <div className="hidden md:flex items-center gap-2" data-testid="grid-controls">
                <Grid3X3 className={`w-5 h-5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                <span className={`text-sm mr-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Columns:</span>
                {[1, 2, 3, 4, 5].map((cols) => (
                  <button key={cols} onClick={() => setGridCols(cols)} className={`grid-control-btn ${gridCols === cols ? "active" : ""} ${isDark ? '' : 'light'}`} data-testid={`grid-btn-${cols}`}>
                    {cols}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className={`text-sm font-mono ${isDark ? 'text-slate-500' : 'text-gray-400'}`} data-testid="notes-count">
            {processedNotes.length} {processedNotes.length === 1 ? "note" : "notes"}
          </div>
        </div>
        
        {/* Notes Display */}
        {processedNotes.length === 0 ? (
          <div className="text-center py-20" data-testid="empty-state">
            <div className="text-6xl mb-4 opacity-20">📝</div>
            <h2 className={`text-xl mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {searchQuery || filterBy !== "all" ? "No notes found" : "No notes yet"}
            </h2>
            <p className={`mb-6 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {searchQuery || filterBy !== "all" ? "Try adjusting your search or filter" : "Create your first note to get started"}
            </p>
            {!searchQuery && filterBy === "all" && (
              <Button onClick={() => { setEditingNote(null); setNoteModalOpen(true); }} className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold" data-testid="create-first-note-btn">
                <Plus className="w-5 h-5 mr-2" />
                Create Note
              </Button>
            )}
          </div>
        ) : viewMode === "accordion" ? (
          <Accordion type="multiple" className="space-y-2" data-testid="notes-accordion">
            {processedNotes.map((note) => (
              <NoteAccordionItem key={note.id} note={note} onEdit={openEditModal} onDelete={handleDeleteNote} onShare={openShareModal} onView={handleViewNote} isDark={isDark} />
            ))}
          </Accordion>
        ) : (
          <div className={gridClass} data-testid="notes-grid">
            {processedNotes.map((note) => (
              <NoteCard key={note.id} note={note} onEdit={openEditModal} onDelete={handleDeleteNote} onShare={openShareModal} onView={handleViewNote} isDark={isDark} />
            ))}
          </div>
        )}
      </main>
      
      {/* FAB Button */}
      <button onClick={() => { setEditingNote(null); setNoteModalOpen(true); }} className={`fab-button ${isDark ? '' : 'light'}`} aria-label="Add note" data-testid="fab-add-note">
        <Plus className="w-7 h-7" />
      </button>
      
      {/* Modals */}
      <NoteModal isOpen={noteModalOpen} onClose={() => { setNoteModalOpen(false); setEditingNote(null); }} note={editingNote} onSave={handleSaveNote} onOpenCalculator={openCalculatorWithCallback} isDark={isDark} existingCategories={existingCategories} />
      <CalculatorWidget isOpen={calculatorOpen} onClose={() => { setCalculatorOpen(false); setCalculatorCallback(null); }} onInsertResult={calculatorCallback} isDark={isDark} />
      <ShareModal isOpen={shareModalOpen} onClose={() => { setShareModalOpen(false); setSharingNote(null); }} note={sharingNote} isDark={isDark} />
      <SettingsModal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} settings={settings} onSave={handleSaveSettings} isDark={isDark} />
    </div>
  );
}

export default App;
