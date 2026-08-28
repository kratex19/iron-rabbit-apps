import React from "react";
import { Search, Filter, LayoutGrid, List, FolderTree } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SORT_OPTIONS, FILTER_OPTIONS } from "./constants";
import { haptic } from "../utils/haptic";
import TagFilterStrip from "./TagFilterStrip";
import TilesColumnsButton from "./TilesColumnsButton";

/**
 * Search bar + view/filter/sort controls + tag strip + group-by toggle.
 * Extracted from NotesApp.jsx. Pure/dumb — everything comes via props.
 */
export default function AppSearchBar({
  isDark,
  notes,
  searchQuery,
  onSearchChange,
  viewMode,
  onChangeViewMode,
  filterBy,
  onFilterChange,
  sortBy,
  onSortChange,
  activeTag,
  onSelectTag,
  groupByCategory,
  onToggleGroup,
  selectMode,
  onEnterSelectMode,
  onClearSelection,
  selectedCount,
  visibleCount,
  gridColumns,
  onGridColumnsChange,
}) {
  const { t } = useTranslation();
  return (
    <>
      {/* Search + View mode + Filter + Sort */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("search.placeholder")}
            className={`pl-8 h-9 ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500" : "bg-white border-gray-200"}`}
            data-testid="search-input"
          />
        </div>
        <div className="flex gap-2">
          <div className={`view-toggle ${isDark ? "" : "light"}`} data-testid="view-mode-toggle">
            <button
              type="button"
              onClick={() => onChangeViewMode("list")}
              className={viewMode === "list" ? "active" : ""}
              aria-label="List view"
              data-testid="view-mode-list"
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onChangeViewMode("icon")}
              className={viewMode === "icon" ? "active" : ""}
              aria-label="Icon view"
              data-testid="view-mode-icon"
              title="Icon view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <Select value={filterBy} onValueChange={onFilterChange}>
            <SelectTrigger className={`w-32 h-9 text-xs ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
              <Filter className="w-3 h-3 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent className={isDark ? "bg-[#0B1221] border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}>
              {FILTER_OPTIONS.map(opt => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="text-xs"
                  data-testid={`filter-option-${opt.value}`}
                >
                  {t(`filter.${opt.value}`, opt.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className={`w-40 h-9 text-xs ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={isDark ? "bg-[#0B1221] border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}>
              {SORT_OPTIONS.map(opt => {
                const label = opt.value === "newest" ? t("sort.newest", opt.label)
                  : opt.value === "oldest" ? t("sort.oldest", opt.label)
                  : opt.value === "a-z" ? t("sort.az", opt.label)
                  : opt.value === "z-a" ? t("sort.za", opt.label)
                  : opt.label;
                return (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    <span className="flex items-center gap-1.5"><opt.icon className="w-3 h-3" />{label}</span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tag filter strip (only shown when there are tags) */}
      <TagFilterStrip
        notes={notes}
        activeTag={activeTag}
        onSelectTag={(tag) => { onSelectTag(tag); haptic("tap"); }}
        isDark={isDark}
      />

      {/* Group-by toggle + select mode + count */}
      <div className={`flex items-center justify-between mb-2 gap-3 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
        <button
          type="button"
          onClick={onToggleGroup}
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-colors ${
            groupByCategory
              ? isDark ? "bg-white/10 text-white" : "bg-gray-200 text-gray-800"
              : isDark ? "text-slate-500 hover:text-slate-300" : "text-gray-400 hover:text-gray-700"
          }`}
          aria-pressed={groupByCategory}
          data-testid="group-toggle"
          title="Toggle category grouping"
        >
          <FolderTree className="w-3.5 h-3.5" /> {t("app.groupBy")}
        </button>
        {viewMode === "icon" && onGridColumnsChange && (
          <TilesColumnsButton
            isDark={isDark}
            gridColumns={gridColumns}
            onChange={onGridColumnsChange}
          />
        )}
        <button
          onClick={() => selectMode ? onClearSelection() : onEnterSelectMode()}
          className={`text-xs px-3 py-1.5 rounded-md border flex items-center gap-1.5 ${
            selectMode
              ? "bg-indigo-500 border-indigo-500 text-white"
              : isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
          data-testid="select-mode-toggle"
          title={selectMode ? "Cancel selection" : "Select multiple notes"}
        >
          <LayoutGrid className="w-3.5 h-3.5" /> {selectMode ? `Selected ${selectedCount}` : "Select"}
        </button>
        <div className="text-xs font-mono">{t("app.notes_count", { count: visibleCount })}</div>
      </div>
    </>
  );
}
