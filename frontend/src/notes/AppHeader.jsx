import React from "react";
import {
  Settings, Calculator, ExternalLink, Sun, Moon, Download, Zap, Package, Palette,
  CalendarDays, Globe, Archive, BarChart3, Baby, ShoppingCart, Receipt,
  Barcode, ChefHat, PackageOpen, Utensils, CloudSun,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { haptic } from "../utils/haptic";
import { SUPPORTED_LANGUAGES } from "../i18n";
import QuickGuideButton from "../quickguide/QuickGuideButton";
import DisplayControlsButton from "./DisplayControlsButton";
import { resolveBackgroundStyle } from "../utils/bgValue";
import ViewportWarning from "./ViewportWarning";

/**
 * Top app header — logo/title on the left, action-button strip on the right.
 * Extracted from NotesApp.jsx (previously inline). The Shopping Mode button
 * only renders when at least one active Grocery note exists so it stays
 * out of the way when unused.
 *
 * All handlers are received as props so this component stays pure/dumb.
 */
export default function AppHeader({
  isDark,
  settings,
  notes,
  hasActiveGrocery,
  onQuickAdd,
  onTilePacks,
  onExportPdf,
  onToggleTheme,
  onOpenThemeChooser,
  onCalculator,
  onCalendar,
  onLanguagePicker,
  onInsights,
  onKidMode,
  onShoppingMode,
  onMealPlanner,
  onPantry,
  onBarcode,
  onTripJournal,
  onRestaurantsGalore,
  onArchiveTrash,
  onSettings,
  onDashboard,
  uiBrightness,
  onBrightnessChange,
}) {
  const { t, i18n } = useTranslation();
  const languageCode = (i18n.language || "en").split("-")[0];
  const activeLang = SUPPORTED_LANGUAGES.find(l => l.code === languageCode);

  const iconBtnCls = "text-white/70 hover:text-white hover:bg-white/10 h-8 w-8";
  const tap = (fn) => () => { fn(); haptic("tap"); };

  return (
    <header
      className={`header-compact ${isDark ? "" : "light"}`}
      style={resolveBackgroundStyle(settings?.header_bg)}
    >
      {/* -----------------------------------------------------------
          Row 1 — Branding
          Title + URL on the left · Logo pinned to the top-right corner.
          Fluid: on small phones the logo shrinks; on desktops the
          title/URL block grows to fill available space between them.
         ----------------------------------------------------------- */}
      <div className="relative z-10 ir-header-inner flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1
            className="font-bold text-white tracking-tight truncate"
            style={{ fontSize: "var(--ir-text-2xl)" }}
          >
            {settings?.company_name || "Iron Rabbit"}
          </h1>
          {settings?.website_url && (
            <a
              href={settings.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-300 hover:text-white flex items-center gap-1 truncate"
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span className="truncate">{settings.website_url.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
        </div>
        <div className="shrink-0 flex items-start gap-2">
          {settings?.logo_url && (
            <a
              href={settings?.website_url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
              data-testid="header-logo"
            >
              <img
                src={settings.logo_url}
                alt="Logo"
                className="rounded-lg object-cover border border-white/20"
                style={{
                  width:  "clamp(2.5rem, 5vw, 3.5rem)",
                  height: "clamp(2.5rem, 5vw, 3.5rem)",
                }}
              />
            </a>
          )}
          {/* Viewport warning sentinel — only visible when a rendering
              mishap is detected (Chrome Desktop-site mode, extreme
              browser zoom, etc). Pulses red until dismissed. */}
          <ViewportWarning isDark={isDark} />
        </div>
      </div>

      {/* -----------------------------------------------------------
          Row 2 — Glass icon strip
          Full-width glass-effect bar containing every action icon.
          Wraps naturally when the row can't accommodate all icons
          (small phones → multiple rows; desktops → typically one).
         ----------------------------------------------------------- */}
      <div className="relative z-10 ir-header-inner">
        <div className="ir-header-glass-strip">
          <div
            className="flex items-center justify-start gap-1 flex-wrap"
            data-testid="header-icon-row"
          >
          {onBrightnessChange && (
            <DisplayControlsButton
              value={uiBrightness}
              onChange={onBrightnessChange}
              isDark={isDark}
              testidPrefix="home-brightness"
              className="text-white/70 hover:text-white hover:bg-white/10"
              title="Display brightness (Text & Background)"
            />
          )}
          <Button variant="ghost" size="icon" onClick={tap(onQuickAdd)} className={iconBtnCls} title={t("header.quick_add")} data-testid="header-quick-add"><Zap className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={tap(onTilePacks)} className={iconBtnCls} title={t("header.tile_packs")} data-testid="header-tile-packs"><Package className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onExportPdf} className={iconBtnCls} title={t("header.export_pdf")}><Download className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onToggleTheme} className={iconBtnCls} title={t("header.toggle_theme")}>
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          {onOpenThemeChooser && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenThemeChooser}
              className={iconBtnCls}
              title="Change theme"
              data-testid="header-change-theme"
            >
              <Palette className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onCalculator} className={iconBtnCls} title={t("header.calculator")}><Calculator className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={tap(onCalendar)} className={iconBtnCls} title={t("header.calendar")} data-testid="header-calendar"><CalendarDays className="w-4 h-4" /></Button>
          {onDashboard && (
            <Button
              variant="ghost"
              size="icon"
              onClick={tap(onDashboard)}
              className={iconBtnCls}
              title="Weather & Calendar Dashboard"
              data-testid="header-dashboard"
            >
              <CloudSun className="w-4 h-4" />
            </Button>
          )}
          <button
            type="button"
            onClick={tap(onLanguagePicker)}
            className="h-8 min-w-8 px-1.5 rounded-md inline-flex items-center gap-1 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title={`${t("settings.language")} — ${activeLang?.label || "English"}`}
            data-testid="header-language"
          >
            <Globe className="w-4 h-4" />
            <span className="text-base leading-none" aria-hidden="true">{activeLang?.flag || "🌐"}</span>
          </button>
          <Button variant="ghost" size="icon" onClick={tap(onInsights)} className={iconBtnCls} title="Insights" data-testid="header-insights"><BarChart3 className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={tap(onKidMode)} className={iconBtnCls} title="Kid Mode" data-testid="header-kid-mode"><Baby className="w-4 h-4" /></Button>
          {/* Shopping Mode — always visible so it can never "disappear"; the
              modal itself shows a friendly empty state when no active list. */}
          <Button
            variant="ghost"
            size="icon"
            onClick={tap(onShoppingMode)}
            className={`${iconBtnCls} ${hasActiveGrocery ? "" : "opacity-60"}`}
            title={hasActiveGrocery ? "Shopping Mode" : "Shopping Mode · No active grocery list"}
            data-testid="header-shopping-mode"
          >
            <ShoppingCart className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={tap(onMealPlanner)} className={iconBtnCls} title="Meal Planner" data-testid="header-meal-planner"><ChefHat className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={tap(onPantry)} className={iconBtnCls} title="Pantry Inventory" data-testid="header-pantry"><PackageOpen className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={tap(onBarcode)} className={iconBtnCls} title="Barcode Scanner" data-testid="header-barcode"><Barcode className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={tap(onTripJournal)} className={iconBtnCls} title="Trip Journal" data-testid="header-trip-journal"><Receipt className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={tap(onRestaurantsGalore)} className={iconBtnCls} title="Restaurants Galore" data-testid="header-restaurants-galore"><Utensils className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onArchiveTrash} className={iconBtnCls} title="Archive & Trash" data-testid="archive-trash-btn"><Archive className="w-4 h-4" /></Button>
          <QuickGuideButton resourceId="IRR-1000" origin="home" isDark={isDark} className={iconBtnCls} />
          <Button variant="ghost" size="icon" onClick={onSettings} className={iconBtnCls} title={t("header.settings")} data-testid="settings-btn"><Settings className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>
    </header>
  );
}
