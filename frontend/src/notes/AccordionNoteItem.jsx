import React, { useState } from "react";
import { format } from "date-fns";
import {
  Bell, Repeat, GripVertical, ChevronDown, Clock, Pencil,
  Maximize2, Edit3, Share2, Trash2, Paperclip, Pin, PinOff, CalendarDays, Flame,
  MoreHorizontal, FileDown, FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { NOTE_COLORS, getNoteColorStyle } from "./constants";
import { computeNoteStreak } from "./streakUtils";
import { noteToMarkdown, safeFilename, downloadTextFile, shareNoteAsMarkdown } from "../utils/markdown";
import RestaurantsStatsWidget from "../components/RestaurantsStatsWidget";
import RestaurantsStatsPeek from "../components/RestaurantsStatsPeek";
import PhotoMosaic from "../components/PhotoMosaic";

/**
 * A single collapsible note row for List view.
 * Shows title/badges collapsed; content + actions when expanded.
 *
 * When `selectMode` is true the row switches into Batch-Studio mode:
 *   - Whole row tap toggles selection (Collapsible is disabled)
 *   - A small checkmark circle appears on the left
 *   - A visible ring indicates selected state
 */
export default function AccordionNoteItem({
  note, onEdit, onDelete, onShare, onFullScreen, onTogglePin, isDark, dragHandleProps, isDragging,
  selectMode = false, selected = false, onToggleSelect, onSwipeSelect,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [swipeDx, setSwipeDx] = useState(0); // live pixel offset during a swipe
  const touchRef = React.useRef(null);       // { startX, startY, startT }

  const colorConfig = NOTE_COLORS.find(c => c.name === note.color) || NOTE_COLORS[0];
  const hasAlarm = note.alarm?.enabled && note.alarm?.datetime;
  const hasRecurring = note.recurring?.enabled;
  const streak = computeNoteStreak(note);
  const createdDate = new Date(note.created_at);
  const updatedDate = new Date(note.updated_at);
  const wasEdited = updatedDate.getTime() - createdDate.getTime() > 1000;

  // In select mode the accordion never opens: any tap on the row toggles selection.
  const handleRowClick = (e) => {
    if (!selectMode) return;
    e.preventDefault();
    e.stopPropagation();
    onToggleSelect?.(note.id);
  };

  // -------- iOS-Notes-style swipe-right to select ---------
  const SWIPE_ACTIVATE_PX = 70;
  const handleTouchStart = (e) => {
    if (selectMode || !onSwipeSelect) return;
    const t = e.touches[0];
    touchRef.current = { startX: t.clientX, startY: t.clientY, startT: Date.now() };
  };
  const handleTouchMove = (e) => {
    if (!touchRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchRef.current.startX;
    const dy = Math.abs(t.clientY - touchRef.current.startY);
    // Only follow horizontal-dominant swipes; ignore vertical scrolls.
    if (dx > 0 && dy < 30) setSwipeDx(Math.min(dx, 120));
    else setSwipeDx(0);
  };
  const handleTouchEnd = () => {
    if (!touchRef.current) return;
    const activated = swipeDx >= SWIPE_ACTIVATE_PX;
    setSwipeDx(0);
    touchRef.current = null;
    if (activated) onSwipeSelect?.(note.id);
  };
  const handleTouchCancel = () => {
    touchRef.current = null;
    setSwipeDx(0);
  };
  const swipeActive = swipeDx > 0 && !selectMode;
  const activated = swipeDx >= SWIPE_ACTIVATE_PX;

  return (
    <div
      className={`accordion-note ${colorConfig.class} ${isDark ? '' : 'light'} rounded-lg border overflow-hidden mb-2 relative ${isDragging ? 'opacity-50' : ''} ${selected ? 'ring-2 ring-indigo-400' : ''}`}
      style={getNoteColorStyle(colorConfig, isDark) || undefined}
      data-testid={`accordion-note-${note.id}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {/* Left-rail hint that appears while the user is swiping right */}
      {swipeActive && (
        <div
          className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none transition-colors ${
            activated ? "text-indigo-300" : isDark ? "text-slate-500" : "text-gray-400"
          }`}
          data-testid={`swipe-rail-${note.id}`}
        >
          <span className={`w-6 h-6 rounded-full flex items-center justify-center ${activated ? "bg-indigo-500 text-white" : isDark ? "bg-white/10" : "bg-gray-200"}`}>
            <svg viewBox="0 0 12 12" className="w-3.5 h-3.5">
              <path d="M2.5 6.5L5 9l4.5-5.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="ml-2 text-xs font-medium">{activated ? "Release to select" : "Swipe to select"}</span>
        </div>
      )}
      <div
        style={swipeActive ? { transform: `translateX(${swipeDx}px)`, transition: "none" } : { transform: "translateX(0)", transition: "transform 180ms ease" }}
      >
      {selectMode ? (
        /* Select mode — whole row is a checkbox; no accordion */
        <button
          type="button"
          onClick={handleRowClick}
          className={`w-full flex items-center gap-2 p-3 cursor-pointer text-left transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
          data-testid={`accordion-select-${note.id}`}
        >
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${
              selected
                ? "bg-indigo-500 border-indigo-500 text-white"
                : isDark ? "bg-black/40 border-white/70" : "bg-white border-gray-400"
            }`}
            aria-hidden="true"
            data-testid={`accordion-select-indicator-${note.id}`}
          >
            {selected && (
              <svg viewBox="0 0 12 12" className="w-3 h-3">
                <path d="M2.5 6.5L5 9l4.5-5.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colorConfig.accent }} />
          {note.pinned && <Pin className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} title="Pinned" />}
          <span className={`font-medium truncate flex-1 text-left ${isDark ? 'text-white' : 'text-gray-900'}`}>{note.title || "Untitled"}</span>
          {note.category && <Badge variant="outline" className={`text-xs hidden sm:inline-flex ${isDark ? '' : 'text-gray-800 border-gray-300'}`}>{note.category}</Badge>}
          {hasAlarm && <Bell className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
          {hasRecurring && <Repeat className="w-4 h-4 text-green-500 flex-shrink-0" />}
        </button>
      ) : (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="w-full">
            <div className={`flex items-center gap-2 p-3 cursor-pointer transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
              {dragHandleProps && (
                <div {...dragHandleProps} className={`cursor-grab active:cursor-grabbing p-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} onClick={e => e.stopPropagation()}>
                  <GripVertical className="w-4 h-4" />
                </div>
              )}
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colorConfig.accent }} />
              {note.pinned && <Pin className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} title="Pinned" />}
              <span className={`font-medium truncate flex-1 text-left ${isDark ? 'text-white' : 'text-gray-900'}`}>{note.title || "Untitled"}</span>
              {note.category && <Badge variant="outline" className={`text-xs hidden sm:inline-flex ${isDark ? '' : 'text-gray-800 border-gray-300'}`}>{note.category}</Badge>}
              {hasAlarm && <Bell className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
              {hasRecurring && <Repeat className="w-4 h-4 text-green-500 flex-shrink-0" />}
              {note.events?.length > 0 && (
                <span className="flex items-center gap-0.5 text-xs font-mono text-indigo-400 flex-shrink-0" title={`${note.events.length} event${note.events.length === 1 ? '' : 's'}`}>
                  <CalendarDays className="w-3.5 h-3.5" />{note.events.length}
                </span>
              )}
              {note.attachments?.length > 0 && (
                <span className="flex items-center gap-0.5 text-xs font-mono text-slate-500 flex-shrink-0" title={`${note.attachments.length} attachment${note.attachments.length === 1 ? '' : 's'}`}>
                  <Paperclip className="w-3.5 h-3.5" />{note.attachments.length}
                </span>
              )}
              {streak > 0 && (
                <span
                  className={`flex items-center gap-0.5 text-xs font-bold flex-shrink-0 ${isDark ? "text-orange-300" : "text-orange-600"}`}
                  title={`${streak}-period completion streak`}
                  data-testid={`row-streak-${note.id}`}
                >
                  <Flame className="w-3.5 h-3.5" />{streak}
                </span>
              )}
              {note.special_action === "restaurants_stats_widget" && (
                <RestaurantsStatsPeek isDark={isDark} />
              )}
              <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''} ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
            </div>
          </CollapsibleTrigger>
          {/* Always-visible photo mosaic for gallery tiles — shows a 3×3 preview
              even when the row is collapsed. */}
          {note.special_action === "photo_mosaic" && (
            <PhotoMosaic attachments={note.attachments || []} isDark={isDark} />
          )}
          <CollapsibleContent>
            <div className={`px-3 pb-3 pt-1 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              {note.special_action === "restaurants_stats_widget" ? (
                <div className="mb-3"><RestaurantsStatsWidget isDark={isDark} /></div>
              ) : (
                <p className={`text-sm whitespace-pre-wrap line-clamp-4 mb-3 ${isDark ? 'text-slate-100' : 'text-gray-600'}`}>{note.content || "No content"}</p>
              )}
              {Array.isArray(note.tags) && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3" data-testid={`note-tags-${note.id}`}>
                  {note.tags.map(t => (
                    <span
                      key={t}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isDark ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-400/20' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
              <div className={`flex items-center justify-between text-xs font-mono ${isDark ? 'text-slate-300' : 'text-gray-400'}`}>
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(createdDate, "MMM d, yyyy HH:mm")}</span>
                  {wasEdited && <span className="flex items-center gap-1 text-indigo-400"><Pencil className="w-3 h-3" /> {format(updatedDate, "MMM d, yyyy HH:mm")}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => onFullScreen(note)} className={`p-1.5 rounded transition-all ${isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`} title="Full screen" data-testid={`accordion-fullscreen-${note.id}`}><Maximize2 className="w-4 h-4" /></button>
                  {onTogglePin && !note.subcategory?.trim() && (
                    <button onClick={() => onTogglePin(note.id)} className={`p-1.5 rounded transition-all ${isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`} title={note.pinned ? "Unpin" : "Pin"} data-testid={`toggle-pin-${note.id}`}>
                      {note.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </button>
                  )}
                  <button onClick={() => onEdit(note)} data-testid={`accordion-edit-${note.id}`} className={`p-1.5 rounded transition-all ${isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => onShare(note)} className={`p-1.5 rounded transition-all ${isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}><Share2 className="w-4 h-4" /></button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={`p-1.5 rounded transition-all ${isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}
                        title="More"
                        data-testid={`note-more-${note.id}`}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className={isDark ? "bg-slate-900 border-white/10 text-slate-100" : ""}>
                      <DropdownMenuItem
                        onClick={() => {
                          try {
                            downloadTextFile(noteToMarkdown(note), safeFilename(note.title || "note"));
                            toast.success("Note exported as .md");
                          } catch (e) {
                            toast.error("Export failed");
                          }
                        }}
                        data-testid={`note-export-md-${note.id}`}
                      >
                        <FileDown className="w-4 h-4 mr-2" /> Export as Markdown (.md)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            const result = await shareNoteAsMarkdown(note);
                            if (result.shared) toast.success("Shared as .md");
                            else if (result.downloaded) toast.success("Downloaded .md (share unsupported)");
                          } catch (e) {
                            toast.error("Share failed");
                          }
                        }}
                        data-testid={`note-share-md-${note.id}`}
                      >
                        <FileText className="w-4 h-4 mr-2" /> Share as Markdown
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <button onClick={() => onDelete(note.id)} data-testid={`note-delete-${note.id}`} className={`p-1.5 rounded transition-all ${isDark ? 'hover:bg-red-500/30 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-500 hover:text-red-600'}`}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
      </div>
    </div>
  );
}
