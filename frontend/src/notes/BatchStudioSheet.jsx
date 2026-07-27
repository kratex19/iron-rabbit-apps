import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles, FolderInput, Copy, CopyPlus, Pin, Palette, BellRing, BellOff,
  FileDown, Trash2, ChevronRight, X,
} from "lucide-react";
import { NOTE_COLORS } from "./constants";

/**
 * Batch Studio — floating bottom sheet exposing every bulk action
 * available on the current selection. Opened from `MultiSelectBar`.
 *
 * Actions:
 *  - Move / Copy to…            (delegates to MoveToCategoryModal via onMoveTo)
 *  - Duplicate in place
 *  - Pin / Unpin all
 *  - Recolor  (inline swatch picker)
 *  - Alarm    (inline date + time picker, or clear)
 *  - Export to PDF
 *  - Delete   (destructive section, red)
 */
export default function BatchStudioSheet({
  isOpen,
  onClose,
  count = 0,
  mode = "move",                 // Smart Batch Mode
  onMoveTo,                      // opens MoveToCategoryModal
  onDuplicate,                   // duplicate in place
  onTogglePin,                   // pin/unpin all
  onSetColor,                    // (colorName) => void
  onSetAlarm,                    // (isoDateTime, sound) => void
  onClearAlarm,                  // clear all alarms
  onExportPDF,                   // export selected to PDF
  onDelete,                      // delete selected
  isDark,
}) {
  const isCopy = mode === "copy";
  const MoveIcon = isCopy ? Copy : FolderInput;
  const moveLabel = isCopy ? "Copy to Category" : "Move to Category";

  // Alarm sub-state — inline picker
  const [alarmDate, setAlarmDate] = useState("");
  const [alarmTime, setAlarmTime] = useState("09:00");
  const [showColors, setShowColors] = useState(false);
  const [showAlarm, setShowAlarm] = useState(false);

  // Compute the picked datetime + validity (must be strictly in the future).
  const pickedDateTime = React.useMemo(() => {
    if (!alarmDate) return null;
    const [h, m] = alarmTime.split(":").map(Number);
    const dt = new Date(alarmDate);
    dt.setHours(h || 0, m || 0, 0, 0);
    return dt;
  }, [alarmDate, alarmTime]);
  const isPastAlarm = pickedDateTime !== null && pickedDateTime.getTime() <= Date.now();

  const handleClose = () => {
    setShowColors(false);
    setShowAlarm(false);
    setAlarmDate("");
    setAlarmTime("09:00");
    onClose && onClose();
  };

  const applyAlarm = () => {
    if (!pickedDateTime || isPastAlarm) return;
    onSetAlarm && onSetAlarm(pickedDateTime.toISOString(), "bell");
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className={`max-w-md max-h-[85vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-white border-gray-200"}`}
        data-testid="batch-studio-sheet"
      >
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <Sparkles className="w-5 h-5 text-indigo-400" /> Batch Studio
            <span className={`ml-auto text-xs font-mono ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              {count} selected
            </span>
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            Apply one action to every selected note. Every change supports Undo.
          </DialogDescription>
        </DialogHeader>

        {/* Primary grid — most common actions */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <ActionTile
            testid="bs-move"
            icon={<MoveIcon className="w-4 h-4" />}
            label={moveLabel}
            hint={isCopy ? "Copy · originals stay" : "Relocate to another"}
            onClick={() => { handleClose(); onMoveTo && onMoveTo(); }}
            isDark={isDark}
          />
          <ActionTile
            testid="bs-duplicate"
            icon={<CopyPlus className="w-4 h-4" />}
            label="Duplicate"
            hint={`Adds " (copy)" · same category`}
            onClick={() => { handleClose(); onDuplicate && onDuplicate(); }}
            isDark={isDark}
            accent="emerald"
          />
          <ActionTile
            testid="bs-pin"
            icon={<Pin className="w-4 h-4" />}
            label="Pin / Unpin"
            hint="Toggles all selected"
            onClick={() => { handleClose(); onTogglePin && onTogglePin(); }}
            isDark={isDark}
            accent="amber"
          />
          <ActionTile
            testid="bs-color"
            icon={<Palette className="w-4 h-4" />}
            label="Recolor"
            hint="Pick a common color"
            onClick={() => setShowColors((s) => !s)}
            active={showColors}
            isDark={isDark}
            accent="purple"
          />
          <ActionTile
            testid="bs-alarm"
            icon={<BellRing className="w-4 h-4" />}
            label="Set Alarm"
            hint="Same time for all"
            onClick={() => setShowAlarm((s) => !s)}
            active={showAlarm}
            isDark={isDark}
            accent="sky"
          />
          <ActionTile
            testid="bs-export-pdf"
            icon={<FileDown className="w-4 h-4" />}
            label="Export PDF"
            hint="Combined document"
            onClick={() => { handleClose(); onExportPDF && onExportPDF(); }}
            isDark={isDark}
            accent="slate"
          />
        </div>

        {/* Inline color picker */}
        {showColors && (
          <div className={`mt-3 p-3 rounded-md ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
            <div className={`text-xs mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              Choose a color to apply to all {count} note{count === 1 ? "" : "s"}:
            </div>
            <div className="flex items-center gap-3">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => { handleClose(); onSetColor && onSetColor(c.name); }}
                  className="w-9 h-9 rounded-full transition-transform hover:scale-110 border-2 border-transparent hover:border-white/40"
                  style={{ backgroundColor: c.accent }}
                  title={c.label}
                  data-testid={`bs-color-${c.name}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Inline alarm picker */}
        {showAlarm && (
          <div className={`mt-3 p-3 rounded-md space-y-2 ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
            <div className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              Set the same reminder on all {count} note{count === 1 ? "" : "s"}:
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={alarmDate}
                onChange={(e) => setAlarmDate(e.target.value)}
                className={`h-9 text-xs flex-1 ${isDark ? "bg-black/20 border-white/10 text-white" : ""}`}
                data-testid="bs-alarm-date"
              />
              <Input
                type="time"
                value={alarmTime}
                onChange={(e) => setAlarmTime(e.target.value)}
                className={`h-9 text-xs w-28 ${isDark ? "bg-black/20 border-white/10 text-white" : ""}`}
                data-testid="bs-alarm-time"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={applyAlarm}
                disabled={!alarmDate || isPastAlarm}
                className="flex-1 h-9 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs"
                data-testid="bs-alarm-apply"
              >
                <BellRing className="w-3.5 h-3.5 mr-1.5" /> Apply Alarm
              </Button>
              <Button
                onClick={() => { handleClose(); onClearAlarm && onClearAlarm(); }}
                variant="outline"
                className={`flex-1 h-9 text-xs ${isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : ""}`}
                data-testid="bs-alarm-clear"
              >
                <BellOff className="w-3.5 h-3.5 mr-1.5" /> Clear All
              </Button>
            </div>
            {isPastAlarm && (
              <div className="text-[11px] text-red-400 pt-0.5" data-testid="bs-alarm-past-hint">
                Choose a time in the future.
              </div>
            )}
          </div>
        )}

        {/* Destructive section */}
        <div className={`mt-4 pt-3 border-t ${isDark ? "border-white/10" : "border-gray-200"}`}>
          <button
            type="button"
            onClick={() => { handleClose(); onDelete && onDelete(); }}
            className={`w-full flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors ${
              isDark ? "bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300"
                     : "bg-red-50 hover:bg-red-100 border border-red-200 text-red-700"
            }`}
            data-testid="bs-delete"
          >
            <Trash2 className="w-4 h-4" />
            <div className="flex-1 text-left">
              <div className="text-sm font-medium">Delete Selected</div>
              <div className="text-[11px] opacity-80">Permanent · cannot be undone</div>
            </div>
            <ChevronRight className="w-4 h-4 opacity-70" />
          </button>
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={handleClose}
          className={`mt-3 w-full text-xs underline ${isDark ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"}`}
          data-testid="bs-cancel"
        >
          <X className="w-3 h-3 inline mr-1" /> Close
        </button>
      </DialogContent>
    </Dialog>
  );
}

function ActionTile({ testid, icon, label, hint, onClick, active, accent = "indigo", isDark }) {
  const palette = {
    indigo:  { bgDark: "bg-indigo-500/15 hover:bg-indigo-500/25 border-indigo-400/30",  bgLight: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200",       text: "text-indigo-500" },
    emerald: { bgDark: "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/30", bgLight: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200",   text: "text-emerald-500" },
    amber:   { bgDark: "bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/30",     bgLight: "bg-amber-50 hover:bg-amber-100 border-amber-200",          text: "text-amber-500" },
    purple:  { bgDark: "bg-purple-500/15 hover:bg-purple-500/25 border-purple-400/30",  bgLight: "bg-purple-50 hover:bg-purple-100 border-purple-200",       text: "text-purple-500" },
    sky:     { bgDark: "bg-sky-500/15 hover:bg-sky-500/25 border-sky-400/30",           bgLight: "bg-sky-50 hover:bg-sky-100 border-sky-200",                text: "text-sky-500" },
    slate:   { bgDark: "bg-slate-500/15 hover:bg-slate-500/25 border-slate-400/30",     bgLight: "bg-slate-100 hover:bg-slate-200 border-slate-300",         text: "text-slate-500" },
  }[accent] || {};
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1 p-3 rounded-md border transition-colors text-left ${
        isDark ? palette.bgDark : palette.bgLight
      } ${active ? "ring-2 ring-offset-1 ring-offset-transparent ring-indigo-400" : ""}`}
      data-testid={testid}
    >
      <div className={`flex items-center gap-1.5 ${palette.text}`}>
        {icon}
        <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"}`}>{label}</span>
      </div>
      {hint && <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>{hint}</div>}
    </button>
  );
}
