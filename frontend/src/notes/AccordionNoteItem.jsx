import React, { useState } from "react";
import { format } from "date-fns";
import {
  Bell, Repeat, GripVertical, ChevronDown, Clock, Pencil,
  Maximize2, Edit3, Share2, Trash2, Paperclip, Pin, PinOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NOTE_COLORS } from "./constants";

/**
 * A single collapsible note row for List view.
 * Shows title/badges collapsed; content + actions when expanded.
 */
export default function AccordionNoteItem({
  note, onEdit, onDelete, onShare, onFullScreen, onTogglePin, isDark, dragHandleProps, isDragging,
}) {
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
            {note.attachments?.length > 0 && (
              <span className="flex items-center gap-0.5 text-xs font-mono text-slate-500 flex-shrink-0" title={`${note.attachments.length} attachment${note.attachments.length === 1 ? '' : 's'}`}>
                <Paperclip className="w-3.5 h-3.5" />{note.attachments.length}
              </span>
            )}
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
                {onTogglePin && (
                  <button onClick={() => onTogglePin(note.id)} className={`p-1.5 rounded transition-all ${isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`} title={note.pinned ? "Unpin" : "Pin"} data-testid={`toggle-pin-${note.id}`}>
                    {note.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </button>
                )}
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
}
