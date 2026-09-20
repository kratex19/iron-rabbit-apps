import React, { useState } from "react";
import { ArrowUp, ArrowDown, X, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CUSTOM_PRIORITY_RULES } from "./constants";
import { haptic } from "../utils/haptic";

/**
 * Inline editor for the "Custom Priority" sort mode.
 *
 * Presents a numbered, reorderable list of sort-rule ids drawn from
 * CUSTOM_PRIORITY_RULES. Rules are display-only sorting instructions —
 * they NEVER create, copy, move, rename, duplicate, or modify actual
 * app content (tiles, categories, subcategories, packs, hierarchy).
 *
 * Props:
 *   isDark      — theme flag
 *   rules       — array of rule ids (e.g. ["recently-edited","z-a","newest"])
 *   onChange    — (next: string[]) => void  called on every mutation
 *
 * Duplicates are prevented at the "Add rule" step: the picker only
 * lists rules that are not currently present.
 */
export default function CustomPriorityEditor({ isDark, rules, onChange }) {
  const list = Array.isArray(rules) ? rules : [];
  const [addOpen, setAddOpen] = useState(false);

  const move = (idx, delta) => {
    const j = idx + delta;
    if (j < 0 || j >= list.length) return;
    const next = list.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    haptic("tap");
    onChange(next);
  };
  const remove = (idx) => {
    const next = list.slice();
    next.splice(idx, 1);
    haptic("tap");
    onChange(next);
  };
  const add = (value) => {
    if (!value || list.includes(value)) return;
    haptic("tap");
    onChange([...list, value]);
    setAddOpen(false);
  };

  const remaining = CUSTOM_PRIORITY_RULES.filter((r) => !list.includes(r.value));
  const labelOf = (v) => CUSTOM_PRIORITY_RULES.find((r) => r.value === v)?.label || v;
  const IconOf = (v) => CUSTOM_PRIORITY_RULES.find((r) => r.value === v)?.icon || null;

  return (
    <div
      className={`mb-3 rounded-lg border p-3 ${
        isDark ? "bg-white/[0.03] border-white/10" : "bg-gray-50 border-gray-200"
      }`}
      data-testid="custom-priority-editor"
    >
      <div className={`text-[11px] font-semibold mb-2 flex items-center gap-1.5 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
        Custom Priority — rules run top → bottom
      </div>
      {list.length === 0 ? (
        <div className={`text-[11px] mb-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
          No rules yet. Add one below. Rules are display-only — they never change your tiles, categories, or packs.
        </div>
      ) : (
        <ol className="space-y-1.5 mb-2">
          {list.map((r, idx) => {
            const Icon = IconOf(r);
            return (
              <li
                key={r}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${
                  isDark ? "bg-black/20 border border-white/10" : "bg-white border border-gray-200"
                }`}
                data-testid={`priority-rule-${r}`}
              >
                <span className={`text-[11px] font-mono w-4 text-right ${isDark ? "text-slate-500" : "text-gray-400"}`}>{idx + 1}.</span>
                {Icon && <Icon className={`w-3.5 h-3.5 ${isDark ? "text-slate-400" : "text-gray-500"}`} />}
                <span className={`text-[12px] flex-1 ${isDark ? "text-slate-200" : "text-gray-800"}`}>{labelOf(r)}</span>
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className={`p-1 rounded transition-colors disabled:opacity-30 ${
                    isDark ? "text-slate-400 hover:bg-white/10" : "text-gray-500 hover:bg-gray-100"
                  }`}
                  aria-label="Move rule up"
                  data-testid={`priority-rule-up-${r}`}
                  title="Move up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === list.length - 1}
                  className={`p-1 rounded transition-colors disabled:opacity-30 ${
                    isDark ? "text-slate-400 hover:bg-white/10" : "text-gray-500 hover:bg-gray-100"
                  }`}
                  aria-label="Move rule down"
                  data-testid={`priority-rule-down-${r}`}
                  title="Move down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className={`p-1 rounded transition-colors ${
                    isDark ? "text-slate-400 hover:bg-red-500/20 hover:text-red-300" : "text-gray-500 hover:bg-red-50 hover:text-red-600"
                  }`}
                  aria-label="Remove rule"
                  data-testid={`priority-rule-remove-${r}`}
                  title="Remove rule"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
      {remaining.length > 0 && (
        <Select open={addOpen} onOpenChange={setAddOpen} value="" onValueChange={add}>
          <SelectTrigger
            className={`w-full h-8 text-[11px] ${
              isDark ? "bg-white/5 border-white/10 text-slate-200" : "bg-white border-gray-200 text-gray-800"
            }`}
            data-testid="priority-add-trigger"
          >
            <Plus className="w-3 h-3 mr-1" />
            <SelectValue placeholder="Add a sorting rule…" />
          </SelectTrigger>
          <SelectContent className={isDark ? "bg-[#0B1221] border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}>
            {remaining.map((r) => (
              <SelectItem
                key={r.value}
                value={r.value}
                className="text-[11px]"
                data-testid={`priority-add-option-${r.value}`}
              >
                <span className="flex items-center gap-1.5"><r.icon className="w-3 h-3" />{r.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
