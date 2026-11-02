import React, { useMemo, useRef, useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Plus, X, FolderTree, Folder } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import StorageService from "../storage/storageService";

/**
 * CategoryPathAccordion - Nested Accordion Hierarchy for Categories
 * 
 * Implements M/SC architecture:
 * - M (Main Category): One per note, named after note title
 * - SC (Subcategory): Unlimited depth, each independently expandable
 * 
 * Data Model:
 * - Global category_tree in settings (all categories across all notes)
 * - Note's category_path array indicates location in tree
 * - Green plus button adds child to selected parent
 */
export default function CategoryPathAccordion({
  path,
  onChange,
  categories = {},
  existingPaths = [],
  isDark,
  noteTitle = "",
}) {
  const [open, setOpen] = useState(false);
  const [categoryTree, setCategoryTree] = useState({});
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedParentPath, setSelectedParentPath] = useState([]);
  
  const segments = Array.isArray(path) ? path : [];
  const mainCategory = segments[0] || null;

  // Load category tree from storage when popover opens
  useEffect(() => {
    if (!open) return;
    
    const loadTree = async () => {
      try {
        const tree = await StorageService.getCategoryTree();
        setCategoryTree(tree);
        
        // Auto-expand categories in current path
        if (segments.length > 0) {
          const toExpand = new Set();
          let pathSoFar = [];
          segments.forEach((seg, i) => {
            if (i < segments.length - 1) { // Don't expand the last one
              pathSoFar.push(seg);
              toExpand.add(pathSoFar.join("/"));
            }
          });
          setExpandedCategories(toExpand);
        }
      } catch (err) {
        console.error("Failed to load category tree:", err);
      }
    };
    
    loadTree();
  }, [open, segments]);

  // Toggle category expansion
  const toggleExpand = (categoryPath) => {
    const key = categoryPath.join("/");
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Check if category is expanded
  const isExpanded = (categoryPath) => {
    return expandedCategories.has(categoryPath.join("/"));
  };

  // Add Main Category (M) using note title
  const addMainCategory = async () => {
    if (!noteTitle || !noteTitle.trim()) {
      alert("Note must have a title to create a Main Category");
      return;
    }
    
    try {
      await StorageService.addCategoryToTree(null, noteTitle.trim());
      const updatedTree = await StorageService.getCategoryTree();
      setCategoryTree(updatedTree);
      onChange([noteTitle.trim()]);
      setExpandedCategories(new Set([noteTitle.trim()]));
    } catch (err) {
      console.error("Failed to add main category:", err);
    }
  };

  // Add subcategory under selected parent
  const addSubcategory = async (parentPath) => {
    setSelectedParentPath(parentPath);
    setEditingCategory({ type: 'new', parentPath });
    setNewCategoryName("");
  };

  // Save new subcategory
  const saveNewSubcategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      await StorageService.addCategoryToTree(
        selectedParentPath.length > 0 ? selectedParentPath : null,
        newCategoryName.trim()
      );
      const updatedTree = await StorageService.getCategoryTree();
      setCategoryTree(updatedTree);
      
      // Expand parent to show new child
      if (selectedParentPath.length > 0) {
        const parentKey = selectedParentPath.join("/");
        setExpandedCategories(prev => new Set(prev).add(parentKey));
      }
      
      setEditingCategory(null);
      setNewCategoryName("");
    } catch (err) {
      console.error("Failed to add subcategory:", err);
    }
  };

  // Cancel adding new subcategory
  const cancelNewSubcategory = () => {
    setEditingCategory(null);
    setNewCategoryName("");
  };

  // Select a category (set as note's category_path)
  const selectCategory = (categoryPath) => {
    onChange(categoryPath);
  };

  // Remove a category from the path (move note up one level)
  const removeLevel = (depth) => {
    const newPath = segments.slice(0, depth);
    onChange(newPath);
  };

  // Render a category item with its children
  const renderCategory = (categoryName, categoryData, parentPath, depth) => {
    const currentPath = [...parentPath, categoryName];
    const pathKey = currentPath.join("/");
    const isCurrentPath = JSON.stringify(currentPath) === JSON.stringify(segments);
    const hasChildren = categoryData.children && Object.keys(categoryData.children).length > 0;
    const expanded = isExpanded(currentPath);
    
    // Visual indentation (compact: 16px per level)
    const indentStyle = { paddingLeft: `${depth * 16}px` };
    
    return (
      <div key={pathKey} className="category-item">
        {/* Category Row */}
        <div
          style={indentStyle}
          className={`flex items-center gap-2 py-1.5 px-2 rounded transition-colors ${
            isCurrentPath
              ? isDark
                ? "bg-blue-500/20 border border-blue-500/50"
                : "bg-blue-50 border border-blue-300"
              : isDark
              ? "hover:bg-white/5"
              : "hover:bg-gray-50"
          }`}
        >
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <button
              type="button"
              onClick={() => toggleExpand(currentPath)}
              className={`p-0.5 shrink-0 ${
                isDark ? "text-slate-400 hover:text-white" : "text-gray-400 hover:text-gray-700"
              }`}
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          
          {!hasChildren && <span className="w-4 shrink-0" />}
          
          {/* Category Icon */}
          <Folder
            className={`w-3.5 h-3.5 shrink-0 ${
              depth === 0
                ? isDark ? "text-blue-300" : "text-blue-500"
                : isDark ? "text-slate-400" : "text-gray-500"
            }`}
          />
          
          {/* Designation (M or SC) */}
          <span
            className={`text-[9px] font-bold uppercase shrink-0 px-1 py-0.5 rounded ${
              depth === 0
                ? isDark
                  ? "bg-blue-500/30 text-blue-200"
                  : "bg-blue-100 text-blue-700"
                : isDark
                ? "bg-slate-700 text-slate-300"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {depth === 0 ? "M" : "SC"}
          </span>
          
          {/* Category Name (clickable to select) */}
          <button
            type="button"
            onClick={() => selectCategory(currentPath)}
            className={`flex-1 text-left text-xs ${
              isCurrentPath
                ? isDark ? "text-blue-200 font-medium" : "text-blue-700 font-medium"
                : isDark ? "text-slate-200" : "text-gray-700"
            }`}
          >
            {categoryName}
          </button>
          
          {/* Green Plus Button - Add Child */}
          <button
            type="button"
            onClick={() => addSubcategory(currentPath)}
            className={`p-1 rounded transition-colors shrink-0 ${
              isDark
                ? "text-green-400 hover:text-green-300 hover:bg-green-500/10"
                : "text-green-600 hover:text-green-700 hover:bg-green-50"
            }`}
            aria-label={`Add subcategory under ${categoryName}`}
            title="Add child category"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          
          {/* Remove Button (only for non-main categories in current path) */}
          {depth > 0 && isCurrentPath && (
            <button
              type="button"
              onClick={() => removeLevel(depth)}
              className={`p-1 rounded transition-colors shrink-0 ${
                isDark
                  ? "text-slate-400 hover:text-white hover:bg-white/10"
                  : "text-gray-400 hover:text-gray-800 hover:bg-black/5"
              }`}
              aria-label="Remove from path"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        {/* New Category Input (if adding child to this category) */}
        {editingCategory?.type === 'new' && 
         editingCategory.parentPath.join("/") === currentPath.join("/") && (
          <div
            style={{ paddingLeft: `${(depth + 1) * 16}px` }}
            className="flex items-center gap-2 py-1.5 px-2 mt-1"
          >
            <span className="w-4 shrink-0" />
            <Folder className="w-3.5 h-3.5 shrink-0 text-green-500" />
            <span className="text-[9px] font-bold uppercase shrink-0 px-1 py-0.5 rounded bg-green-100 text-green-700">
              SC
            </span>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveNewSubcategory();
                if (e.key === 'Escape') cancelNewSubcategory();
              }}
              placeholder="New category name..."
              autoFocus
              className={`flex-1 text-xs px-2 py-1 rounded border ${
                isDark
                  ? "bg-slate-800 border-slate-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
            <button
              type="button"
              onClick={saveNewSubcategory}
              className="text-green-600 hover:text-green-700 text-xs font-medium px-2"
            >
              Save
            </button>
            <button
              type="button"
              onClick={cancelNewSubcategory}
              className="text-gray-500 hover:text-gray-700 text-xs px-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        
        {/* Render Children (if expanded) */}
        {expanded && hasChildren && (
          <div className="category-children">
            {Object.entries(categoryData.children)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([childName, childData]) =>
                renderCategory(childName, childData, currentPath, depth + 1)
              )}
          </div>
        )}
      </div>
    );
  };

  // Render the tree starting from Main Category
  const renderTree = () => {
    if (!mainCategory) {
      // No Main Category yet
      return (
        <div className="p-4 text-center">
          <p className={`text-xs mb-3 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            No category hierarchy yet.
          </p>
          <button
            type="button"
            onClick={addMainCategory}
            disabled={!noteTitle || !noteTitle.trim()}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
              !noteTitle || !noteTitle.trim()
                ? "opacity-50 cursor-not-allowed"
                : isDark
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
          {(!noteTitle || !noteTitle.trim()) && (
            <p className={`text-[10px] mt-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
              Note must have a title first
            </p>
          )}
        </div>
      );
    }
    
    // Main Category exists - render tree
    const mainCategoryData = categoryTree[mainCategory];
    if (!mainCategoryData) {
      // Main category not found in tree (data inconsistency)
      return (
        <div className="p-4 text-center text-xs text-red-500">
          Error: Main category "{mainCategory}" not found in tree.
        </div>
      );
    }
    
    return (
      <div className="p-2 space-y-1">
        {renderCategory(mainCategory, mainCategoryData, [], 0)}
        
        {/* Add root-level SC (sibling to M) button - only if in Main Category */}
        {segments.length === 1 && editingCategory?.type !== 'new' && (
          <div className="mt-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => addSubcategory([])}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded text-xs font-medium transition-colors ${
                isDark
                  ? "bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-green-50 hover:bg-green-100 text-green-700 border border-green-200"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Root Category
            </button>
          </div>
        )}
      </div>
    );
  };

  const preview = segments.filter(Boolean).join("  ›  ");
  const hasPath = segments.length > 0 && preview.length > 0;

  const triggerClasses = `w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
    isDark
      ? "bg-white/[0.04] border-white/10 hover:bg-white/[0.06]"
      : "bg-white/70 border-gray-200 hover:bg-black/[0.02]"
  } rounded-lg border`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          className={triggerClasses}
          data-testid="category-path-toggle"
        >
          <FolderTree
            className={`w-4 h-4 shrink-0 ${isDark ? "text-blue-300" : "text-blue-500"}`}
          />
          <span
            className={`text-[11px] font-medium shrink-0 ${
              isDark ? "text-blue-200" : "text-blue-700"
            }`}
          >
            Category path
          </span>
          <div className="flex-1 min-w-0">
            <div
              className={`text-[10px] truncate ${
                hasPath
                  ? isDark ? "text-slate-300" : "text-gray-700"
                  : isDark ? "text-slate-500 italic" : "text-gray-400 italic"
              }`}
              data-testid="category-path-preview"
            >
              {hasPath ? preview : "No category"}
            </div>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 transition-transform ${
              open ? "rotate-180" : ""
            } ${isDark ? "text-slate-400" : "text-gray-400"}`}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={`w-[400px] p-0 ${
          isDark
            ? "bg-slate-900 border-slate-700 text-white"
            : "bg-white border-gray-200 text-gray-900"
        }`}
        align="start"
        side="bottom"
        sideOffset={4}
      >
        {/* Panel Header */}
        <div
          className={`px-3 py-2 text-[11px] uppercase tracking-wider flex items-center gap-1.5 border-b ${
            isDark
              ? "text-blue-300 bg-blue-500/10 border-blue-500/30"
              : "text-blue-700 bg-blue-50 border-blue-200"
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          Category Hierarchy
        </div>

        {/* Tree Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {renderTree()}
        </div>

        {/* Footer */}
        <div
          className={`px-3 py-1.5 text-[10px] border-t ${
            isDark
              ? "border-blue-500/20 text-slate-500 bg-blue-500/5"
              : "border-blue-100 text-gray-400 bg-blue-50/50"
          }`}
        >
          <span className="font-medium text-green-600">Green +</span> adds child category
        </div>
      </PopoverContent>
    </Popover>
  );
}
