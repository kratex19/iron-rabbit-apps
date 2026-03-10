import React, { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { format } from "date-fns";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

// Calculator Component
const CalculatorWidget = ({ isOpen, onClose, onInsertResult }) => {
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
      <DialogContent className="bg-[#0B1221] border-white/10 max-w-xs" data-testid="calculator-dialog">
        <DialogHeader>
          <DialogTitle className="text-white font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-400" />
            Calculator
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          <div className="bg-black/30 rounded-xl p-4 text-right">
            <div className="font-mono text-3xl text-white truncate" data-testid="calc-display">
              {display}
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            <button onClick={clear} className="calc-btn col-span-2 text-red-400" data-testid="calc-clear">C</button>
            <button onClick={() => performOperation("/")} className="calc-btn calc-btn-operator" data-testid="calc-divide">/</button>
            <button onClick={() => performOperation("*")} className="calc-btn calc-btn-operator" data-testid="calc-multiply">×</button>
            
            <button onClick={() => inputDigit("7")} className="calc-btn" data-testid="calc-7">7</button>
            <button onClick={() => inputDigit("8")} className="calc-btn" data-testid="calc-8">8</button>
            <button onClick={() => inputDigit("9")} className="calc-btn" data-testid="calc-9">9</button>
            <button onClick={() => performOperation("-")} className="calc-btn calc-btn-operator" data-testid="calc-subtract">-</button>
            
            <button onClick={() => inputDigit("4")} className="calc-btn" data-testid="calc-4">4</button>
            <button onClick={() => inputDigit("5")} className="calc-btn" data-testid="calc-5">5</button>
            <button onClick={() => inputDigit("6")} className="calc-btn" data-testid="calc-6">6</button>
            <button onClick={() => performOperation("+")} className="calc-btn calc-btn-operator" data-testid="calc-add">+</button>
            
            <button onClick={() => inputDigit("1")} className="calc-btn" data-testid="calc-1">1</button>
            <button onClick={() => inputDigit("2")} className="calc-btn" data-testid="calc-2">2</button>
            <button onClick={() => inputDigit("3")} className="calc-btn" data-testid="calc-3">3</button>
            <button onClick={calculate} className="calc-btn calc-btn-equals row-span-2" data-testid="calc-equals">=</button>
            
            <button onClick={() => inputDigit("0")} className="calc-btn col-span-2" data-testid="calc-0">0</button>
            <button onClick={inputDecimal} className="calc-btn" data-testid="calc-decimal">.</button>
          </div>
          
          {onInsertResult && (
            <Button 
              onClick={insertToNote} 
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white"
              data-testid="calc-insert-btn"
            >
              Insert Result into Note
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Note Card Component
const NoteCard = ({ note, onEdit, onDelete, onShare }) => {
  const colorConfig = NOTE_COLORS.find(c => c.name === note.color) || NOTE_COLORS[0];
  const hasAlarm = note.alarm?.enabled && note.alarm?.datetime;
  
  return (
    <div 
      className={`note-card ${colorConfig.class} p-5 relative group`}
      data-testid={`note-card-${note.id}`}
    >
      {hasAlarm && (
        <div className="alarm-badge" title="Alarm set">
          <Bell className="w-3 h-3 text-black" />
        </div>
      )}
      
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-white truncate flex-1 pr-2" data-testid="note-title">
          {note.title || "Untitled"}
        </h3>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onEdit(note)} 
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
            aria-label="Edit note"
            data-testid="note-edit-btn"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onShare(note)} 
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
            aria-label="Share note"
            data-testid="note-share-btn"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onDelete(note.id)} 
            className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/50 text-white/70 hover:text-white transition-all"
            aria-label="Delete note"
            data-testid="note-delete-btn"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <p className="text-slate-300 text-sm line-clamp-4 mb-4 whitespace-pre-wrap" data-testid="note-content">
        {note.content || "No content"}
      </p>
      
      <div className="flex items-center justify-between text-xs font-mono text-slate-500">
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

// Note Modal Component
const NoteModal = ({ isOpen, onClose, note, onSave, onOpenCalculator }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("purple");
  const [alarm, setAlarm] = useState({ enabled: false, datetime: null, sound: "bell", haptic: false });
  const [alarmDate, setAlarmDate] = useState(null);
  const [alarmTime, setAlarmTime] = useState("12:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title || "");
      setContent(note.content || "");
      setColor(note.color || "purple");
      if (note.alarm) {
        setAlarm(note.alarm);
        if (note.alarm.datetime) {
          const dt = new Date(note.alarm.datetime);
          setAlarmDate(dt);
          setAlarmTime(format(dt, "HH:mm"));
        }
      }
    } else {
      setTitle("");
      setContent("");
      setColor("purple");
      setAlarm({ enabled: false, datetime: null, sound: "bell", haptic: false });
      setAlarmDate(null);
      setAlarmTime("12:00");
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
      alarm: {
        ...alarm,
        datetime: alarmDateTime,
      },
    };
    
    await onSave(noteData, note?.id);
    setSaving(false);
    onClose();
  };

  const insertCalculatorResult = (result) => {
    setContent(prev => prev + (prev ? "\n" : "") + result);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0B1221] border-white/10 max-w-lg" data-testid="note-modal">
        <DialogHeader>
          <DialogTitle className="text-white font-semibold">
            {note ? "Edit Note" : "New Note"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter note title..."
              className="bg-black/20 border-white/10 text-white placeholder:text-slate-600"
              data-testid="note-title-input"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm text-slate-400">Content</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenCalculator(insertCalculatorResult)}
                className="text-slate-400 hover:text-white"
                data-testid="open-calculator-btn"
              >
                <Calculator className="w-4 h-4 mr-1" />
                Calculator
              </Button>
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note..."
              rows={5}
              className="bg-black/20 border-white/10 text-white placeholder:text-slate-600 resize-none"
              data-testid="note-content-input"
            />
          </div>
          
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Color</label>
            <div className="flex gap-2">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setColor(c.name)}
                  className={`color-swatch ${color === c.name ? "active" : ""}`}
                  style={{ backgroundColor: c.accent }}
                  aria-label={c.label}
                  data-testid={`color-${c.name}`}
                />
              ))}
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm text-slate-400 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Set Alarm
              </label>
              <Switch
                checked={alarm.enabled}
                onCheckedChange={(checked) => setAlarm(prev => ({ ...prev, enabled: checked }))}
                data-testid="alarm-toggle"
              />
            </div>
            
            {alarm.enabled && (
              <div className="space-y-3 pl-6">
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="bg-black/20 border-white/10 text-white flex-1"
                        data-testid="alarm-date-btn"
                      >
                        {alarmDate ? format(alarmDate, "MMM d, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="bg-[#0B1221] border-white/10 p-0">
                      <Calendar
                        mode="single"
                        selected={alarmDate}
                        onSelect={setAlarmDate}
                        className="text-white"
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    value={alarmTime}
                    onChange={(e) => setAlarmTime(e.target.value)}
                    className="bg-black/20 border-white/10 text-white w-32"
                    data-testid="alarm-time-input"
                  />
                </div>
                
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Sound</label>
                  <div className="flex gap-2">
                    {SOUND_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setAlarm(prev => ({ ...prev, sound: s.value }))}
                        className={`sound-option flex-1 ${alarm.sound === s.value ? "active" : ""}`}
                        data-testid={`sound-${s.value}`}
                      >
                        <span className="text-lg">{s.icon}</span>
                        <span className="text-xs">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-500 flex items-center gap-1">
                    <Smartphone className="w-3 h-3" />
                    Haptic feedback
                  </label>
                  <Switch
                    checked={alarm.haptic}
                    onCheckedChange={(checked) => setAlarm(prev => ({ ...prev, haptic: checked }))}
                    data-testid="haptic-toggle"
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1 border-white/10 text-slate-300 hover:bg-white/5"
              data-testid="note-cancel-btn"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="flex-1 bg-white text-black hover:bg-slate-200 font-semibold"
              data-testid="note-save-btn"
            >
              {saving ? "Saving..." : (note ? "Update" : "Create")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Share Modal Component
const ShareModal = ({ isOpen, onClose, note }) => {
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
      try {
        await navigator.share({
          title: note.title,
          text: shareText,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          toast.error("Share failed");
        }
      }
    } else {
      toast.error("Native share not supported");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0B1221] border-white/10 max-w-sm" data-testid="share-modal">
        <DialogHeader>
          <DialogTitle className="text-white font-semibold flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-400" />
            Share Note
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-3">
          <button onClick={copyToClipboard} className="share-btn" data-testid="share-copy">
            <Copy className="w-6 h-6" />
            <span className="text-sm">Copy</span>
          </button>
          <button onClick={shareViaEmail} className="share-btn" data-testid="share-email">
            <Mail className="w-6 h-6" />
            <span className="text-sm">Email</span>
          </button>
          <button onClick={shareViaSMS} className="share-btn" data-testid="share-sms">
            <MessageSquare className="w-6 h-6" />
            <span className="text-sm">Message</span>
          </button>
          {navigator.share && (
            <button onClick={nativeShare} className="share-btn" data-testid="share-native">
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
const SettingsModal = ({ isOpen, onClose, settings, onSave }) => {
  const [formData, setFormData] = useState({
    logo_url: "",
    header_bg: "",
    website_url: "",
    company_name: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

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
      <DialogContent className="bg-[#0B1221] border-white/10 max-w-lg" data-testid="settings-modal">
        <DialogHeader>
          <DialogTitle className="text-white font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            Header Settings
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Company Name</label>
            <Input
              value={formData.company_name}
              onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
              placeholder="Your company name"
              className="bg-black/20 border-white/10 text-white placeholder:text-slate-600"
              data-testid="settings-company-name"
            />
          </div>
          
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Logo URL</label>
            <Input
              value={formData.logo_url}
              onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
              placeholder="https://example.com/logo.png"
              className="bg-black/20 border-white/10 text-white placeholder:text-slate-600"
              data-testid="settings-logo-url"
            />
          </div>
          
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Header Background URL</label>
            <Input
              value={formData.header_bg}
              onChange={(e) => setFormData(prev => ({ ...prev, header_bg: e.target.value }))}
              placeholder="https://example.com/bg.jpg"
              className="bg-black/20 border-white/10 text-white placeholder:text-slate-600"
              data-testid="settings-header-bg"
            />
          </div>
          
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Website URL</label>
            <Input
              value={formData.website_url}
              onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
              placeholder="https://yourwebsite.com"
              className="bg-black/20 border-white/10 text-white placeholder:text-slate-600"
              data-testid="settings-website-url"
            />
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1 border-white/10 text-slate-300 hover:bg-white/5"
              data-testid="settings-cancel-btn"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="flex-1 bg-white text-black hover:bg-slate-200 font-semibold"
              data-testid="settings-save-btn"
            >
              {saving ? "Saving..." : "Save Settings"}
            </Button>
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
  
  // Modal states
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorCallback, setCalculatorCallback] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharingNote, setSharingNote] = useState(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Fetch notes and settings
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check for alarms
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      notes.forEach((note) => {
        if (note.alarm?.enabled && note.alarm?.datetime) {
          const alarmTime = new Date(note.alarm.datetime);
          const diff = alarmTime - now;
          if (diff > 0 && diff < 60000) {
            // Within the next minute
            if (Notification.permission === "granted") {
              new Notification(`Reminder: ${note.title}`, {
                body: note.content?.substring(0, 100) || "Time for your task!",
                icon: "/favicon.ico",
              });
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

  // Open edit modal
  const openEditModal = (note) => {
    setEditingNote(note);
    setNoteModalOpen(true);
  };

  // Open share modal
  const openShareModal = (note) => {
    setSharingNote(note);
    setShareModalOpen(true);
  };

  // Open calculator with callback
  const openCalculatorWithCallback = (callback) => {
    setCalculatorCallback(() => callback);
    setCalculatorOpen(true);
  };

  const gridClass = `grid gap-6 transition-all duration-500 ${
    gridCols === 1 ? "grid-cols-1" :
    gridCols === 2 ? "grid-cols-1 md:grid-cols-2" :
    gridCols === 3 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" :
    gridCols === 4 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" :
    "grid-cols-1 md:grid-cols-2 lg:grid-cols-5"
  }`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="loading-screen">
        <div className="text-slate-400 flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-testid="app-container">
      <Toaster position="top-right" theme="dark" />
      
      {/* Header */}
      <header 
        className="header-bg h-48 md:h-64 flex items-end"
        style={{ backgroundImage: settings?.header_bg ? `url(${settings.header_bg})` : undefined }}
        data-testid="app-header"
      >
        <div className="relative z-10 w-full p-6 md:p-12 flex items-end justify-between">
          <div className="flex items-center gap-4">
            {settings?.logo_url && (
              <a 
                href={settings?.website_url || "#"} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block"
                data-testid="header-logo-link"
              >
                <img 
                  src={settings.logo_url} 
                  alt="Logo" 
                  className="w-12 h-12 md:w-16 md:h-16 rounded-xl object-cover border border-white/20"
                  data-testid="header-logo"
                />
              </a>
            )}
            <div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight" data-testid="header-title">
                {settings?.company_name || "LuminaTask"}
              </h1>
              {settings?.website_url && (
                <a 
                  href={settings.website_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-slate-400 hover:text-white flex items-center gap-1 mt-1"
                  data-testid="header-website-link"
                >
                  <ExternalLink className="w-3 h-3" />
                  {settings.website_url.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCalculatorOpen(true)}
              className="text-white/70 hover:text-white hover:bg-white/10"
              aria-label="Open calculator"
              data-testid="header-calculator-btn"
            >
              <Calculator className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsModalOpen(true)}
              className="text-white/70 hover:text-white hover:bg-white/10"
              aria-label="Open settings"
              data-testid="header-settings-btn"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="p-6 md:p-12 max-w-[1920px] mx-auto">
        {/* Grid Controls */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-2" data-testid="grid-controls">
            <Grid3X3 className="w-5 h-5 text-slate-500" />
            <span className="text-sm text-slate-500 mr-2">Columns:</span>
            {[1, 2, 3, 4, 5].map((cols) => (
              <button
                key={cols}
                onClick={() => setGridCols(cols)}
                className={`grid-control-btn ${gridCols === cols ? "active" : ""}`}
                data-testid={`grid-btn-${cols}`}
              >
                {cols}
              </button>
            ))}
          </div>
          
          <div className="text-sm text-slate-500 font-mono" data-testid="notes-count">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </div>
        </div>
        
        {/* Notes Grid */}
        {notes.length === 0 ? (
          <div className="text-center py-20" data-testid="empty-state">
            <div className="text-6xl mb-4 opacity-20">📝</div>
            <h2 className="text-xl text-slate-400 mb-2">No notes yet</h2>
            <p className="text-slate-500 mb-6">Create your first note to get started</p>
            <Button 
              onClick={() => { setEditingNote(null); setNoteModalOpen(true); }}
              className="bg-white text-black hover:bg-slate-200 font-semibold"
              data-testid="create-first-note-btn"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Note
            </Button>
          </div>
        ) : (
          <div className={gridClass} data-testid="notes-grid">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={openEditModal}
                onDelete={handleDeleteNote}
                onShare={openShareModal}
              />
            ))}
          </div>
        )}
      </main>
      
      {/* FAB Button */}
      <button
        onClick={() => { setEditingNote(null); setNoteModalOpen(true); }}
        className="fab-button"
        aria-label="Add note"
        data-testid="fab-add-note"
      >
        <Plus className="w-7 h-7" />
      </button>
      
      {/* Modals */}
      <NoteModal
        isOpen={noteModalOpen}
        onClose={() => { setNoteModalOpen(false); setEditingNote(null); }}
        note={editingNote}
        onSave={handleSaveNote}
        onOpenCalculator={openCalculatorWithCallback}
      />
      
      <CalculatorWidget
        isOpen={calculatorOpen}
        onClose={() => { setCalculatorOpen(false); setCalculatorCallback(null); }}
        onInsertResult={calculatorCallback}
      />
      
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => { setShareModalOpen(false); setSharingNote(null); }}
        note={sharingNote}
      />
      
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

export default App;
