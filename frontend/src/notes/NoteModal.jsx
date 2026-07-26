import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import * as LucideIcons from "lucide-react";
import {
  Bell, Repeat, FileText, Calculator, StickyNote as StickyNoteIcon, Pin, Mic, MicOff,
} from "lucide-react";
import useVoiceInput from "../utils/useVoiceInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import IconPicker from "../components/IconPicker";
import BackgroundPicker, { getBackgroundStyle } from "../components/BackgroundPicker";
import { NOTE_COLORS, SOUND_OPTIONS } from "./constants";
import TemplateModal from "./TemplateModal";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Create/edit dialog for a note. Includes icon + background editor
 * for the Icon-view tile.
 */
export default function NoteModal({ isOpen, onClose, note, onSave, onOpenCalculator, isDark, categories, templates }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("purple");
  const [icon, setIcon] = useState(null);
  const [background, setBackground] = useState(null);
  const [pinned, setPinned] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [alarm, setAlarm] = useState({ enabled: false, datetime: null, sound: "bell", haptic: false });
  const [alarmDate, setAlarmDate] = useState(null);
  const [alarmTime, setAlarmTime] = useState("12:00");
  const [recurring, setRecurring] = useState({ enabled: false, frequency: "weekly", days: [] });
  const [saving, setSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const voice = useVoiceInput();

  // Append voice transcript into the note content as speech is recognised.
  useEffect(() => {
    if (voice.transcript) {
      setContent(prev => (prev ? prev + " " : "") + voice.transcript);
      voice.reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.transcript]);

  useEffect(() => {
    if (note) {
      setTitle(note.title || ""); setContent(note.content || ""); setColor(note.color || "purple");
      setIcon(note.icon || null); setBackground(note.background || null);
      setPinned(!!note.pinned);
      setCategory(note.category || ""); setSubcategory(note.subcategory || "");
      if (note.alarm) {
        setAlarm(note.alarm);
        if (note.alarm.datetime) {
          const dt = new Date(note.alarm.datetime);
          setAlarmDate(dt);
          setAlarmTime(format(dt, "HH:mm"));
        }
      }
      if (note.recurring) setRecurring(note.recurring);
    } else {
      setTitle(""); setContent(""); setColor("purple"); setIcon(null); setBackground(null);
      setPinned(false);
      setCategory(""); setSubcategory("");
      setAlarm({ enabled: false, datetime: null, sound: "bell", haptic: false });
      setAlarmDate(null); setAlarmTime("12:00");
      setRecurring({ enabled: false, frequency: "weekly", days: [] });
    }
  }, [note, isOpen]);

  const handleSelectTemplate = (template) => {
    setTitle(template.title || "");
    setContent(template.content || "");
    setColor(template.color || "purple");
    setIcon(template.icon || null);
    setBackground(template.background || null);
    setCategory(template.category || "");
    setSubcategory(template.subcategory || "");
    setShowTemplates(false);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Please enter a title"); return; }
    setSaving(true);
    let alarmDateTime = null;
    if (alarm.enabled && alarmDate) {
      const [hours, minutes] = alarmTime.split(":").map(Number);
      const dt = new Date(alarmDate);
      dt.setHours(hours, minutes, 0, 0);
      alarmDateTime = dt.toISOString();
    }
    const noteData = {
      title: title.trim(), content, color, icon, background,
      // Pin only allowed on main-category (or uncategorized) notes.
      // If a subcategory is set, force pinned=false so old state is cleaned up.
      pinned: subcategory.trim() ? false : pinned,
      category: category.trim(), subcategory: subcategory.trim(),
      alarm: { ...alarm, datetime: alarmDateTime }, recurring,
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
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day],
    }));
  };
  const subcategories = categories[category] || [];

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-lg max-h-[85vh] overflow-y-auto ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className={`font-semibold flex items-center justify-between ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <span>{note ? "Edit Note" : "New Note"}</span>
              {!note && (
                <Button variant="ghost" size="sm" onClick={() => setShowTemplates(true)} className="text-indigo-500 h-7">
                  <FileText className="w-4 h-4 mr-1" /> Templates
                </Button>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {note ? "Edit this note's title, content, color, category, alarm, and recurring settings." : "Create a new note with title, content, color, category, alarm, and recurring settings."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter title..." className={`h-9 ${isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-600' : 'bg-gray-50 border-gray-200'}`} />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Content</label>
                <div className="flex items-center gap-1">
                  {voice.supported && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => voice.listening ? voice.stop() : voice.start()}
                      className={`h-6 text-xs ${voice.listening ? "text-red-500 animate-pulse" : (isDark ? "text-slate-400" : "")}`}
                      data-testid="voice-input-btn"
                    >
                      {voice.listening ? <MicOff className="w-3 h-3 mr-1" /> : <Mic className="w-3 h-3 mr-1" />}
                      {voice.listening ? "Listening…" : "Voice"}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => onOpenCalculator(insertCalculatorResult)} className={`h-6 text-xs ${isDark ? 'text-slate-400' : ''}`}>
                    <Calculator className="w-3 h-3 mr-1" /> Calc
                  </Button>
                </div>
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
              <div className="flex gap-2">
                {NOTE_COLORS.map((c) => (
                  <button key={c.name} onClick={() => setColor(c.name)} className={`color-swatch-sm ${color === c.name ? "active" : ""}`} style={{ backgroundColor: c.accent }} />
                ))}
              </div>
            </div>

            {/* Icon-view tile: Icon + Background */}
            <div>
              <label className={`text-xs mb-1.5 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Tile appearance (Icon view)</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="editor-tile-preview"
                  style={getBackgroundStyle(background)}
                  onClick={() => setBgPickerOpen(true)}
                  data-testid="editor-open-bg-picker"
                  title="Change background"
                >
                  <span className="preview-overlay" />
                  {(() => {
                    const Ico = icon && LucideIcons[icon] ? LucideIcons[icon] : StickyNoteIcon;
                    return <Ico className="w-8 h-8 relative z-10" strokeWidth={1.6} />;
                  })()}
                </button>
                <div className="flex flex-col gap-1.5 flex-1">
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => setIconPickerOpen(true)}
                    className={`justify-start h-8 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`}
                    data-testid="editor-open-icon-picker"
                  >
                    <LucideIcons.Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    {icon ? `Icon: ${icon}` : "Choose icon"}
                  </Button>
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => setBgPickerOpen(true)}
                    className={`justify-start h-8 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`}
                    data-testid="editor-open-bg-picker-btn"
                  >
                    <LucideIcons.Palette className="w-3.5 h-3.5 mr-1.5" />
                    {background?.type === "image" ? "Background: Image" : background?.value ? "Background: Custom" : "Choose background"}
                  </Button>
                </div>
              </div>
            </div>

            {!subcategory.trim() && (
              <div className={`border-t pt-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    <Pin className="w-3.5 h-3.5" /> Pin to top
                  </label>
                  <Switch checked={pinned} onCheckedChange={setPinned} data-testid="pin-toggle" />
                </div>
              </div>
            )}

            <div className={`border-t pt-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  <Bell className="w-3.5 h-3.5" /> Alarm
                </label>
                <Switch checked={alarm.enabled} onCheckedChange={(checked) => setAlarm(prev => ({ ...prev, enabled: checked }))} />
              </div>
              {alarm.enabled && (
                <div className="space-y-2 pl-5">
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={`flex-1 h-8 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`}>
                          {alarmDate ? format(alarmDate, "MMM d") : "Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className={`p-0 ${isDark ? 'bg-[#0B1221] border-white/10' : ''}`}>
                        <Calendar mode="single" selected={alarmDate} onSelect={setAlarmDate} />
                      </PopoverContent>
                    </Popover>
                    <Input type="time" value={alarmTime} onChange={(e) => setAlarmTime(e.target.value)} className={`w-24 h-8 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`} />
                  </div>
                  <div className="flex gap-1">
                    {SOUND_OPTIONS.map((s) => (
                      <button key={s.value} onClick={() => setAlarm(prev => ({ ...prev, sound: s.value }))} className={`sound-option-sm flex-1 ${alarm.sound === s.value ? "active" : ""} ${isDark ? '' : 'light'}`}>
                        <span>{s.icon}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={`border-t pt-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  <Repeat className="w-3.5 h-3.5" /> Recurring
                </label>
                <Switch checked={recurring.enabled} onCheckedChange={(checked) => setRecurring(prev => ({ ...prev, enabled: checked }))} />
              </div>
              {recurring.enabled && (
                <div className="space-y-2 pl-5">
                  <Select value={recurring.frequency} onValueChange={(v) => setRecurring(prev => ({ ...prev, frequency: v, days: [] }))}>
                    <SelectTrigger className={`h-8 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`}><SelectValue /></SelectTrigger>
                    <SelectContent className={isDark ? 'bg-[#0B1221] border-white/10' : ''}>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  {recurring.frequency === "weekly" && (
                    <div className="flex gap-1 flex-wrap">
                      {DAYS.map((day, i) => (
                        <button key={day} onClick={() => toggleDay(i)} className={`px-2 py-1 rounded text-xs font-medium ${recurring.days.includes(i) ? 'bg-indigo-500 text-white' : isDark ? 'bg-white/10 text-slate-400' : 'bg-gray-100 text-gray-600'}`}>
                          {day}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={onClose} className={`flex-1 h-9 ${isDark ? 'border-white/10 text-slate-300' : ''}`}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 h-9 bg-indigo-500 hover:bg-indigo-600 text-white">
                {saving ? "..." : (note ? "Update" : "Create")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TemplateModal isOpen={showTemplates} onClose={() => setShowTemplates(false)} templates={templates} onSelect={handleSelectTemplate} isDark={isDark} />
      <IconPicker
        isOpen={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        value={icon}
        onSelect={setIcon}
        isDark={isDark}
      />
      <BackgroundPicker
        isOpen={bgPickerOpen}
        onClose={() => setBgPickerOpen(false)}
        value={background}
        onSelect={setBackground}
        isDark={isDark}
      />
    </>
  );
}
