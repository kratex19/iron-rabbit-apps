// Restaurants Galore — shared UI helpers for workspace modals.
import React from "react";

export const Field = ({ label, children, isDark }) => (
  <div>
    <label className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>{label}</label>
    <div className="mt-1">{children}</div>
  </div>
);

export const inputCls = (isDark) => `h-9 ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500" : ""}`;
export const cardCls  = (isDark) => `rounded-xl border p-3 ${isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-200 shadow-sm"}`;
export const selectCls = (isDark) => `h-9 w-full rounded-md border px-2 text-sm ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`;

export function RestaurantPicker({ restaurants, value, onChange, isDark, testid = "rest-picker" }) {
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className={`h-9 rounded-md border px-2 text-sm ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}
      data-testid={testid}
    >
      <option value="">All restaurants</option>
      {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
    </select>
  );
}
