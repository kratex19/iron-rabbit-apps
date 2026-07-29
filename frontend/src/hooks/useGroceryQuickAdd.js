// useGroceryQuickAdd — small helper that returns a function to add a
// checklist item to the newest active Grocery note, or create a fresh
// "Shopping List" note when none exists.
//
// Used by BarcodeScannerModal (onCapture) and PantryModal (onSendToShoppingList).

import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import StorageService from "../storage/storageService";

const isGrocery = (n) =>
  !n.archived_at && !n.deleted_at &&
  (n.category === "Grocery" || (Array.isArray(n.tags) && n.tags.includes("grocery")));

/**
 * @param {{ notes: any[]; onSavedInline: (id, patch) => Promise<any>; onRefresh: () => void }} deps
 * @returns {(item: { text: string; barcode?: string; dept?: string; nutrition?: any; nutriscore?: any }) => Promise<void>}
 */
export function useGroceryQuickAdd({ notes, onSavedInline, onRefresh }) {
  return async function quickAdd(item) {
    const groceryNotes = (notes || [])
      .filter(isGrocery)
      .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));

    const newItem = {
      id: Math.random().toString(36).slice(2, 12),
      text: item.text,
      done: false,
      ...(item.barcode ? { barcode: item.barcode } : {}),
      ...(item.dept ? { dept: item.dept } : {}),
      ...(item.nutrition ? { nutrition: item.nutrition } : {}),
      ...(item.nutriscore ? { nutriscore: item.nutriscore } : {}),
    };

    if (groceryNotes.length > 0) {
      const target = groceryNotes[0];
      const nextList = [...(target.checklist || []), newItem];
      await onSavedInline(target.id, { checklist: nextList });
      toast.success(`"${item.text}" added to "${target.title}"`);
      return;
    }

    const now = new Date().toISOString();
    await StorageService.saveNote({
      id: uuidv4(),
      title: "Shopping List",
      content: "",
      category: "Grocery",
      tags: ["grocery"],
      color: "lime",
      checklist: [newItem],
      created_at: now,
      updated_at: now,
      order: Date.now(),
    });
    toast.success(`New Shopping List created with "${item.text}"`);
    if (typeof onRefresh === "function") onRefresh();
  };
}
