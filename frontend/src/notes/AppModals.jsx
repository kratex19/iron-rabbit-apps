import React from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

import NoteModal from "./NoteModal";
import CalculatorWidget from "./CalculatorWidget";
import ShareModal from "./ShareModal";
import SettingsModal from "./SettingsModal";
import FullScreenNote from "./FullScreenNote";
import IconPicker from "../components/IconPicker";
import TilePacksModal from "./TilePacksModal";
import FloatingCalendarModal from "./FloatingCalendarModal";
import FirstRunTour from "./FirstRunTour";
import InsightsModal from "./InsightsModal";
import KidDashboardModal from "./KidDashboardModal";
import ShoppingModeModal from "./ShoppingModeModal";
import TripJournalModal from "./TripJournalModal";
import BarcodeScannerModal from "./BarcodeScannerModal";
import MealPlannerModal from "./MealPlannerModal";
import PantryModal from "./PantryModal";
import LanguagePicker from "./LanguagePicker";
import SecurityModal from "./SecurityModal";
import LockScreen from "../security/LockScreen";
import OrganizationModal from "./OrganizationModal";
import MoveToCategoryModal from "./MoveToCategoryModal";
import CopySuffixDialog from "./CopySuffixDialog";
import MultiSelectBar from "./MultiSelectBar";
import BatchStudioSheet from "./BatchStudioSheet";
import DeleteChoiceDialog from "./DeleteChoiceDialog";
import RecentActionPill from "./RecentActionPill";
import ArchiveTrashModal from "./ArchiveTrashModal";
import QuickAccessModal from "./QuickAccessModal";
import BackupRestoreModal from "./BackupRestoreModal";

import StorageService from "../storage/storageService";
import { useGroceryQuickAdd } from "../hooks/useGroceryQuickAdd";

/**
 * AppModals — a single mount point for every modal / dialog / sheet /
 * floating pill in Iron Rabbit. Kept dumb: all state and handlers come
 * in as props from NotesApp. This file exists purely to keep NotesApp.jsx
 * readable — the JSX below was ~440 inlined lines before extraction.
 */
