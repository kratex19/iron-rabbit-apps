import React, { useState } from "react";
import { CheckSquare, Plus, X, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";

const rid = () => Math.random().toString(36).slice(2, 10);

/**
 * Checklist editor for NoteModal — add / remove / toggle / reorder
 * items. Stores `{ id, text, done }` objects.
 */
export default function ChecklistSection({ value = [], onChange, isDark }) {
  const [newText, setNewText] = useState("");
  const items = Array.isArray(value) ? value : [];

  const addItem = () => {
    if (!newText.trim()) return;
    onChange([...items, { id: rid(), text: newText.trim(), done: false }]);
    setNewText("");
  };
  const removeItem = (id) => onChange(items.filter((c) => c.id !== id));
  const toggleItem = (id) =>
    onChange(items.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));
  const updateText = (id, text) =>
    onChange(items.map((c) => (c.id === id ? { ...c, text } : c)));

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className={`border-t pt-3 ${isDark ? "border-white/10" : "border-gray-200"}`}>
      <div className="flex items-center justify-between mb-2">
        <label
          className={`text-xs flex items-center gap-1.5 ${
            isDark ? "text-slate-400" : "text-gray-500"
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" /> Checklist
        </label>
        {items.length > 0 && (
          <span
            className={`text-[10px] font-mono ${
              isDark ? "text-slate-500" : "text-gray-400"
            }`}
          >
            {doneCount}/{items.length} done
          </span>
        )}
      </div>

      {items.length > 0 && (
        <div className="space-y-1 mb-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-2 rounded-md px-2 py-1 ${
                isDark ? "bg-white/5" : "bg-gray-50"
              }`}
              data-testid={`checklist-item-${item.id}`}
            >
              <GripVertical className={`w-3.5 h-3.5 shrink-0 ${isDark ? "text-slate-600" : "text-gray-300"}`} />
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                  item.done
                    ? "bg-indigo-500 border-indigo-500"
                    : isDark
                    ? "border-slate-500 hover:border-indigo-400"
                    : "border-gray-300 hover:border-indigo-500"
                }`}
                data-testid={`checklist-toggle-${item.id}`}
                aria-label={item.done ? "Mark undone" : "Mark done"}
              >
                {item.done && (
                  <svg viewBox="0 0 12 12" className="w-3 h-3 text-white">
                    <path
                      d="M2.5 6.5L5 9l4.5-5.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
              <input
                value={item.text}
                onChange={(e) => updateText(item.id, e.target.value)}
                className={`flex-1 bg-transparent border-0 outline-none text-xs ${
                  item.done
                    ? isDark
                      ? "line-through text-slate-500"
                      : "line-through text-gray-400"
                    : isDark
                    ? "text-white"
                    : "text-gray-800"
                }`}
              />
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                  isDark ? "text-slate-500 hover:text-red-400" : "text-gray-400 hover:text-red-500"
                }`}
                data-testid={`checklist-remove-${item.id}`}
                aria-label="Remove item"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1.5">
        <Input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder="Add an item… (Enter to add)"
          className={`h-8 text-xs ${
            isDark ? "bg-black/20 border-white/10 text-white placeholder:text-slate-600" : ""
          }`}
          data-testid="checklist-new-input"
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!newText.trim()}
          className="h-8 px-3 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid="checklist-add-btn"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
    </div>
  );
}