export default function AppModals(p) {
  // Compose the shared "add-to-newest-grocery-note" helper used by
  // Barcode + Pantry. Keeps both onCapture handlers to a single line each.
  const quickAddGrocery = useGroceryQuickAdd({
    notes: p.notes,
    onSavedInline: p.handleSaveInline,
    onRefresh: p.fetchData,
  });

  return (
    <>
      <NoteModal
        isOpen={p.noteModalOpen}
        onClose={() => { p.setNoteModalOpen(false); p.setEditingNote(null); }}
        note={p.editingNote}
        onSave={p.handleSaveNote}
        onOpenCalculator={p.openCalculatorWithCallback}
        isDark={p.isDark}
        categories={p.categories}
        templates={p.templates}
        allTags={p.allTags}
      />
      <CalculatorWidget
        isOpen={p.calculatorOpen}
        onClose={() => { p.setCalculatorOpen(false); p.setCalculatorCallback(null); }}
        onInsertResult={p.calculatorCallback}
        isDark={p.isDark}
      />
      <ShareModal
        isOpen={p.shareModalOpen}
        onClose={() => { p.setShareModalOpen(false); p.setSharingNote(null); }}
        note={p.sharingNote}
        isDark={p.isDark}
      />
      <SettingsModal
        isOpen={p.settingsModalOpen}
        onClose={() => p.setSettingsModalOpen(false)}
        settings={p.settings}
        onSave={p.handleSaveSettings}
        onBackup={p.handleBackup}
        onRestore={p.handleRestore}
        onClearData={p.handleClearAllData}
        onInstallPWA={p.handleInstallPWA}
        canInstallPWA={p.canInstallPWA}
        storageInfo={p.storageInfo}
        onRestoreFromServer={p.handleRestoreFromServer}
        onOpenSecurity={() => p.setSecurityOpen(true)}
        onOpenOrganization={() => p.setOrganizationOpen(true)}
        onOpenQuickAccess={() => { p.setSettingsModalOpen(false); p.setQuickAccessOpen(true); }}
        onOpenBackup={() => { p.setSettingsModalOpen(false); p.setBackupOpen(true); }}
        onSyncPackColors={p.handleSyncPackColors}
        isDark={p.isDark}
      />
      <FullScreenNote
        note={p.fullScreenNote}
        isOpen={!!p.fullScreenNote}
        onClose={() => p.setFullScreenNote(null)}
        onSaveInline={p.handleSaveInline}
        onDelete={p.handleDeleteNote}
        onShare={p.openShareModal}
        isDark={p.isDark}
      />
      <IconPicker
        isOpen={p.quickAddOpen}
        onClose={() => p.setQuickAddOpen(false)}
        mode="quick-add"
        onQuickAdd={p.handleQuickAdd}
        onSelect={() => {}}
        isDark={p.isDark}
      />
      <TilePacksModal
        isOpen={p.tilePacksOpen}
        onClose={() => p.setTilePacksOpen(false)}
        onApply={p.handleApplyPack}
        isDark={p.isDark}
      />
      <FloatingCalendarModal
        isOpen={p.floatingCalendarOpen}
        onClose={() => p.setFloatingCalendarOpen(false)}
        notes={p.notes}
        onOpenNote={(noteId) => {
          const n = p.notes.find((x) => x.id === noteId);
          if (n) p.setFullScreenNote(n);
        }}
        onCreateEvent={async ({ title, datetime, alarm_enabled }) => {
          try {
            const now = new Date().toISOString();
            const maxOrder = p.notes.reduce((max, n) => Math.max(max, n.order || 0), 0);
            const newNote = {
              id: uuidv4(),
              title,
              content: "",
              color: "purple",
              category: "Calendar",
              order: maxOrder + 1,
              events: [{
                id: uuidv4(),
                title,
                datetime,
                alarm_enabled: !!alarm_enabled,
                notes: "",
              }],
              created_at: now,
              updated_at: now,
              last_viewed: now,
            };
            await StorageService.saveNote(newNote);
            toast.success(`Event added for ${new Date(datetime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`);
            p.fetchData();
          } catch (e) {
            toast.error("Could not create event");
          }
        }}
        isDark={p.isDark}
      />
      <FirstRunTour open={p.tourOpen} onDismiss={p.handleTourDismiss} isDark={p.isDark} />

      <InsightsModal
        isOpen={p.insightsOpen}
        onClose={() => p.setInsightsOpen(false)}
        notes={p.notes}
        isDark={p.isDark}
        onOpenTripJournal={() => p.setTripJournalOpen(true)}
      />
      <KidDashboardModal
        isOpen={p.kidModeOpen}
        onClose={() => p.setKidModeOpen(false)}
        notes={p.notes}
        onSaveNote={p.handleSaveInline}
        isDark={p.isDark}
      />
      <ShoppingModeModal
        isOpen={p.shoppingModeOpen}
        onClose={() => p.setShoppingModeOpen(false)}
        notes={p.notes}
        onSaveNote={p.handleSaveInline}
        isDark={p.isDark}
      />
      <TripJournalModal
        isOpen={p.tripJournalOpen}
        onClose={() => p.setTripJournalOpen(false)}
        isDark={p.isDark}
      />
      <BarcodeScannerModal
        isOpen={p.barcodeOpen}
        onClose={() => p.setBarcodeOpen(false)}
        isDark={p.isDark}
        onCapture={(captured) => quickAddGrocery({
          text: captured.name,
          barcode: captured.code,
          nutrition: captured.nutrition,
          nutriscore: captured.nutriscore,
        })}
      />
      <MealPlannerModal
        isOpen={p.mealPlannerOpen}
        onClose={() => p.setMealPlannerOpen(false)}
        isDark={p.isDark}
        onGeneratedGroceryNote={() => p.fetchData()}
      />
      <PantryModal
        isOpen={p.pantryOpen}
        onClose={() => p.setPantryOpen(false)}
        isDark={p.isDark}
        onSendToShoppingList={(pantryItem) => quickAddGrocery({
          text: pantryItem.name,
          dept: pantryItem.dept,
        })}
      />

      <LanguagePicker
        isOpen={p.languagePickerOpen}
        onClose={() => p.setLanguagePickerOpen(false)}
        isDark={p.isDark}
      />
      <SecurityModal
        isOpen={p.securityOpen}
        onClose={() => { p.setSecurityOpen(false); p.autoLock.refresh(); }}
        categories={p.categories}
        isDark={p.isDark}
      />

      {/* App-lock overlay — rendered above everything when app is locked */}
      <LockScreen
        isOpen={p.autoLock.locked}
        onUnlock={p.autoLock.unlock}
        isDark={p.isDark}
      />

      <OrganizationModal
        isOpen={p.organizationOpen}
        onClose={() => p.setOrganizationOpen(false)}
        isDark={p.isDark}
      />

      <MoveToCategoryModal
        isOpen={p.moveToOpen}
        onClose={() => p.setMoveToOpen(false)}
        categories={p.grouped.map(([n]) => n)}
        count={p.selectedIds.size}
        onMove={p.bulkMoveTo}
        mode={p.settings?.dnd_prefs?.smartBatchMode || "move"}
        isDark={p.isDark}
      />

      <CopySuffixDialog
        isOpen={p.pendingCopyTarget !== null}
        onClose={() => p.setPendingCopyTarget(null)}
        count={p.selectedIds.size}
        targetCategory={p.pendingCopyTarget || ""}
        onConfirm={async (addSuffix) => {
          const target = p.pendingCopyTarget;
          p.setPendingCopyTarget(null);
          await p.bulkCopyTo(target, addSuffix);
        }}
        isDark={p.isDark}
      />

      <MultiSelectBar
        count={p.selectedIds.size}
        onClear={p.clearSelection}
        onOpenStudio={() => p.setBatchStudioOpen(true)}
        isDark={p.isDark}
      />

      <BatchStudioSheet
        isOpen={p.batchStudioOpen}
        onClose={() => p.setBatchStudioOpen(false)}
        count={p.selectedIds.size}
        mode={p.settings?.dnd_prefs?.smartBatchMode || "move"}
        onMoveTo={() => p.setMoveToOpen(true)}
        onDuplicate={p.bulkDuplicateInPlace}
        onTogglePin={p.bulkTogglePin}
        onSetColor={p.bulkSetColor}
        onSetAlarm={p.bulkSetAlarm}
        onClearAlarm={p.bulkClearAlarm}
        onExportPDF={p.bulkExportPDF}
        onDelete={() => p.setDeleteChoice({ ids: Array.from(p.selectedIds), fromBulk: true })}
        isDark={p.isDark}
      />

      {/* Delete choice — Archive vs Trash. Used by single delete AND bulk. */}
      <DeleteChoiceDialog
        isOpen={p.deleteChoice !== null}
        onClose={() => p.setDeleteChoice(null)}
        count={p.deleteChoice?.ids?.length || 0}
        retentionLabel={(() => {
          const d = p.settings?.trash_retention_days ?? 7;
          if (!d) return "Forever";
          if (d === 365) return "1 year";
          return `${d} days`;
        })()}
        onArchive={async () => {
          const ids = p.deleteChoice?.ids || [];
          const fromBulk = p.deleteChoice?.fromBulk;
          p.setDeleteChoice(null);
          await p.performArchive(ids);
          if (fromBulk) p.clearSelection();
        }}
        onTrash={async () => {
          const ids = p.deleteChoice?.ids || [];
          const fromBulk = p.deleteChoice?.fromBulk;
          p.setDeleteChoice(null);
          await p.performTrash(ids);
          if (fromBulk) p.clearSelection();
        }}
        isDark={p.isDark}
      />

      {/* Persistent floating Undo pill — stays until user acts on it */}
      <RecentActionPill
        action={p.recentAction}
        onUndo={p.undoRecentAction}
        onDismiss={() => p.setRecentAction(null)}
        isDark={p.isDark}
      />

      {/* Archive & Trash view */}
      <ArchiveTrashModal
        isOpen={p.archiveTrashOpen}
        onClose={() => p.setArchiveTrashOpen(false)}
        onDataChanged={p.fetchData}
        settings={p.settings}
        isDark={p.isDark}
      />

      {/* Quick Access — First-launch wizard + reopenable from Settings */}
      <QuickAccessModal
        isOpen={p.quickAccessOpen}
        onClose={p.handleCloseQuickAccess}
        canInstallPWA={p.canInstallPWA}
        onInstallPWA={p.handleInstallPWA}
        isDark={p.isDark}
      />

      {/* Offline JSON Backup & Restore */}
      <BackupRestoreModal
        isOpen={p.backupOpen}
        onClose={() => p.setBackupOpen(false)}
        onDataChanged={p.fetchData}
        isDark={p.isDark}
      />

      {/* Two-step "Clear All Data" confirmation */}
      <Dialog open={p.clearStep === 1} onOpenChange={(o) => !o && p.setClearStep(0)}>
        <DialogContent
          className={`max-w-sm ${p.isDark ? "bg-[#0B1221] border-white/10" : "bg-white border-gray-200"}`}
          data-testid="clear-confirm-step-1"
        >
          <DialogHeader>
            <DialogTitle className={p.isDark ? "text-white" : "text-gray-900"}>
              Are you sure you want to delete all data?
            </DialogTitle>
            <DialogDescription className={p.isDark ? "text-slate-400" : "text-gray-500"}>
              This will clear every note, template, category and setting stored on this device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => p.setClearStep(0)}
              className={`flex-1 sm:flex-none ${p.isDark ? "border-white/10 text-slate-300" : ""}`}
              data-testid="clear-step-1-no"
            >
              No
            </Button>
            <Button
              onClick={() => p.setClearStep(2)}
              className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white"
              data-testid="clear-step-1-yes"
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={p.clearStep === 2} onOpenChange={(o) => !o && p.setClearStep(0)}>
        <DialogContent
          className={`max-w-sm ${p.isDark ? "bg-[#0B1221] border-red-500/40" : "bg-white border-red-300"}`}
          data-testid="clear-confirm-step-2"
        >
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2">
              Are you absolutely positive?
            </DialogTitle>
            <DialogDescription className={p.isDark ? "text-slate-300" : "text-gray-600"}>
              In doing so you will lose <strong>any and all</strong> data — notes, files, images and videos.
              This cannot be undone.
              <br /><br />
              Do you wish to proceed with data wipe?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => p.setClearStep(0)}
              className={`flex-1 sm:flex-none ${p.isDark ? "border-white/10 text-slate-300" : ""}`}
              data-testid="clear-step-2-no"
            >
              No, take me back
            </Button>
            <Button
              onClick={p.performClearAllData}
              className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white"
              data-testid="clear-step-2-yes"
            >
              Yes, wipe everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
